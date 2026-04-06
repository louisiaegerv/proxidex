'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';

const SKIP_DELETE_CONFIRM_KEY = 'proxidex-skip-delete-confirm';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cardCount: number;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  cardCount,
}: DeleteConfirmDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset don't ask again state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDontAskAgain(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (dontAskAgain) {
      localStorage.setItem(SKIP_DELETE_CONFIRM_KEY, 'true');
    }
    setIsLoading(true);
    try {
      onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle>Delete {cardCount} card{cardCount !== 1 ? 's' : ''}?</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            This action cannot be undone. The selected cards will be permanently removed from your proxy list.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 py-4">
          <Checkbox
            id="dont-ask"
            checked={dontAskAgain}
            onCheckedChange={(checked) => setDontAskAgain(checked as boolean)}
            className="mt-0.5"
          />
          <label
            htmlFor="dont-ask"
            className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            Don&apos;t ask me again
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? 'Deleting...' : `Delete ${cardCount} Card${cardCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to check if we should skip confirmation
export function shouldSkipDeleteConfirm(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SKIP_DELETE_CONFIRM_KEY) === 'true';
}

// Helper function to reset the skip preference (e.g., in settings)
export function resetDeleteConfirmPreference(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SKIP_DELETE_CONFIRM_KEY);
}
