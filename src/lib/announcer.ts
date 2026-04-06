type AnnounceVariant = 'info' | 'success' | 'error' | 'warning';

type AnnounceEvent = {
  id: number;
  message: string;
  variant: AnnounceVariant;
  durationMs?: number;
};

type AnnounceListener = (event: AnnounceEvent) => void;

const listeners = new Set<AnnounceListener>();

const emit = (variant: AnnounceVariant, message: string, durationMs?: number) => {
  const event: AnnounceEvent = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    message,
    variant,
    durationMs,
  };
  listeners.forEach((listener) => listener(event));
};

export const announcer = {
  subscribe(listener: AnnounceListener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

type ToastFn = ((message: string) => void) & {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

export const toast: ToastFn = Object.assign(
  (message: string) => emit('info', message),
  {
    success: (message: string) => emit('success', message),
    error: (message: string) => emit('error', message),
    info: (message: string) => emit('info', message),
    warning: (message: string) => emit('warning', message),
  },
);

export type { AnnounceEvent, AnnounceVariant };
