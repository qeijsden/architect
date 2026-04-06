import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    navigate(isAuthenticated ? '/' : '/auth', { replace: true });
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="font-pixel text-2xl text-primary text-glow mb-4">CONNECTING...</h1>
        <p className="font-pixel-body text-muted-foreground mb-8">Setting up your account</p>
        <div className="flex justify-center gap-2">
          <div className="w-3 h-3 bg-primary animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-3 h-3 bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-3 h-3 bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}

