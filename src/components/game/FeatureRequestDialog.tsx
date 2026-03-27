import { useState } from 'react';
import { GameButton } from '@/components/ui/GameButton';
import { toast } from 'sonner';

type FeatureRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const FEATURE_REQUESTS_KEY = 'architect_feature_requests';

export function FeatureRequestDialog({ open, onOpenChange }: FeatureRequestDialogProps) {
  const [text, setText] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-md p-5 w-full max-w-md">
        <h2 className="font-pixel text-xs text-primary mb-3">Feature Request</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-28 bg-input border border-border rounded p-2 font-pixel-body text-sm"
          placeholder="Tell us what feature you want..."
        />
        <div className="flex justify-end gap-2 mt-4">
          <GameButton variant="outline" onClick={() => onOpenChange(false)}>Close</GameButton>
          <GameButton
            variant="primary"
            onClick={() => {
              if (!text.trim()) {
                toast.error('Please enter a request.');
                return;
              }
              const existing = localStorage.getItem(FEATURE_REQUESTS_KEY);
              const list = existing ? JSON.parse(existing) : [];
              list.push({ id: Date.now(), text: text.trim(), createdAt: new Date().toISOString() });
              localStorage.setItem(FEATURE_REQUESTS_KEY, JSON.stringify(list));
              setText('');
              toast.success('Feature request saved.');
              onOpenChange(false);
            }}
          >
            Submit
          </GameButton>
        </div>
      </div>
    </div>
  );
}
