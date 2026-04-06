import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { GameButton } from '@/components/ui/GameButton';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/lib/announcer';

export default function Auth() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    signInWithUsername,
    signUpWithUsername,
    completeUsernameSignup,
    beginAuthenticatorSetup,
    loading,
  } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [signupUsername, setSignupUsername] = useState<string | null>(null);
  const [authenticatorSetup, setAuthenticatorSetup] = useState<{
    qrDataUrl: string;
    manualCode: string;
  } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && !authenticatorSetup) navigate('/');
  }, [isAuthenticated, loading, navigate, authenticatorSetup]);

  const handleUsernameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Enter username');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const created = await signUpWithUsername(username);
        const setup = await beginAuthenticatorSetup(created.username);
        setSignupUsername(created.username);
        setAuthenticatorSetup({ qrDataUrl: setup.qrDataUrl, manualCode: setup.manualCode });
        toast.success('Account created. Connect your authenticator to finish.');
        return;
      }

      if (!authCode.trim()) {
        toast.error('Enter your authenticator code');
        return;
      }

      await signInWithUsername(username, authCode);
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!setupCode.trim()) return;
    if (!signupUsername) {
      toast.error('Signup session expired. Please sign up again.');
      return;
    }

    setSubmitting(true);
    try {
      await completeUsernameSignup(signupUsername, setupCode);
      toast.success('Logged in');
      setAuthenticatorSetup(null);
      setSignupUsername(null);
      setSetupCode('');
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-16 h-16 bg-primary/20 pixel-border" />
        <div className="absolute bottom-32 right-20 w-24 h-8 bg-accent/20 pixel-border" />
        <div className="absolute top-1/3 right-10 w-12 h-12 bg-success/20 pixel-border" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <GameButton variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-8">
          <ArrowLeft size={16} className="mr-2" />
          Back
        </GameButton>

        <div className="text-center mb-10">
          <h1 className="font-pixel text-2xl text-primary text-glow mb-3">ARCHITECT</h1>
          <p className="font-pixel-body text-muted-foreground">
            Sign in to save progress and publish levels
          </p>
        </div>

        <div className="bg-card/50 pixel-border border-2 border-border p-8 space-y-6">
          {loading ? (
            <p className="font-pixel-body text-muted-foreground text-center">Loading...</p>
          ) : authenticatorSetup ? (
            <form className="space-y-4" onSubmit={handleMfaSubmit}>
              <p className="font-pixel text-sm text-primary text-center">Connect Authenticator</p>
              <p className="font-pixel-body text-xs text-muted-foreground text-center">
                Scan this QR or use the manual key, then enter your 6-digit code.
              </p>
              <div className="flex justify-center">
                <img src={authenticatorSetup.qrDataUrl} alt="Authenticator QR" className="w-52 h-52 border border-border bg-white p-2" />
              </div>
              <div className="bg-background/60 border border-border px-3 py-2 font-mono text-xs break-all">
                {authenticatorSetup.manualCode}
              </div>
              <input
                type="text"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-input border-2 border-border px-3 py-2 font-pixel-body text-sm"
              />
              <GameButton type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
                {submitting ? 'Connecting...' : 'Confirm Authenticator'}
              </GameButton>
            </form>
          ) : (
            <>
              <div className="flex gap-2">
                <GameButton variant={mode === 'login' ? 'primary' : 'outline'} size="sm" className="flex-1" onClick={() => setMode('login')}>
                  Login
                </GameButton>
                <GameButton variant={mode === 'signup' ? 'primary' : 'outline'} size="sm" className="flex-1" onClick={() => setMode('signup')}>
                  Sign Up
                </GameButton>
              </div>

              <form className="space-y-3" onSubmit={handleUsernameSubmit}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  autoComplete="username"
                  className="w-full bg-input border-2 border-border px-3 py-2 font-pixel-body text-sm"
                />
                {mode === 'login' && (
                  <input
                    type="text"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="authenticator code"
                    className="w-full bg-input border-2 border-border px-3 py-2 font-pixel-body text-sm"
                  />
                )}
                <GameButton type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? 'Please wait...' : mode === 'signup' ? 'Create Username Account' : 'Login with Authenticator'}
                </GameButton>
              </form>

              <p className="font-pixel-body text-xs text-muted-foreground text-center">
                Passwordless login: username + authenticator code only.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

