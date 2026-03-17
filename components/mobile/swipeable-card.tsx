'use client';

import { useState, useRef, useCallback } from 'react';
import { Trash2, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProxyItem } from '@/types';

interface SwipeableCardProps {
  item: ProxyItem;
  onDelete: () => void;
  onEdit?: () => void;
  renderContent: () => React.ReactNode;
}

// Swipe thresholds
const SWIPE_THRESHOLD = 80; // pixels to trigger action
const MAX_SWIPE = 120; // maximum pixels to reveal

export function SwipeableCard({
  item,
  onDelete,
  onEdit,
  renderContent,
}: SwipeableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const currentOffset = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchStartX.current = clientX;
    currentOffset.current = swipeOffset;
    setIsDragging(true);
  }, [swipeOffset]);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - touchStartX.current;
    
    // Calculate new offset with resistance
    let newOffset = currentOffset.current + deltaX;
    
    // Apply resistance when pulling beyond limits
    if (newOffset > 0) {
      newOffset = Math.min(newOffset * 0.3, MAX_SWIPE);
    } else if (newOffset < 0) {
      newOffset = Math.max(newOffset * 0.3, -MAX_SWIPE);
    }
    
    setSwipeOffset(newOffset);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    
    // Snap to threshold or back to 0
    if (swipeOffset > SWIPE_THRESHOLD) {
      // Swiped right - show edit action if available
      if (onEdit) {
        setSwipeOffset(MAX_SWIPE * 0.6);
      } else {
        setSwipeOffset(0);
      }
    } else if (swipeOffset < -SWIPE_THRESHOLD) {
      // Swiped left - show delete action
      setSwipeOffset(-MAX_SWIPE * 0.6);
    } else {
      // Snap back
      setSwipeOffset(0);
    }
  }, [swipeOffset, onEdit]);

  const handleDeleteClick = () => {
    onDelete();
    setSwipeOffset(0);
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit();
    }
    setSwipeOffset(0);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background Actions */}
      <div className="absolute inset-0 flex">
        {/* Edit Action (Left Side - Revealed on right swipe) */}
        {onEdit && (
          <button
            onClick={handleEditClick}
            className={cn(
              'flex w-1/2 items-center justify-start pl-4 transition-colors',
              swipeOffset > 0 ? 'bg-blue-600' : 'bg-slate-800'
            )}
            style={{ opacity: Math.max(0, swipeOffset / SWIPE_THRESHOLD) }}
          >
            <div className="flex items-center gap-2 text-white">
              <Edit3 className="h-5 w-5" />
              <span className="text-sm font-medium">Edit</span>
            </div>
          </button>
        )}
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Delete Action (Right Side - Revealed on left swipe) */}
        <button
          onClick={handleDeleteClick}
          className={cn(
            'flex w-1/2 items-center justify-end pr-4 transition-colors',
            swipeOffset < 0 ? 'bg-red-600' : 'bg-slate-800'
          )}
          style={{ opacity: Math.max(0, -swipeOffset / SWIPE_THRESHOLD) }}
        >
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm font-medium">Delete</span>
            <Trash2 className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* Card Content */}
      <div
        className={cn(
          'relative transition-transform duration-200 ease-out',
          isDragging ? 'duration-0' : ''
        )}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {renderContent()}
      </div>
    </div>
  );
}
