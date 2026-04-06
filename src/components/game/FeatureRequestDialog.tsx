import { useRef, useState } from 'react';
import { GameButton } from '@/components/ui/GameButton';
import { toast } from '@/lib/announcer';
import { useAuth } from '@/hooks/useAuth';
import { usePlayFabAuth } from '@/hooks/usePlayFabAuth';
import { publishFeatureRequestToPlayFab } from '@/integrations/playfab/api';

type FeatureRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeatureRequestDialog({ open, onOpenChange }: FeatureRequestDialogProps) {
  const { user, profile } = useAuth();
  const { isAuthenticated: isPlayFabAuthed, loginWithCustomID } = usePlayFabAuth();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [includeBlox, setIncludeBlox] = useState(false);
  const [bloxName, setBloxName] = useState<string | null>(null);
  const [bloxContent, setBloxContent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const bloxInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleBloxUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.blox') && !file.name.toLowerCase().endsWith('.json')) {
      toast.error('Please upload a .blox file');
      return;
    }
    const textValue = await file.text();
    setBloxName(file.name);
    setBloxContent(textValue);
    toast.success(`Attached ${file.name}`);
  };

  const openBloxPicker = () => {
    const input = bloxInputRef.current;
    if (!input) return;

    try {
      const pickerCapable = input as HTMLInputElement & { showPicker?: () => void };
      if (typeof pickerCapable.showPicker === 'function') {
        pickerCapable.showPicker();
        return;
      }
    } catch {
      // Fall through to click fallback.
    }

    input.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-md p-5 w-full max-w-md">
        <h2 className="font-pixel text-xs text-primary mb-3">Feature Request</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-2 bg-input border border-border rounded p-2 font-pixel-body text-sm"
          placeholder="Short title"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-28 bg-input border border-border rounded p-2 font-pixel-body text-sm"
          placeholder="Tell us what feature you want..."
        />
        <div className="mt-3 border border-border rounded p-3 space-y-2 bg-background/40">
          <label className="flex items-center gap-2 font-pixel-body text-xs text-muted-foreground">
            <input type="checkbox" checked={includeBlox} onChange={(e) => setIncludeBlox(e.target.checked)} />
            Include .blox upload for sprite idea
          </label>
          {includeBlox && (
            <>
              <GameButton variant="outline" size="sm" className="w-full cursor-pointer" onClick={openBloxPicker}>
                Upload .blox
              </GameButton>
              <input
                ref={bloxInputRef}
                type="file"
                accept=".blox,.json"
                className="absolute -left-[9999px] w-px h-px opacity-0 pointer-events-none"
                tabIndex={-1}
                onChange={(e) => {
                  void handleBloxUpload(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              {bloxName && <p className="font-pixel-body text-xs text-primary">Attached: {bloxName}</p>}
            </>
          )}

        </div>
        <div className="flex justify-end gap-2 mt-4">
          <GameButton variant="outline" onClick={() => onOpenChange(false)}>Close</GameButton>
          <GameButton
            variant="primary"
            disabled={submitting}
            onClick={async () => {
              if (!title.trim() || !text.trim()) {
                toast.error('Please enter title and details.');
                return;
              }
              if (includeBlox && !bloxContent) {
                toast.error('Please upload a .blox file or disable the upload option.');
                return;
              }

              setSubmitting(true);
              try {
                if (user?.id && !isPlayFabAuthed) {
                  await loginWithCustomID(user.id, profile?.display_name || user.name || 'Player');
                }

                try {
                  await publishFeatureRequestToPlayFab({
                    title: title.trim(),
                    description: text.trim(),
                    userId: user?.id,
                    userName: profile?.display_name || user?.name || 'Player',
                    blox: includeBlox && bloxContent
                      ? {
                          name: bloxName,
                          content: bloxContent,
                        }
                      : null,
                  });
                  toast.success('Feature request saved to PlayFab.');
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Sync failed';
                  toast.warning(`Saved locally. PlayFab sync failed: ${message}`);
                }

                setTitle('');
                setText('');
                setIncludeBlox(false);
                setBloxName(null);
                setBloxContent(null);
                onOpenChange(false);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Saving...' : 'Submit'}
          </GameButton>
        </div>
      </div>
    </div>
  );
}
