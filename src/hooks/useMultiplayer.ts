import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameSession, SessionPlayer, Player } from '@/types/game';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  [key: string]: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    name: string;
    isDead: boolean;
    hasWon: boolean;
  }[];
}

export function useMultiplayer(userId: string | undefined, displayName: string) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [remotePlayers, setRemotePlayers] = useState<Player[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceRef = useRef<RealtimeChannel | null>(null);
  const presenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create a new game session
  const createSession = useCallback(async (levelId: string, isPublic: boolean = true) => {
    if (!userId) return null;

    // Generate room code for private games
    const { data: codeData } = await supabase.rpc('generate_room_code');
    const roomCode = isPublic ? null : codeData;

    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        level_id: levelId,
        host_id: userId,
        is_public: isPublic,
        room_code: roomCode,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) throw error;
    
    setSession(data as GameSession);
    await joinSession(data.id);
    
    return data as GameSession;
  }, [userId]);

  // Join an existing session
  const joinSession = useCallback(async (sessionId: string, playerColor?: string) => {
    if (!userId) {
      console.error('joinSession: No userId');
      return;
    }

    console.log('joinSession called:', { sessionId, userId, playerColor });

    // Load session first
    const { data: sessionData, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      console.error('joinSession: Session not found', sessionError);
      throw new Error('Session not found');
    }
    console.log('Loaded session:', sessionData);
    setSession(sessionData as GameSession);

    // Try to add player, but if they already exist, that's okay
    // Check if player already exists first
    const { data: existingPlayerCheck, error: checkError } = await supabase
      .from('session_players')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    let insertedPlayer = existingPlayerCheck;

    if (!existingPlayerCheck) {
      // Player doesn't exist, insert them
      const { data: newPlayer, error: insertError } = await supabase
        .from('session_players')
        .insert({
          session_id: sessionId,
          user_id: userId,
          player_name: displayName,
          color: playerColor || '#26c6da',
          is_ready: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error('joinSession: Failed to add player', insertError);
        throw insertError;
      }
      insertedPlayer = newPlayer;
      console.log('Added player to session:', newPlayer);
    } else {
      console.log('Player already in session, skipping insert');
    }

    // Load existing players
    const { data: existingPlayers, error: playersError } = await supabase
      .from('session_players')
      .select('*')
      .eq('session_id', sessionId);

    if (playersError) {
      console.error('Failed to load existing players', playersError);
    } else {
      console.log('Loaded existing players:', existingPlayers);
      if (existingPlayers) {
        setPlayers(existingPlayers as SessionPlayer[]);
      }
    }

    // Subscribe to real-time player updates
    console.log('Setting up channel subscription for session:', sessionId);
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_players',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Player update:', payload.eventType, payload);
          if (payload.eventType === 'INSERT') {
            setPlayers(prev => [...prev, payload.new as SessionPlayer]);
          } else if (payload.eventType === 'UPDATE') {
            setPlayers(prev => 
              prev.map(p => p.id === payload.new.id ? payload.new as SessionPlayer : p)
            );
          } else if (payload.eventType === 'DELETE') {
            setPlayers(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Session update:', payload);
          setSession(payload.new as GameSession);
        }
      )
      .subscribe((status) => {
        console.log('Session channel subscribed:', status);
      });

    channelRef.current = channel;

    // Subscribe to presence for real-time position updates
    presenceRef.current = supabase.channel(`presence:${sessionId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });
    
    presenceRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = presenceRef.current?.presenceState() as PresenceState;
        console.log('Presence sync state:', state);
        if (!state) return;

        const otherPlayers: Player[] = [];
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== userId && presences[0]) {
            const p = presences[0];
            console.log('Found player:', key, p);
            otherPlayers.push({
              id: key,
              x: p.x,
              y: p.y,
              vx: p.vx,
              vy: p.vy,
              color: p.color,
              name: p.name,
              isGrounded: false,
              isDead: p.isDead,
              hasWon: p.hasWon,
              isLocal: false,
            });
          }
        });
        setRemotePlayers(otherPlayers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Player joined presence:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Player left presence:', key);
      })
      .subscribe((status) => {
        console.log('Presence channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Presence subscribed - connected!');
          setIsConnected(true);
        }
      });

    // Set connected immediately - presence works in background
    // This ensures game starts even if presence has issues
    setIsConnected(true);
  }, [userId, displayName]);

  // Join by room code
  const joinByCode = useCallback(async (code: string, playerColor?: string) => {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('room_code', code.toUpperCase())
      .eq('status', 'waiting')
      .single();

    if (error) throw new Error('Room not found or game already started');
    
    await joinSession(data.id, playerColor);
    return data as GameSession;
  }, [joinSession]);

  // Find public sessions
  const findPublicSessions = useCallback(async (levelId?: string) => {
    let query = supabase
      .from('game_sessions')
      .select('*, session_players(count)')
      .eq('is_public', true)
      .eq('status', 'waiting');

    if (levelId) {
      query = query.eq('level_id', levelId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data as (GameSession & { session_players: { count: number }[] })[];
  }, []);

  // Update player position (for presence)
  const updatePosition = useCallback((player: Player) => {
    if (!presenceRef.current || !userId) return;

    try {
      presenceRef.current.track({
        x: player.x,
        y: player.y,
        vx: player.vx,
        vy: player.vy,
        color: player.color,
        name: displayName,
        isDead: player.isDead,
        hasWon: player.hasWon,
      }).catch(err => console.error('Track error:', err));
    } catch (error) {
      console.error('Update position error:', error);
    }
  }, [userId, displayName]);

  // Set ready status
  const setReady = useCallback(async (ready: boolean) => {
    if (!userId || !session) return;

    await supabase
      .from('session_players')
      .update({ is_ready: ready })
      .eq('session_id', session.id)
      .eq('user_id', userId);
  }, [userId, session]);

  // Start the game (host only)
  const startGame = useCallback(async () => {
    if (!session) {
      console.error('startGame: No session');
      return;
    }

    console.log('startGame: Updating session status to playing', session.id);
    const { error } = await supabase
      .from('game_sessions')
      .update({ status: 'playing', started_at: new Date().toISOString() })
      .eq('id', session.id);

    if (error) {
      console.error('startGame error:', error);
    } else {
      console.log('startGame: Successfully updated to playing');
    }
  }, [session]);

  // Record finish
  const recordFinish = useCallback(async (timeSeconds: number, deaths: number) => {
    if (!userId || !session) return;

    await supabase
      .from('session_players')
      .update({
        has_finished: true,
        finish_time: timeSeconds,
        deaths,
      })
      .eq('session_id', session.id)
      .eq('user_id', userId);
  }, [userId, session]);

  // Leave session
  const leaveSession = useCallback(async () => {
    if (!userId || !session) return;

    // Clear presence timeout
    if (presenceTimeoutRef.current) {
      clearTimeout(presenceTimeoutRef.current);
      presenceTimeoutRef.current = null;
    }

    await supabase
      .from('session_players')
      .delete()
      .eq('session_id', session.id)
      .eq('user_id', userId);

    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    if (presenceRef.current) {
      await presenceRef.current.unsubscribe();
      presenceRef.current = null;
    }

    setSession(null);
    setPlayers([]);
    setRemotePlayers([]);
    setIsConnected(false);
  }, [userId, session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (presenceTimeoutRef.current) {
        clearTimeout(presenceTimeoutRef.current);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (presenceRef.current) {
        presenceRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    session,
    players,
    remotePlayers,
    isConnected,
    createSession,
    joinSession,
    joinByCode,
    findPublicSessions,
    updatePosition,
    setReady,
    startGame,
    recordFinish,
    leaveSession,
  };
}
