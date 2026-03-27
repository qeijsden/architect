import { GameButton } from '@/components/ui/GameButton';

type PatchNotesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PatchNotesDialog({ open, onOpenChange }: PatchNotesDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-md p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto game-scrollbar">
        <h2 className="font-pixel text-xs text-primary mb-3">Patch Notes</h2>
        <div className="font-pixel-body text-sm space-y-2 text-foreground">
          <p>- Restored gameplay/editor components that were accidentally replaced by stubs.</p>
          <p>- Re-enabled Steam export flow for macOS and Windows packaging.</p>
          <p>- Added Steamworks SDK runtime import and bundling in desktop builds.</p>
          <p>- Improved build scripts for repeatable exports.</p>
        </div>
        <div className="flex justify-end mt-5">
          <GameButton variant="primary" onClick={() => onOpenChange(false)}>Close</GameButton>
        </div>
      </div>
    </div>
  );
}
