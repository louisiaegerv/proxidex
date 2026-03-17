'use client';

import { Trash2, X, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BulkSelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExitBulkMode: () => void;
}

export function BulkSelectionToolbar({
  selectedCount,
  totalCount,
  onDelete,
  onSelectAll,
  onDeselectAll,
  onExitBulkMode,
}: BulkSelectionToolbarProps) {
  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-3',
        'bg-slate-900/95 backdrop-blur-sm',
        'border border-slate-700/50 rounded-xl',
        'shadow-2xl shadow-black/50',
        'transition-all duration-300 ease-out',
        selectedCount > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-3 px-2">
        <span className="text-sm font-medium text-white min-w-[80px]">
          {selectedCount} selected
        </span>
      </div>

      <div className="h-6 w-px bg-slate-700" />

      {/* Select all / Deselect all */}
      <Button
        variant="ghost"
        size="sm"
        onClick={isAllSelected ? onDeselectAll : onSelectAll}
        className="h-8 px-3 text-slate-300 hover:text-white hover:bg-slate-800"
      >
        {isAllSelected ? (
          <>
            <Square className="w-4 h-4 mr-2" />
            Deselect All
          </>
        ) : (
          <>
            <CheckSquare className="w-4 h-4 mr-2" />
            Select All
          </>
        )}
      </Button>

      <div className="h-6 w-px bg-slate-700" />

      {/* Delete button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={selectedCount === 0}
        className="h-8 px-3 text-red-400 hover:text-red-300 hover:bg-red-950/30"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>

      <div className="h-6 w-px bg-slate-700" />

      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onExitBulkMode}
        className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
