'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { searchCards, getSets } from '@/lib/tcgdex';
import type { CardResume, SetResume } from '@tcgdex/sdk';

interface UseCardsOptions {
  debounceMs?: number;
}

export function useCards(options: UseCardsOptions = {}) {
  const { debounceMs = 300 } = options;
  
  const [query, setQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState<string>('');
  const [cards, setCards] = useState<CardResume[]>([]);
  const [sets, setSets] = useState<SetResume[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load sets on mount
  useEffect(() => {
    async function loadSets() {
      try {
        const fetchedSets = await getSets();
        setSets(fetchedSets);
      } catch (err) {
        console.error('Failed to load sets:', err);
      }
    }
    loadSets();
  }, []);

  // Search cards with debounce
  const search = useCallback(async () => {
    if (!query && !selectedSet) {
      setCards([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await searchCards(query, {
        setId: selectedSet || undefined,
      });
      setCards(results);
    } catch (err) {
      setError('Failed to search cards. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [query, selectedSet]);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      search();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, debounceMs]);

  return {
    query,
    setQuery,
    selectedSet,
    setSelectedSet,
    cards,
    sets,
    isLoading,
    error,
    search,
  };
}
