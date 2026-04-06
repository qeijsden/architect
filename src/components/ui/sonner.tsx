import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      closeButton
      toastOptions={{
        className: 'border border-border bg-card/95 text-foreground shadow-xl rounded-md',
      }}
      className="!top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2"
    />
  );
}