'use client';

import { useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useCards } from '@/hooks/use-cards';
import { useProxyList } from '@/stores/proxy-list';
import { getCard, getProcessedCardImage } from '@/lib/tcgdex';
import { CardResult } from './card-result';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export function CardSearch() {
  const { 
    query, 
    setQuery, 
    selectedSet, 
    setSelectedSet, 
    cards, 
    sets, 
    isLoading,
    error 
  } = useCards({ debounceMs: 300 });
  
  const addItem = useProxyList((state) => state.addItem);
  const [processingCardId, setProcessingCardId] = useState<string | null>(null);

  const handleAddCard = async (card: typeof cards[0]) => {
    setProcessingCardId(card.id);
    
    try {
      // Fetch full card details to get set information
      const fullCard = await getCard(card.id);
      if (fullCard) {
        // Process image to stretch corners (mandatory preprocessing)
        const processedImage = await getProcessedCardImage(card.image, 'high');
        
        addItem({
          cardId: card.id,
          name: card.name,
          image: processedImage,
          originalImage: card.image, // Store original TCGdex URL
          setName: fullCard.set?.name || 'Unknown Set',
          setId: fullCard.set?.id || '',
          localId: card.localId,
        });
      }
    } catch (err) {
      console.error('Error processing card:', err);
      // Fallback: add without processing if it fails
      const fullCard = await getCard(card.id);
      if (fullCard) {
        addItem({
          cardId: card.id,
          name: card.name,
          image: card.image,
          originalImage: card.image,
          setName: fullCard.set?.name || 'Unknown Set',
          setId: fullCard.set?.id || '',
          localId: card.localId,
        });
      }
    } finally {
      setProcessingCardId(null);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-4">
        <h2 className="text-xl font-semibold text-slate-100">Search Cards</h2>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search for cards..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-slate-700 bg-slate-900/50 pl-10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-600"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Set Filter */}
        <Select value={selectedSet} onValueChange={setSelectedSet}>
          <SelectTrigger className="border-slate-700 bg-slate-900/50 text-slate-100">
            <SelectValue placeholder="Filter by set..." />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-900">
            <SelectItem value="all" className="text-slate-100 focus:bg-slate-800 focus:text-slate-100">
              All Sets
            </SelectItem>
            {sets.map((set) => (
              <SelectItem 
                key={set.id} 
                value={set.id}
                className="text-slate-100 focus:bg-slate-800 focus:text-slate-100"
              >
                {set.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active Filters */}
        {(query || selectedSet) && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>
              {isLoading ? 'Searching...' : `${cards.length} results found`}
            </span>
          </div>
        )}
      </div>

      {/* Results Grid */}
      <ScrollArea className="flex-1 -mx-2 px-2">
        {error ? (
          <div className="flex h-40 items-center justify-center text-red-400">
            {error}
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[63/88] rounded-lg bg-slate-800" />
            ))}
          </div>
        ) : cards.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3">
            {cards.map((card) => (
              <CardResult
                key={card.id}
                card={card}
                onAdd={() => handleAddCard(card)}
                isProcessing={processingCardId === card.id}
              />
            ))}
          </div>
        ) : query ? (
          <div className="flex h-40 flex-col items-center justify-center text-slate-500">
            <Search className="mb-2 h-8 w-8 opacity-50" />
            <p>No cards found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        ) : (
          <div className="flex h-40 flex-col items-center justify-center text-slate-500">
            <Search className="mb-2 h-8 w-8 opacity-50" />
            <p>Start typing to search for cards</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
