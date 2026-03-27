import { useNavigate } from 'react-router-dom';
import { SignIn } from '@clerk/clerk-react';
import { useAuth } from '@/hooks/useAuth';
import { GameButton } from '@/components/ui/GameButton';
import { ArrowLeft } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/');
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
        {/* Back button */}
        <GameButton 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')}
          className="mb-8"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </GameButton>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-pixel text-2xl text-primary text-glow mb-4">ARCHITECT</h1>
          <p className="font-pixel-body text-muted-foreground text-lg">
            Sign in or create account
          </p>
        </div>

        {/* Clerk SignIn Component */}
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-card/50 pixel-border border-2 border-border',
                headerTitle: 'font-pixel text-primary',
                headerSubtitle: 'font-pixel-body text-muted-foreground',
                formButtonPrimary: 'bg-primary hover:bg-primary/90 font-pixel-body',
                formFieldLabel: 'font-pixel text-xs text-muted-foreground',
                formFieldInput: 'bg-background border-2 border-border font-pixel-body',
                dividerLine: 'bg-border',
                dividerText: 'font-pixel text-xs text-muted-foreground',
                socialButtonsBlockButton: 'bg-background border-2 border-border hover:bg-accent/10 font-pixel-body',
                footerActionLink: 'text-primary hover:text-primary/80 font-pixel',
                footerActionText: 'font-pixel-body text-muted-foreground',
              },
            }}
            redirectUrl="/"
            fallback={
              <div className="text-center p-8">
                <p className="font-pixel-body text-muted-foreground">Loading...</p>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
