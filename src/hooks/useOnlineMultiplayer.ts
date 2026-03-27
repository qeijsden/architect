import { useState, useEffect, useCallback, useRef } from 'react';
import { GameRoom, RoomPlayer } from '@/integrations/playfab/client';
import { Player } from '@/types/game';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  createLobby,
  joinLobby,
  findLobbyByCode,
  getLobby,
  getPublicLobbies,
  setPlayerReady,
  startGame as startSupabaseLobby,
  leaveLobby,
  updatePlayerPosition,
  subscribeLobbyChanges,
  unsubscribeLobbyChanges,
  LobbyWithPlayers,
  SupabaseLobbyPlayer,
} from '@/integrations/supabase/lobbies';

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Convert Supabase lobby to GameRoom format for compatibility
function toGameRoom(lobby: LobbyWithPlayers): GameRoom {
  return {
    RoomId: lobby.id,
    HostId: lobby.host_id,
    HostName: lobby.host_name,
    LevelId: lobby.level_id,
    IsPublic: lobby.is_public,
    MaxPlayers: lobby.max_players,
    CurrentPlayers: lobby.current_players,
    Status: lobby.status,
    CreatedAt: lobby.created_at,
    GameCode: lobby.room_code || undefined,
  };
}

// Convert Supabase player to RoomPlayer format
function toRoomPlayer(player: SupabaseLobbyPlayer, hostId: string): RoomPlayer {
  return {
    PlayerId: player.user_id,
    DisplayName: player.player_name,
    Color: player.color,
    IsReady: player.is_ready,
    IsHost: player.user_id === hostId,
  };
}

// Convert Supabase players to remote Player format
function toRemotePlayers(players: SupabaseLobbyPlayer[], userId: string): Player[] {
  return players
    .filter(p => p.user_id !== userId)
    .map(p => ({
      id: p.user_id,
      x: p.position_x,
      y: p.position_y,
      vx: 0,
      vy: 0,
      color: p.color,
      name: p.player_name,
      isGrounded: false,
      isDead: false,
      hasWon: p.has_finished,
    }));
}

export function useOnlineMultiplayer(userId: string | undefined, displayName: string) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [remotePlayers, setRemotePlayers] = useState<Player[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const positionUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Handle lobby updates from Realtime subscription
  const handleLobbyUpdate = useCallback((lobby: LobbyWithPlayers) => {
    setRoom(toGameRoom(lobby));
    setPlayers(lobby.players.map(p => toRoomPlayer(p, lobby.host_id)));
    if (userId) {
      setRemotePlayers(toRemotePlayers(lobby.players, userId));
    }
  }, [userId]);

  // Subscribe to lobby changes with Supabase Realtime
  const subscribeToLobby = useCallback((lobbyId: string) => {
    if (subscriptionRef.current) {
      unsubscribeLobbyChanges(subscriptionRef.current);
    }

    subscriptionRef.current = subscribeLobbyChanges(lobbyId, handleLobbyUpdate);
    setIsConnected(true);
  }, [handleLobbyUpdate]);

  // Create a new public or private room
  const createRoom = useCallback(async (
    levelId: string,
    isPublic: boolean = true,
    playerColor: string = '#26c6da'
  ): Promise<GameRoom | null> => {
    if (!userId) return null;

    try {
      const roomCode = isPublic ? null : generateRoomCode();
      
      const lobby = await createLobby(
        levelId,
        userId,
        displayName,
        isPublic,
        roomCode,
        4,
        playerColor
      );

      const gameRoom = toGameRoom(lobby);
      setRoom(gameRoom);
      setPlayers(lobby.players.map(p => toRoomPlayer(p, lobby.host_id)));
      subscribeToLobby(lobby.id);

      console.log('Created Supabase lobby:', lobby.id);
      return gameRoom;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }, [userId, displayName, subscribeToLobby]);

  // Join an existing room
  const joinRoom = useCallback(async (
    roomId: string,
    playerColor: string = '#26c6da'
  ): Promise<void> => {
    if (!userId) {
      throw new Error('Not authenticated');
    }

    try {
      await joinLobby(roomId, userId, displayName, playerColor);
      
      const lobby = await getLobby(roomId);
      if (!lobby) {
        throw new Error('Failed to fetch lobby after joining');
      }

      setRoom(toGameRoom(lobby));
      setPlayers(lobby.players.map(p => toRoomPlayer(p, lobby.host_id)));
      subscribeToLobby(roomId);

      console.log('Joined Supabase lobby:', roomId);
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }, [userId, displayName, subscribeToLobby]);

  // Join by room code
  const joinByCode = useCallback(async (
    code: string,
    playerColor: string = '#26c6da'
  ): Promise<void> => {
    if (!userId) {
      throw new Error('Not authenticated');
    }

    try {
      const normalizedCode = code.trim().toUpperCase();
      const lobby = await findLobbyByCode(normalizedCode);
      
      if (!lobby) {
        throw new Error('Room code not found. Make sure the code is correct.');
      }

      await joinLobby(lobby.id, userId, displayName, playerColor);
      
      const updatedLobby = await getLobby(lobby.id);
      if (!updatedLobby) {
        throw new Error('Failed to fetch lobby after joining');
      }

      setRoom(toGameRoom(updatedLobby));
      setPlayers(updatedLobby.players.map(p => toRoomPlayer(p, updatedLobby.host_id)));
      subscribeToLobby(lobby.id);

      console.log('Successfully joined Supabase lobby by code:', lobby.id);
    } catch (error) {
      console.error('Failed to join by code:', error);
      throw error;
    }
  }, [userId, displayName, subscribeToLobby]);

  // Get public rooms
  const getPublicRooms = useCallback(async (): Promise<GameRoom[]> => {
    try {
      const lobbies = await getPublicLobbies();
      return lobbies.map(toGameRoom);
    } catch (error) {
      console.error('Failed to fetch public lobbies:', error);
      return [];
    }
  }, []);

  // Update player position (batched for performance)
  const updatePosition = useCallback((roomId: string, position: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    isDead: boolean;
    hasWon: boolean;
  }) => {
    if (!userId) return;

    // Store pending position
    pendingPositionRef.current = { x: position.x, y: position.y };

    // Clear existing update timer
    if (positionUpdateRef.current) {
      clearTimeout(positionUpdateRef.current);
    }

    // Batch position updates every 100ms
    positionUpdateRef.current = setTimeout(() => {
      if (pendingPositionRef.current) {
        updatePlayerPosition(
          roomId,
          userId,
          pendingPositionRef.current.x,
          pendingPositionRef.current.y
        ).catch(error => console.error('Failed to update position:', error));
        
        pendingPositionRef.current = null;
      }
    }, 100);
  }, [userId]);

  // Set player ready status
  const setReady = useCallback((roomId: string) => {
    if (!userId || !room) return;

    try {
      // Optimistic update
      const currentPlayer = players.find(p => p.PlayerId === userId);
      const nextReady = currentPlayer ? !currentPlayer.IsReady : true;
      
      setPlayers(players.map(p =>
        p.PlayerId === userId ? { ...p, IsReady: nextReady } : p
      ));

      // Update in Supabase
      setPlayerReady(roomId, userId, nextReady)
        .catch(error => {
          console.error('Failed to update ready state:', error);
          // Revert on error
          setPlayers(players.map(p =>
            p.PlayerId === userId ? { ...p, IsReady: !nextReady } : p
          ));
        });
    } catch (error) {
      console.error('Failed to set ready:', error);
    }
  }, [userId, room, players]);

  // Start game
  const startGame = useCallback((roomId: string) => {
    if (!userId || !room) return;

    if (room.HostId !== userId) {
      console.warn('Only host can start game');
      return;
    }

    // Optimistic update
    setRoom(prev => prev ? { ...prev, Status: 'playing' } : prev);

    startSupabaseLobby(roomId, userId)
      .catch(error => {
        console.error('Failed to start game:', error);
        // Revert on error
        setRoom(prev => prev ? { ...prev, Status: 'waiting' } : prev);
      });
  }, [userId, room]);

  // Leave room
  const leaveRoom = useCallback((roomId: string) => {
    if (!userId) return;

    try {
      leaveLobby(roomId, userId)
        .catch(error => console.error('Failed to leave lobby:', error));

      if (subscriptionRef.current) {
        unsubscribeLobbyChanges(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      if (positionUpdateRef.current) {
        clearTimeout(positionUpdateRef.current);
      }

      setRoom(null);
      setPlayers([]);
      setRemotePlayers([]);
      setIsConnected(false);

      console.log('Left lobby:', roomId);
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  }, [userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        unsubscribeLobbyChanges(subscriptionRef.current);
      }
      if (positionUpdateRef.current) {
        clearTimeout(positionUpdateRef.current);
      }
    };
  }, []);

  return {
    room,
    players,
    remotePlayers,
    isConnected,
    createRoom,
    joinRoom,
    joinByCode,
    getPublicRooms,
    updatePosition,
    setReady,
    startGame,
    leaveRoom,
  };
}
