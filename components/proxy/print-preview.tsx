'use client';

import { Eye } from 'lucide-react';
import { useProxyList } from '@/stores/proxy-list';
import { getFullImageUrl } from '@/lib/tcgdex';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PAGE_DIMENSIONS } from '@/types';

// mm to pixels for preview (at 96 DPI, 1mm ≈ 3.78px)
const MM_TO_PX = 3.78;

export function PrintPreview() {
  const { items, getTotalCards, settings } = useProxyList();
  
  const totalCards = getTotalCards();
  const cardsPerPage = settings.cardsPerRow * settings.rowsPerPage;
  const totalPages = Math.ceil(totalCards / cardsPerPage);
  
  // Calculate actual dimensions in mm
  const cardWidth = settings.cardWidth + settings.bleed * 2;
  const cardHeight = settings.cardHeight + settings.bleed * 2;
  
  // Calculate grid size in mm
  const gridWidthMm = settings.cardsPerRow * cardWidth + (settings.cardsPerRow - 1) * settings.gap;
  const gridHeightMm = settings.rowsPerPage * cardHeight + (settings.rowsPerPage - 1) * settings.gap;
  
  // Page dimensions in mm
  const pageDims = PAGE_DIMENSIONS[settings.pageSize];
  
  // Calculate margins to center the grid
  const marginXMm = (pageDims.width - gridWidthMm) / 2;
  const marginYMm = (pageDims.height - gridHeightMm) / 2;
  
  // Scale to fit preview (max 500px width)
  const maxPreviewWidth = 500;
  const scale = Math.min(maxPreviewWidth / pageDims.width, 600 / pageDims.height);
  
  const previewWidth = pageDims.width * scale * MM_TO_PX;
  const previewHeight = pageDims.height * scale * MM_TO_PX;
  const previewMarginX = marginXMm * scale * MM_TO_PX;
  const previewMarginY = marginYMm * scale * MM_TO_PX;
  const previewCardWidth = cardWidth * scale * MM_TO_PX;
  const previewCardHeight = cardHeight * scale * MM_TO_PX;
  const previewGap = settings.gap * scale * MM_TO_PX;
  
  // Generate preview cards (first page only)
  const previewCards = [];
  let cardCount = 0;
  for (const item of items) {
    for (let i = 0; i < item.quantity && cardCount < cardsPerPage; i++) {
      previewCards.push(item);
      cardCount++;
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={items.length === 0}
          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        >
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl border-slate-800 bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Print Preview</DialogTitle>
          <DialogDescription className="text-slate-500">
            {totalCards} cards across {totalPages} page{totalPages !== 1 ? 's' : ''} · 
            Actual card size: {settings.cardWidth}×{settings.cardHeight}mm
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 flex justify-center overflow-auto py-4">
          <div
            className="relative bg-white shadow-lg"
            style={{
              width: previewWidth,
              height: previewHeight,
              minWidth: previewWidth,
              minHeight: previewHeight,
            }}
          >
            {/* Cut lines - positioned at card boundaries */}
            {settings.showCutLines && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={previewWidth}
                height={previewHeight}
              >
                {/* Horizontal cut lines */}
                {Array.from({ length: settings.rowsPerPage + 1 }).map((_, i) => {
                  const y = previewMarginY + i * (previewCardHeight + previewGap);
                  return (
                    <line
                      key={`h-${i}`}
                      x1={previewMarginX - 8}
                      y1={y}
                      x2={previewMarginX + gridWidthMm * scale * MM_TO_PX + 8}
                      y2={y}
                      stroke="#000"
                      strokeWidth={0.5}
                      strokeDasharray="4 2"
                    />
                  );
                })}
                {/* Vertical cut lines */}
                {Array.from({ length: settings.cardsPerRow + 1 }).map((_, i) => {
                  const x = previewMarginX + i * (previewCardWidth + previewGap);
                  return (
                    <line
                      key={`v-${i}`}
                      x1={x}
                      y1={previewMarginY - 8}
                      x2={x}
                      y2={previewMarginY + gridHeightMm * scale * MM_TO_PX + 8}
                      stroke="#000"
                      strokeWidth={0.5}
                      strokeDasharray="4 2"
                    />
                  );
                })}
              </svg>
            )}
            
            {/* Cards positioned at actual size */}
            {previewCards.map((card, index) => {
              const row = Math.floor(index / settings.cardsPerRow);
              const col = index % settings.cardsPerRow;
              const x = previewMarginX + col * (previewCardWidth + previewGap);
              const y = previewMarginY + row * (previewCardHeight + previewGap);
              const previewImageUrl = getFullImageUrl(card.image, 'low', 'webp');
              
              return (
                <div
                  key={`${card.id}-${index}`}
                  className="absolute overflow-hidden bg-slate-200"
                  style={{
                    left: x,
                    top: y,
                    width: previewCardWidth,
                    height: previewCardHeight,
                  }}
                >
                  {previewImageUrl ? (
                    <img
                      src={previewImageUrl}
                      alt={card.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                      {card.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="text-center text-sm text-slate-500">
          Page: {settings.pageSize.toUpperCase()} ({pageDims.width}×{pageDims.height}mm) · 
          Card: {settings.cardWidth}×{settings.cardHeight}mm · 
          Grid: {settings.cardsPerRow}×{settings.rowsPerPage} · 
          Gap: {settings.gap}mm · 
          Bleed: {settings.bleed}mm
        </div>
      </DialogContent>
    </Dialog>
  );
}
