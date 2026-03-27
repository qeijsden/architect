import { useState, useEffect, useCallback } from 'react';
import { Friend, Profile } from '@/types/game';
import { usePlayFabAuth } from '@/hooks/usePlayFabAuth';
import {
  sendFriendRequestToPlayFabId,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getCloudFriendsList,
  removeCloudFriend,
} from '@/integrations/playfab/api';

interface FriendWithProfile extends Friend {
  friend_profile?: Profile;
}

export function useFriends(userId: string | undefined, userDisplayName: string = 'Player') {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { loginWithCustomID, isAuthenticated: isPlayFabAuthed } = usePlayFabAuth();

  const ensurePlayFabSession = useCallback(async () => {
    if (!userId) {
      throw new Error('Not authenticated');
    }

    if (isPlayFabAuthed) {
      return;
    }

    await loginWithCustomID(userId, userDisplayName);
  }, [userId, userDisplayName, isPlayFabAuthed, loginWithCustomID]);

  // Load friends list
  const loadFriends = useCallback(async () => {
    if (!userDisplayName) return;

    setLoading(true);
    try {
      await ensurePlayFabSession();
      const cloudFriends = await getCloudFriendsList();

      const converted = cloudFriends.map((f: any) => ({
        id: `friend_${f.PlayFabId}`,
        user_id: userId,
        friend_id: f.PlayFabId,
        status: 'accepted',
        friend_profile: {
          id: f.PlayFabId,
          user_id: f.PlayFabId,
          display_name: f.DisplayName || 'Player',
          avatar_color: f.Color || '#26c6da',
        } as Profile,
      }));

      console.log('Loaded friends:', converted);
      setFriends(converted);
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, [userDisplayName, userId, ensurePlayFabSession]);

  // Load pending requests
  const loadPendingRequests = useCallback(async () => {
    if (!userDisplayName || !userId) return;

    setLoading(true);
    try {
      await ensurePlayFabSession();
      const requests = await getFriendRequests(userId); // Pass CustomId

      const converted = requests.map((r: any) => ({
        id: r.FromCustomId || r.FromPlayFabId,
        user_id: r.FromCustomId || r.FromPlayFabId,
        friend_id: userId,
        status: 'pending',
        fromCustomId: r.FromCustomId, // Store for accept/reject
        fromPlayFabId: r.FromPlayFabId, // Store for accept
        friend_profile: {
          id: r.FromPlayFabId,
          user_id: r.FromCustomId || r.FromPlayFabId,
          display_name: r.FromDisplayName || 'Player',
          avatar_color: r.Color || '#26c6da',
        } as Profile,
      }));

      console.log('Loaded pending requests:', converted);
      setPendingRequests(converted);
    } catch (error) {
      console.error('Error loading requests:', error);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  }, [userDisplayName, userId, ensurePlayFabSession]);

  useEffect(() => {
    loadFriends();
    loadPendingRequests();
  }, [userDisplayName, loadFriends, loadPendingRequests, refreshCounter]);

  const sendFriendRequest = useCallback(async (friendPlayFabId: string, friendColor: string) => {
    if (!userDisplayName || !userId) return { error: 'Not authenticated' };
    if (!friendPlayFabId || friendPlayFabId.length < 2) return { error: 'Invalid Player ID' };

    try {
      await ensurePlayFabSession();
      // friendPlayFabId is actually the target's CustomId (Clerk user ID)
      await sendFriendRequestToPlayFabId(friendPlayFabId, userId, userDisplayName, friendColor);
      console.log('Friend request sent:', { from: userDisplayName, fromId: userId, to: friendPlayFabId });
      setRefreshCounter(c => c + 1);
      return { error: null };
    } catch (error) {
      console.error('Error sending request:', error);
      return { error: error instanceof Error ? error.message : 'Failed to send request' };
    }
  }, [userDisplayName, userId, ensurePlayFabSession]);

  const acceptRequest = useCallback(async (request: any) => {
    if (!userDisplayName || !userId) return { error: 'Not authenticated' };

    try {
      await ensurePlayFabSession();
      const fromCustomId = request.fromCustomId || request.user_id;
      const fromPlayFabId = request.fromPlayFabId || request.friend_profile?.id;
      const fromDisplayName = request.friend_profile?.display_name;
      const color = request.friend_profile?.avatar_color || '#26c6da';
      
      await acceptFriendRequest(userId, fromCustomId, fromPlayFabId, fromDisplayName, userDisplayName, color);
      console.log('Request accepted:', { me: userDisplayName, friend: fromPlayFabId });
      setRefreshCounter(c => c + 1);
      return { error: null };
    } catch (error) {
      console.error('Error accepting request:', error);
      return { error: error instanceof Error ? error.message : 'Failed to accept request' };
    }
  }, [userDisplayName, userId, ensurePlayFabSession]);

  const rejectRequest = useCallback(async (request: any) => {
    if (!userId) return { error: 'Not authenticated' };

    try {
      await ensurePlayFabSession();
      const fromCustomId = request.fromCustomId || request.user_id;
      await rejectFriendRequest(userId, fromCustomId);
      console.log('Request rejected:', fromCustomId);
      setRefreshCounter(c => c + 1);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to reject' };
    }
  }, [userId, ensurePlayFabSession]);

  const removeFriend = useCallback(async (friendPlayFabId: string) => {
    if (!userDisplayName) return;

    try {
      await ensurePlayFabSession();
      await removeCloudFriend(friendPlayFabId);
      console.log('Friend removed:', friendPlayFabId);
      setRefreshCounter(c => c + 1);
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  }, [userDisplayName, ensurePlayFabSession]);

  const addFriendByPlayFabId = useCallback(async (playFabId: string, color: string = '#26c6da') => {
    return sendFriendRequest(playFabId, color);
  }, [sendFriendRequest]);

  return {
    friends,
    pendingRequests,
    loading,
    fetchFriends: loadFriends,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    searchUsers: async () => [],
    addFriendByPlayFabId,
  };
}

