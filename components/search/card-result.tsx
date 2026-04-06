'use client';

import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCardImageUrl } from '@/lib/images';

// Local card result from our database
interface LocalCardResult {
  id: string;
  name: string;
  set_code: string;
  set_name: string;
  local_id: string;
  folder_name: string;
  variants: string;
  sizes: string;
}

interface CardResultProps {
  card: LocalCardResult;
  onAdd: () => void;
  isProcessing?: boolean;
}

export function CardResult({ card, onAdd, isProcessing }: CardResultProps) {
  // Use local image URL (sm size for thumbnails)
  const imageUrl = getCardImageUrl(card, 'sm');

  return (
    <div className="group relative flex flex-col gap-2">
      {/* Card Image */}
      <div className="relative aspect-[63/88] overflow-hidden rounded-lg bg-slate-800 shadow-sm transition-all group-hover:shadow-md">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={card.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-600">
            <span className="text-xs">No Image</span>
          </div>
        )}
        
        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
              <span className="text-xs text-white">Processing...</span>
            </div>
          </div>
        )}
        
        {/* Hover Overlay */}
        {!isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              className="scale-90 bg-white text-slate-900 opacity-0 transition-all hover:bg-slate-100 group-hover:scale-100 group-hover:opacity-100"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="space-y-0.5">
        <p className="truncate text-sm font-medium text-slate-200" title={card.name}>
          {card.name}
        </p>
        <p className="truncate text-xs text-slate-500">
          {card.set_name} ({card.set_code}) #{card.local_id}
        </p>
      </div>
    </div>
  );
}
