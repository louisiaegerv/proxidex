"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Layers, Trash2 } from "lucide-react";

interface LoadConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOverwrite: () => void;
  onAddToExisting: () => void;
  existingCardCount: number;
  newDeckName: string;
}

export function LoadConfirmDialog({
  isOpen,
  onClose,
  onOverwrite,
  onAddToExisting,
  existingCardCount,
  newDeckName,
}: LoadConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Cards Already in List
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            You have {existingCardCount} card{existingCardCount !== 1 ? "s" : ""} in your deck list. 
            How would you like to load &quot;{newDeckName}&quot;?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Overwrite option */}
          <button
            onClick={onOverwrite}
            className="flex w-full items-center gap-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-left transition-colors hover:border-red-500/50 hover:bg-red-500/20"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-300">Replace All</p>
              <p className="text-xs text-slate-400">
                Clear existing cards and load only the new deck
              </p>
            </div>
          </button>

          {/* Add to existing option */}
          <button
            onClick={onAddToExisting}
            className="flex w-full items-center gap-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-left transition-colors hover:border-blue-500/50 hover:bg-blue-500/20"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20">
              <Layers className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-blue-300">Add to Existing</p>
              <p className="text-xs text-slate-400">
                Keep current cards and append the new deck
              </p>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
