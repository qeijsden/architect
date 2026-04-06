import { useNavigate } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Shield } from 'lucide-react';

export default function TwoFA() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-16 h-16 bg-primary/20 pixel-border" />
        <div className="absolute bottom-32 right-20 w-24 h-8 bg-accent/20 pixel-border" />
        <div className="absolute top-1/3 right-10 w-12 h-12 bg-success/20 pixel-border" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <GameButton variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft size={16} className="mr-2" />
          Back
        </GameButton>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield size={48} className="text-primary" />
          </div>
          <h1 className="font-pixel text-2xl text-primary text-glow mb-4">SECURITY SETTINGS</h1>
          <p className="font-pixel-body text-muted-foreground text-lg">
            Account security is handled by Google
          </p>
        </div>

        <div className="bg-card/50 p-6 pixel-border space-y-4">
          <div className="flex items-center gap-3 p-4 bg-success/10 border-2 border-success/30 pixel-border">
            <div className="w-3 h-3 bg-success" />
            <span className="font-pixel text-sm text-success">Security: Google Account</span>
          </div>
          <p className="font-pixel-body text-muted-foreground text-sm">
            Two-factor authentication, password management, and device security are all handled by your Google account. Visit myaccount.google.com to manage them.
          </p>
          <GameButton
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => window.open('https://myaccount.google.com/security', '_blank')}
          >
            Open Google Security
          </GameButton>
        </div>
      </div>
    </div>
  );
}

