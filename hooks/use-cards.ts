'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAllSets, type SetInfo } from '@/lib/db';

// Local card result from our database
interface LocalCard {
  id: string;
  name: string;
  set_code: string;
  set_name: string;
  local_id: string;
  folder_name: string;
  variants: string;
  sizes: string;
}

interface UseCardsOptions {
  debounceMs?: number;
}

export function useCards(options: UseCardsOptions = {}) {
  const { debounceMs = 300 } = options;
  
  const [query, setQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState<string>('');
  const [cards, setCards] = useState<LocalCard[]>([]);
  const [sets, setSets] = useState<SetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load sets on mount
  useEffect(() => {
    async function loadSets() {
      try {
        const fetchedSets = await getAllSets();
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
      // Build search URL
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (selectedSet) params.set('set', selectedSet);
      params.set('limit', '50');
      
      const response = await fetch(`/api/cards/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setCards(data.cards || []);
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
