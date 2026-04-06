import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { 
  ArrowLeft, Users, UserPlus, Check, X, 
  UserMinus, MessageSquare, Gamepad2, Copy
} from 'lucide-react';
import { toast } from '@/lib/announcer';

const AVATAR_COLORS = [
  '#26c6da', '#e53935', '#43a047', '#ffb300', 
  '#7e57c2', '#ec407a', '#ff7043', '#66bb6a'
];

export default function Friends() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const {
    friends,
    pendingRequests,
    loading,
    acceptRequest,
    rejectRequest,
    removeFriend,
    addFriendByPlayFabId,
  } = useFriends(user?.id, profile?.display_name || 'Player');

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [playerIdInput, setPlayerIdInput] = useState('');
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedPlayerId, setCopiedPlayerId] = useState(false);

  if (!authLoading && !isAuthenticated) {
    navigate('/auth');
    return null;
  }

  const handleAddFriend = async () => {
    if (!playerIdInput.trim()) {
      toast.error('Enter a Player ID');
      return;
    }

    const result = await addFriendByPlayFabId(playerIdInput.trim(), '#26c6da');
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Friend request sent!`);
      setPlayerIdInput('');
    }
  };

  const handleAccept = async (request: any) => {
    const result = await acceptRequest(request);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Friend request accepted!');
    }
  };

  const handleReject = async (request: any) => {
    const result = await rejectRequest(request);
    if (!result.error) {
      toast.success('Request declined');
    }
  };

  const handleRemove = async (friendName: string) => {
    await removeFriend(friendName);
    toast.success('Friend removed');
  };

  const handleInvite = (friendName: string) => {
    navigate('/browse', { state: { inviteFriend: { id: friendName, name: friendName } } });
  };

  const copyUsername = () => {
    if (profile?.display_name) {
      navigator.clipboard.writeText(profile.display_name);
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
    }
  };

  const copyPlayerId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedPlayerId(true);
      setTimeout(() => setCopiedPlayerId(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <GameButton variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft size={16} className="mr-2" />
          Back
        </GameButton>

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="font-pixel text-2xl text-primary text-glow">FRIENDS</h1>
          </div>
          <div className="mt-4 bg-card/50 p-3 pixel-border inline-block">
            <p className="font-pixel-body text-xs text-muted-foreground">Your Username:</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-pixel-body text-lg text-primary">{profile?.display_name || 'Player'}</p>
              <GameButton 
                variant="ghost" 
                size="sm"
                onClick={copyUsername}
              >
                {copiedUsername ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </GameButton>
            </div>
            <p className="font-pixel-body text-xs text-muted-foreground mt-3">Your Player ID:</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-pixel-body text-xs text-primary font-mono break-all max-w-md">{user?.id || 'N/A'}</p>
              <GameButton 
                variant="ghost" 
                size="sm"
                onClick={copyPlayerId}
              >
                {copiedPlayerId ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </GameButton>
            </div>
            <p className="font-pixel-body text-xs text-muted-foreground/60 mt-2">Share this ID to receive friend requests</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-2 flex-wrap">
          <GameButton
            variant={activeTab === 'friends' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('friends')}
          >
            Friends ({friends.length})
          </GameButton>
          <GameButton
            variant={activeTab === 'requests' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('requests')}
          >
            Requests ({pendingRequests.length})
          </GameButton>
          <GameButton
            variant={activeTab === 'add' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('add')}
          >
            <UserPlus size={14} className="mr-1" />
            Add Friend
          </GameButton>
        </div>

        {/* Friends List */}
        {activeTab === 'friends' && (
          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="font-pixel-body text-muted-foreground text-center py-8">
                Loading...
              </p>
            ) : friends.length === 0 ? (
              <div className="text-center py-12 bg-card/50 pixel-border">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-pixel-body text-muted-foreground text-lg">
                  No friends yet
                </p>
                <p className="font-pixel-body text-muted-foreground/60 text-sm mt-2">
                  Share your Player ID with other players to add them!
                </p>
              </div>
            ) : (
              friends.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between bg-card/50 p-4 pixel-border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 pixel-border"
                      style={{ backgroundColor: friend.friend_profile?.avatar_color || '#26c6da' }}
                    />
                    <span className="font-pixel-body text-foreground text-lg">
                      {friend.friend_profile?.display_name || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <GameButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleInvite(friend.friend_profile?.display_name || 'Friend')}
                    >
                      <Gamepad2 size={14} />
                    </GameButton>
                    <GameButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(friend.friend_profile?.id || '')}
                    >
                      <UserMinus size={14} />
                    </GameButton>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pending Requests */}
        {activeTab === 'requests' && (
          <div className="mt-6 space-y-3">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 bg-card/50 pixel-border">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-pixel-body text-muted-foreground text-lg">
                  No pending requests
                </p>
              </div>
            ) : (
              pendingRequests.map(request => (
                <div
                  key={request.id}
                  className="flex items-center justify-between bg-card/50 p-4 pixel-border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 pixel-border"
                      style={{ backgroundColor: request.friend_profile?.avatar_color || '#26c6da' }}
                    />
                    <div>
                      <span className="font-pixel-body text-foreground">
                        {request.friend_profile?.display_name || 'Unknown'}
                      </span>
                      <p className="font-pixel-body text-muted-foreground text-sm">
                        wants to be your friend
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <GameButton
                      variant="success"
                      size="sm"
                      onClick={() => handleAccept(request)}
                    >
                      <Check size={14} />
                    </GameButton>
                    <GameButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReject(request)}
                    >
                      <X size={14} />
                    </GameButton>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add Friend */}
        {activeTab === 'add' && (
          <div className="mt-6">
            <div className="bg-card/50 p-6 pixel-border">
              <div className="mb-4">
                <label className="font-pixel-body text-sm text-foreground block mb-3">
                  Enter friend's Player ID:
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={playerIdInput}
                    onChange={(e) => setPlayerIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                    placeholder="Player ID..."
                    className="flex-1 bg-background border-2 border-border px-4 py-3 font-pixel-body text-foreground placeholder:text-muted-foreground focus:border-primary outline-none font-mono text-sm"
                  />
                  <GameButton variant="primary" onClick={handleAddFriend}>
                    <UserPlus size={16} />
                  </GameButton>
                </div>
              </div>
              <div className="bg-background/50 p-3 pixel-border text-xs">
                <p className="font-pixel-body text-muted-foreground mb-2">💡 How to add friends:</p>
                <ol className="font-pixel-body text-muted-foreground/80 space-y-1">
                  <li>1. Share your Player ID with other players</li>
                  <li>2. Enter their Player ID here to send a request</li>
                  <li>3. They accept & you'll be friends!</li>
                  <li>4. Play together in lobbies</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
