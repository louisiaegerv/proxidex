'use client';

import { Trash2, FileDown, Printer, GripVertical } from 'lucide-react';
import { useProxyList } from '@/stores/proxy-list';
import { generateProxyPDF, downloadPDF } from '@/lib/pdf';
import { getFullImageUrl } from '@/lib/tcgdex';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ProxyItem } from '@/types';

interface SortableProxyItemProps {
  item: ProxyItem;
  onRemove: (id: string) => void;
}

function SortableProxyItem({ item, onRemove }: SortableProxyItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const thumbnailUrl = getFullImageUrl(item.image, 'low', 'webp');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2"
    >
      {/* Drag Handle */}
      <button
        className="cursor-grab text-slate-600 hover:text-slate-400 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Thumbnail */}
      <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-slate-800">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[8px] text-slate-600">
            No Img
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200">
          {item.name}
        </p>
        <p className="truncate text-xs text-slate-500">
          {item.setName}
        </p>
      </div>

      {/* Quantity is always 1 now - each card is individual */}
      <span className="w-6 text-center text-xs text-slate-500">
        ×1
      </span>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-slate-500 hover:text-red-400"
        onClick={() => onRemove(item.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ProxyList() {
  const {
    items,
    removeItem,
    reorderItems,
    clearList,
    getTotalCards,
    settings,
  } = useProxyList();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  
  const totalCards = getTotalCards();

  const handleClear = () => {
    clearList();
    setShowClearDialog(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      reorderItems(oldIndex, newIndex);
    }
  };

  const handleGeneratePDF = async () => {
    if (items.length === 0) return;
    
    setIsGenerating(true);
    try {
      const pdfBytes = await generateProxyPDF(items, settings);
      downloadPDF(pdfBytes, `proxymon-${totalCards}-cards.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-100">Proxy List</h2>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              className="h-8 text-slate-400 hover:text-red-400"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {totalCards} card{totalCards !== 1 ? 's' : ''} in list
        </p>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 -mx-2 px-2 py-4">
        {items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-slate-500">
            <FileDown className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">Your proxy list is empty</p>
            <p className="text-xs">Search and add cards to get started</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {items.map((item) => (
                  <SortableProxyItem
                    key={item.id}
                    item={item}
                    onRemove={removeItem}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </ScrollArea>

      <Separator className="bg-slate-800" />

      {/* Actions */}
      <div className="pt-4">
        <Button
          className="w-full bg-slate-100 text-slate-900 hover:bg-slate-200"
          size="lg"
          disabled={items.length === 0 || isGenerating}
          onClick={handleGeneratePDF}
        >
          {isGenerating ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <Printer className="mr-2 h-4 w-4" />
              Generate PDF
            </>
          )}
        </Button>
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Clear Proxy List</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to remove all {totalCards} card{totalCards !== 1 ? 's' : ''} from your list? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowClearDialog(false)}
              className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClear}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
