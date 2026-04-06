import { useEffect, useMemo, useState } from 'react';
import { announcer, AnnounceEvent } from '@/lib/announcer';

type ActiveNotice = AnnounceEvent;

const NOTICE_DURATION_MS = 3200;

const variantClasses: Record<string, string> = {
  info: 'border-cyan-500/70 bg-cyan-950/95 text-cyan-100',
  success: 'border-emerald-500/70 bg-emerald-950/95 text-emerald-100',
  error: 'border-rose-500/70 bg-rose-950/95 text-rose-100',
  warning: 'border-amber-500/70 bg-amber-950/95 text-amber-100',
};

export function TopBarAnnouncer() {
  const [active, setActive] = useState<ActiveNotice | null>(null);

  useEffect(() => {
    let timer: number | null = null;

    const unsubscribe = announcer.subscribe((event) => {
      setActive(event);
      if (timer) {
        window.clearTimeout(timer);
      }
      const duration = event.durationMs ?? NOTICE_DURATION_MS;
      timer = window.setTimeout(() => setActive(null), duration);
    });

    return () => {
      unsubscribe();
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const className = useMemo(() => {
    if (!active) return '';
    return variantClasses[active.variant] || variantClasses.info;
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      <div className={`mx-auto w-full border-b-2 px-4 py-3 shadow-lg font-pixel-body text-sm text-center ${className}`}>
        <div className="mx-auto max-w-5xl truncate">{active.message}</div>
      </div>
    </div>
  );
}