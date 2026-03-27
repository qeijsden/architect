import { useState, useEffect, useCallback, useRef } from 'react';
import { GameSession, SessionPlayer, Player } from '@/types/game';

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

const SESSION_STORAGE_PREFIX = 'game_session_';
const PLAYERS_STORAGE_PREFIX = 'session_players_';
const PRESENCE_STORAGE_PREFIX = 'session_presence_';

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export function useLocalMultiplayer(userId: string | undefined, displayName: string) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [remotePlayers, setRemotePlayers] = useState<Player[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Create a new game session
  const createSession = useCallback(async (levelId: string, isPublic: boolean = true, playerColor: string = '#26c6da') => {
    if (!userId) return null;

    const sessionId = generateSessionId();
    const roomCode = isPublic ? null : generateRoomCode();

    const newSession: GameSession = {
      id: sessionId,
      level_id: levelId,
      host_id: userId,
      is_public: isPublic,
      room_code: roomCode,
      status: 'waiting',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(
      SESSION_STORAGE_PREFIX + sessionId,
      JSON.stringify(newSession)
    );

    setSession(newSession);
    await joinSession(sessionId, playerColor);

    return newSession;
  }, [userId]);

  // Join an existing session
  const joinSession = useCallback(async (sessionId: string, playerColor: string = '#26c6da') => {
    if (!userId) {
      console.error('joinSession: No userId');
      return;
    }

    console.log('joinSession called:', { sessionId, userId, playerColor });

    // Load session
    const sessionData = localStorage.getItem(SESSION_STORAGE_PREFIX + sessionId);
    if (!sessionData) {
      console.error('joinSession: Session not found');
      throw new Error('Session not found');
    }

    const parsedSession = JSON.parse(sessionData) as GameSession;
    setSession(parsedSession);

    // Check if player already exists
    const playersKey = PLAYERS_STORAGE_PREFIX + sessionId;
    const playersData = localStorage.getItem(playersKey);
    let sessionPlayers: SessionPlayer[] = playersData ? JSON.parse(playersData) : [];

    const existingPlayer = sessionPlayers.find(p => p.user_id === userId);

    if (!existingPlayer) {
      const newPlayer: SessionPlayer = {
        id: `player_${Date.now()}`,
        session_id: sessionId,
        user_id: userId,
        player_name: displayName,
        color: playerColor,
        is_ready: false,
        created_at: new Date().toISOString(),
      };

      sessionPlayers.push(newPlayer);
      localStorage.setItem(playersKey, JSON.stringify(sessionPlayers));
      console.log('Added player to session:', newPlayer);
    }

    setPlayers(sessionPlayers);
    setupPolling(sessionId);
    setIsConnected(true);
  }, [userId, displayName]);

  // Join by room code
  const joinByCode = useCallback(async (roomCode: string, playerColor: string = '#26c6da') => {
    // Search for session with this room code
    // For local implementation, we'll check localStorage keys
    let sessionId: string | null = null;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SESSION_STORAGE_PREFIX)) {
        const sessionData = localStorage.getItem(key);
        if (sessionData) {
          const session = JSON.parse(sessionData) as GameSession;
          if (session.room_code === roomCode) {
            sessionId = session.id;
            break;
          }
        }
      }
    }

    if (!sessionId) {
      throw new Error('Room code not found');
    }

    await joinSession(sessionId, playerColor);
  }, [joinSession]);

  const setupPolling = useCallback((sessionId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    const poll = () => {
      const playersData = localStorage.getItem(PLAYERS_STORAGE_PREFIX + sessionId);
      if (playersData) {
        const sessionPlayers = JSON.parse(playersData) as SessionPlayer[];
        setPlayers(sessionPlayers);
      }

      // Update presence for remote players
      const presenceData = localStorage.getItem(PRESENCE_STORAGE_PREFIX + sessionId);
      if (presenceData) {
        try {
          const presence = JSON.parse(presenceData) as PresenceState;
          const remotePlayersArray: Player[] = [];

          Object.entries(presence).forEach(([userId, playerData]) => {
            if (playerData && playerData.length > 0) {
              const pd = playerData[0];
              remotePlayersArray.push({
                id: userId,
                x: pd.x,
                y: pd.y,
                vx: pd.vx,
                vy: pd.vy,
                color: pd.color,
                name: pd.name,
                isGrounded: false,
                isDead: pd.isDead,
                hasWon: pd.hasWon,
              });
            }
          });

          setRemotePlayers(remotePlayersArray);
        } catch (error) {
          console.error('Failed to parse presence data:', error);
        }
      }
    };

    pollingRef.current = setInterval(poll, 100); // Poll every 100ms
  }, []);

  const updatePlayerPresence = useCallback((sessionId: string, playerData: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    name: string;
    isDead: boolean;
    hasWon: boolean;
  }) => {
    if (!userId) return;

    const presenceKey = PRESENCE_STORAGE_PREFIX + sessionId;
    const presenceData = localStorage.getItem(presenceKey);
    const presence: PresenceState = presenceData ? JSON.parse(presenceData) : {};

    presence[userId] = [playerData];
    localStorage.setItem(presenceKey, JSON.stringify(presence));
  }, [userId]);

  const updatePosition = useCallback((sessionId: string, position: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    isDead: boolean;
    hasWon: boolean;
  }) => {
    if (!userId) return;

    const playersKey = PLAYERS_STORAGE_PREFIX + sessionId;
    const playersData = localStorage.getItem(playersKey);
    if (!playersData) return;

    const sessionPlayers = JSON.parse(playersData) as SessionPlayer[];
    const playerIndex = sessionPlayers.findIndex(p => p.user_id === userId);

    if (playerIndex >= 0) {
      // Store position data
      const positionData = {
        x: position.x,
        y: position.y,
        vx: position.vx,
        vy: position.vy,
        isDead: position.isDead,
        hasWon: position.hasWon,
      };

      const presenceKey = PRESENCE_STORAGE_PREFIX + sessionId;
      const presenceData = localStorage.getItem(presenceKey) || '{}';
      const presence: PresenceState = JSON.parse(presenceData);

      presence[userId] = [{
        x: position.x,
        y: position.y,
        vx: position.vx,
        vy: position.vy,
        color: sessionPlayers[playerIndex].color,
        name: sessionPlayers[playerIndex].player_name,
        isDead: position.isDead,
        hasWon: position.hasWon,
      }];

      localStorage.setItem(presenceKey, JSON.stringify(presence));
    }
  }, [userId]);

  const recordFinish = useCallback((sessionId: string, won: boolean) => {
    if (!userId) return;

    const playersKey = PLAYERS_STORAGE_PREFIX + sessionId;
    const playersData = localStorage.getItem(playersKey);
    if (!playersData) return;

    const sessionPlayers = JSON.parse(playersData) as SessionPlayer[];
    const playerIndex = sessionPlayers.findIndex(p => p.user_id === userId);

    if (playerIndex >= 0 && sessionPlayers[playerIndex]) {
      sessionPlayers[playerIndex].has_won = won;
      localStorage.setItem(playersKey, JSON.stringify(sessionPlayers));
    }
  }, [userId]);

  const setReady = useCallback((sessionId: string) => {
    if (!userId) return;

    const playersKey = PLAYERS_STORAGE_PREFIX + sessionId;
    const playersData = localStorage.getItem(playersKey);
    if (!playersData) return;

    const sessionPlayers = JSON.parse(playersData) as SessionPlayer[];
    const playerIndex = sessionPlayers.findIndex(p => p.user_id === userId);

    if (playerIndex >= 0) {
      sessionPlayers[playerIndex].is_ready = !sessionPlayers[playerIndex].is_ready;
      localStorage.setItem(playersKey, JSON.stringify(sessionPlayers));
      setPlayers(sessionPlayers);
    }
  }, [userId]);

  const startGame = useCallback((sessionId: string) => {
    const sessionData = localStorage.getItem(SESSION_STORAGE_PREFIX + sessionId);
    if (!sessionData) return;

    const parsedSession = JSON.parse(sessionData) as GameSession;
    parsedSession.status = 'playing';
    localStorage.setItem(SESSION_STORAGE_PREFIX + sessionId, JSON.stringify(parsedSession));
    setSession(parsedSession);
  }, []);

  const leaveSession = useCallback((sessionId: string) => {
    if (!userId) return;

    const playersKey = PLAYERS_STORAGE_PREFIX + sessionId;
    const playersData = localStorage.getItem(playersKey);
    if (!playersData) return;

    let sessionPlayers = JSON.parse(playersData) as SessionPlayer[];
    sessionPlayers = sessionPlayers.filter(p => p.user_id !== userId);

    localStorage.setItem(playersKey, JSON.stringify(sessionPlayers));

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    setSession(null);
    setPlayers([]);
    setIsConnected(false);
  }, [userId]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
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
    updatePlayerPresence,
    updatePosition,
    recordFinish,
    setReady,
    startGame,
    leaveSession,
  };
}
