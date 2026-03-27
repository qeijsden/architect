import { useState } from 'react';
import { GameButton } from '@/components/ui/GameButton';
import { toast } from 'sonner';

type ReportDialogProps = {
  levelId: string;
  levelName: string;
  userId?: string;
  onClose: () => void;
};

const REPORTS_KEY = 'architect_reports';

export function ReportDialog({ levelId, levelName, userId, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (!reason.trim()) {
      toast.error('Please enter a reason.');
      return;
    }
    setSubmitting(true);
    try {
      const existing = localStorage.getItem(REPORTS_KEY);
      const reports = existing ? JSON.parse(existing) : [];
      reports.push({
        id: `${levelId}_${Date.now()}`,
        levelId,
        levelName,
        userId: userId || 'anonymous',
        reason: reason.trim(),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
      toast.success('Report submitted.');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-md p-5 w-full max-w-md">
        <h2 className="font-pixel text-xs text-primary mb-2">Report Level</h2>
        <p className="font-pixel-body text-sm text-muted-foreground mb-3">{levelName}</p>
        <textarea
          className="w-full min-h-28 bg-input border border-border rounded p-2 font-pixel-body text-sm"
          placeholder="Why are you reporting this level?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <GameButton variant="outline" onClick={onClose}>Cancel</GameButton>
          <GameButton variant="destructive" onClick={submit} disabled={submitting}>Submit</GameButton>
        </div>
      </div>
    </div>
  );
}
