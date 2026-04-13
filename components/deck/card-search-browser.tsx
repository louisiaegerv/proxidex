"use client"

import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from "react"
import { Search, Check, X, Images, ZoomIn, Filter, Plus, Trash2, Minus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { getCardImageUrl } from "@/lib/images"
import type { CardResult, SetInfo } from "@/lib/db"

export interface CardSearchBrowserRef {
  getSelectedCards: () => Array<{ card: CardResult; quantity: number }>
  clearSelection: () => void
}

type SearchMode = "contains" | "exact"

interface CardSearchBrowserProps {
  onSelectionChange?: (totalQuantity: number) => void
}

export const CardSearchBrowser = forwardRef<CardSearchBrowserRef, CardSearchBrowserProps>(
  function CardSearchBrowser({ onSelectionChange }, ref) {
    // Search state
    const [searchQuery, setSearchQuery] = useState("")
    const [searchMode, setSearchMode] = useState<SearchMode>("contains")
    const [selectedSet, setSelectedSet] = useState<string>("")
    const [searchResults, setSearchResults] = useState<CardResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    
    // Selection state - track quantities per card
    const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
    const [cardQuantities, setCardQuantities] = useState<Map<string, number>>(new Map())
    
    // Sets for filter dropdown
    const [sets, setSets] = useState<SetInfo[]>([])
    const [isLoadingSets, setIsLoadingSets] = useState(true)
    const [setFilter, setSetFilter] = useState("")
    const [showSetFilter, setShowSetFilter] = useState(false)
    
    // Preview modal
    const [previewCard, setPreviewCard] = useState<CardResult | null>(null)
    const [previewQuantity, setPreviewQuantity] = useState(1)

    // Pagination state for infinite scroll (cursor-based)
    const [cursor, setCursor] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [total, setTotal] = useState(0)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const scrollViewportRef = useRef<HTMLDivElement>(null)

    // Load sets on mount
    useEffect(() => {
      async function loadSets() {
        try {
          const response = await fetch("/api/sets")
          if (!response.ok) throw new Error("Failed to load sets")
          const data = await response.json()
          setSets(data.sets || [])
        } catch (err) {
          console.error("Error loading sets:", err)
        } finally {
          setIsLoadingSets(false)
        }
      }
      loadSets()
    }, [])

    // Perform search
    const performSearch = useCallback(async (reset = true) => {
      setIsSearching(true)
      setHasSearched(true)
      
      // Reset pagination on new search
      if (reset) {
        setCursor(null)
        setSearchResults([])
      }
      
      try {
        let cards: CardResult[] = []
        
        // If only set selected, get paginated cards in set (uses offset for set-only)
        if (!searchQuery.trim() && selectedSet) {
          console.log('[SetSearch] Fetching set-only:', selectedSet)
          const response = await fetch(
            `/api/cards/search?set=${encodeURIComponent(selectedSet)}&limit=30`
          )
          console.log('[SetSearch] Response status:', response.status)
          if (response.ok) {
            const data = await response.json()
            console.log('[SetSearch] Got', data.cards?.length || 0, 'cards')
            cards = data.cards || []
            setHasMore(data.hasMore || false)
            setTotal(data.total || 0)
            // Set-only uses offset, not cursor
            setCursor(null)
          }
        } 
        // If search query provided
        else if (searchQuery.trim()) {
          let query = searchQuery
          
          // Perform search with cursor-based pagination
          const response = await fetch(
            `/api/cards/search?q=${encodeURIComponent(query)}${selectedSet ? `&set=${selectedSet}` : ''}&limit=30`
          )
          if (response.ok) {
            const data = await response.json()
            cards = data.cards || []
            setTotal(data.total || 0)
            setHasMore(data.hasMore || false)
            setCursor(data.cursor || null)
            
            // For exact match, filter to cards that match exactly (case-insensitive)
            if (searchMode === "exact") {
              const lowerQuery = searchQuery.toLowerCase()
              cards = cards.filter(c => c.name.toLowerCase() === lowerQuery)
            }
          }
        }
        
        setSearchResults(prev => reset ? cards : [...prev, ...cards])
      } catch (err) {
        console.error("Search error:", err)
        if (reset) setSearchResults([])
      } finally {
        setIsSearching(false)
        setIsLoadingMore(false)
      }
    }, [searchQuery, searchMode, selectedSet])

    // Auto-search when set filter changes (if there's a query or set is selected)
    useEffect(() => {
      // Only trigger if a set is selected and we haven't just cleared it
      if (selectedSet) {
        console.log('[SetSearch] selectedSet changed:', selectedSet, 'searchQuery:', searchQuery)
        performSearch(true) // Reset on new set selection
      }
    }, [selectedSet])

    // Load more cards for infinite scroll
    const loadMore = useCallback(async () => {
      if (isLoadingMore || !hasMore) return
      
      setIsLoadingMore(true)
      
      try {
        let url: string
        if (searchQuery.trim()) {
          // Load more for text search using cursor
          url = `/api/cards/search?q=${encodeURIComponent(searchQuery)}${selectedSet ? `&set=${selectedSet}` : ''}&limit=30${cursor ? `&cursor=${cursor}` : ''}&total=${total}`
        } else {
          // Load more for set-only (uses offset via the API's internal handling)
          // Set-only queries don't use cursor, they use offset based on current results
          const currentOffset = searchResults.length
          url = `/api/cards/search?set=${encodeURIComponent(selectedSet)}&limit=30&offset=${currentOffset}`
        }
        
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          const newCards = data.cards || []
          
          // Deduplicate by card ID to prevent React key errors
          setSearchResults(prev => {
            const existingIds = new Set(prev.map(c => c.id))
            const uniqueNewCards = newCards.filter((c: CardResult) => !existingIds.has(c.id))
            return [...prev, ...uniqueNewCards]
          })
          
          setHasMore(data.hasMore || false)
          setCursor(data.cursor || null)
          
          // Apply exact match filter if needed
          if (searchQuery.trim() && searchMode === "exact") {
            const lowerQuery = searchQuery.toLowerCase()
            const filteredNewCards = newCards.filter((c: CardResult) => c.name.toLowerCase() === lowerQuery)
            if (filteredNewCards.length !== newCards.length) {
              setSearchResults(prev => [
                ...prev.slice(0, prev.length - newCards.length),
                ...filteredNewCards
              ])
            }
          }
        }
      } catch (err) {
        console.error("Load more error:", err)
      } finally {
        setIsLoadingMore(false)
      }
    }, [isLoadingMore, hasMore, cursor, selectedSet, searchQuery, searchMode, total, searchResults.length])

    // Infinite scroll - attach scroll listener to ScrollArea viewport
    useEffect(() => {
      const viewport = scrollViewportRef.current
      if (!viewport) return

      const handleScroll = () => {
        if (!hasMore || isLoadingMore) return
        
        const scrollHeight = viewport.scrollHeight
        const scrollTop = viewport.scrollTop
        const clientHeight = viewport.clientHeight
        
        // Load more when within 400px of bottom
        if (scrollHeight - scrollTop - clientHeight < 400) {
          loadMore()
        }
      }

      viewport.addEventListener('scroll', handleScroll)
      return () => viewport.removeEventListener('scroll', handleScroll)
    }, [hasMore, isLoadingMore, searchQuery, loadMore])

    // Search on enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        performSearch()
      }
    }

    // Set card selection with quantity (quantity 0 removes)
    const setCardSelection = (card: CardResult, quantity: number = 1) => {
      const newSelected = new Set(selectedCards)
      const newQuantities = new Map(cardQuantities)
      
      if (quantity === 0) {
        // Remove card and its quantity
        newSelected.delete(card.id)
        newQuantities.delete(card.id)
      } else {
        // Add or update card with quantity
        newSelected.add(card.id)
        newQuantities.set(card.id, quantity)
      }
      
      setSelectedCards(newSelected)
      setCardQuantities(newQuantities)
      const totalQuantity = Array.from(newQuantities.values()).reduce((sum, qty) => sum + qty, 0)
      onSelectionChange?.(totalQuantity)
    }

    // Toggle card selection (simple add/remove with quantity 1)
    const toggleCardSelection = (card: CardResult) => {
      if (selectedCards.has(card.id)) {
        setCardSelection(card, 0)
      } else {
        setCardSelection(card, 1)
      }
    }

    // Select all visible/loaded results
    const selectAll = () => {
      const newSelected = new Set(selectedCards)
      const newQuantities = new Map(cardQuantities)
      
      searchResults.forEach(card => {
        if (!newSelected.has(card.id)) {
          newSelected.add(card.id)
          newQuantities.set(card.id, 1)
        }
      })
      
      setSelectedCards(newSelected)
      setCardQuantities(newQuantities)
      const totalQuantity = Array.from(newQuantities.values()).reduce((sum, qty) => sum + qty, 0)
      onSelectionChange?.(totalQuantity)
    }

    // Select all matching results (load all then select) - for collectors
    const selectAllMatching = async () => {
      if (!hasMore) {
        // Already all loaded, just select
        selectAll()
        return
      }
      
      setIsLoadingMore(true)
      
      try {
        let allCards: CardResult[] = [...searchResults]
        let currentCursor = cursor
        const batchSize = 50
        
        // Load all remaining results using cursor pagination
        while (true) {
          let url: string
          if (searchQuery.trim()) {
            // Text search uses cursor
            url = `/api/cards/search?q=${encodeURIComponent(searchQuery)}${selectedSet ? `&set=${selectedSet}` : ''}&limit=${batchSize}${currentCursor ? `&cursor=${currentCursor}` : ''}&total=${total}`
          } else {
            // Set-only uses offset
            const currentOffset = allCards.length
            url = `/api/cards/search?set=${encodeURIComponent(selectedSet)}&limit=${batchSize}&offset=${currentOffset}`
          }
          
          const response = await fetch(url)
          if (!response.ok) break
          
          const data = await response.json()
          const newCards = data.cards || []
          
          if (newCards.length === 0) break
          
          allCards = [...allCards, ...newCards]
          currentCursor = data.cursor || null
          
          // Update progress in UI
          setSearchResults(allCards)
          
          if (!data.hasMore) break
        }
        
        // Now select all loaded cards
        const newSelected = new Set(selectedCards)
        const newQuantities = new Map(cardQuantities)
        
        allCards.forEach(card => {
          if (!newSelected.has(card.id)) {
            newSelected.add(card.id)
            newQuantities.set(card.id, 1)
          }
        })
        
        setSelectedCards(newSelected)
        setCardQuantities(newQuantities)
        setHasMore(false)
        const totalQuantity = Array.from(newQuantities.values()).reduce((sum, qty) => sum + qty, 0)
        onSelectionChange?.(totalQuantity)
        
      } catch (err) {
        console.error("Select all matching error:", err)
      } finally {
        setIsLoadingMore(false)
      }
    }

    // Clear selection
    const clearSelection = () => {
      setSelectedCards(new Set())
      setCardQuantities(new Map())
      onSelectionChange?.(0)
    }

    // Remove selected cards
    const removeSelected = () => {
      setSelectedCards(new Set())
      setCardQuantities(new Map())
      setSearchResults([])
      setHasSearched(false)
      setSearchQuery("")
      setSelectedSet("")
      onSelectionChange?.(0)
    }

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      getSelectedCards: () => {
        return searchResults
          .filter(card => selectedCards.has(card.id))
          .map(card => ({
            card,
            quantity: cardQuantities.get(card.id) || 1
          }))
      },
      clearSelection: () => {
        setSelectedCards(new Set())
        setCardQuantities(new Map())
        onSelectionChange?.(0)
      }
    }))

    const filteredSets = setFilter
      ? sets.filter(
          (set) =>
            set.name.toLowerCase().includes(setFilter.toLowerCase()) ||
            set.code.toLowerCase().includes(setFilter.toLowerCase())
        )
      : sets

    const selectedCount = selectedCards.size
    const allResultsSelected = searchResults.length > 0 && searchResults.every(c => selectedCards.has(c.id))

    if (isLoadingSets) {
      return (
        <div className="flex h-64 items-center justify-center text-slate-500">
          Loading...
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col gap-4">
        {/* Search Controls */}
        <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          {/* Search Input Row - Always single row */}
          <div className="flex gap-2">
            {/* Search Input */}
            <Input
              placeholder="Search card name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 border-slate-700 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-600"
            />
            <Button
              onClick={() => performSearch(true)}
              disabled={isSearching || (!searchQuery.trim() && !selectedSet)}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
            >
              {isSearching ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Mode Toggle */}
            <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1">
              <button
                onClick={() => setSearchMode("contains")}
                className={cn(
                  "px-3 py-1 text-xs font-medium transition-colors rounded",
                  searchMode === "contains"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Contains
              </button>
              <button
                onClick={() => setSearchMode("exact")}
                className={cn(
                  "px-3 py-1 text-xs font-medium transition-colors rounded",
                  searchMode === "exact"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Exact
              </button>
            </div>

            {/* Set Filter Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSetFilter(!showSetFilter)}
              className={cn(
                "gap-1 border-slate-700 bg-slate-900 text-xs whitespace-nowrap",
                selectedSet && "border-blue-500 text-blue-400",
                showSetFilter && "bg-slate-800"
              )}
            >
              {selectedSet 
                ? sets.find(s => s.code === selectedSet)?.code || "Set"
                : "Set"
              }
              <Filter className="ml-1 h-3 w-3" />
            </Button>

            {/* Clear Filters */}
            {(selectedSet || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedSet("")
                  setSearchQuery("")
                  setSearchResults([])
                  setHasSearched(false)
                }}
                className="text-xs text-slate-500 hover:text-slate-300 whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>

          {/* Set Selector Dropdown */}
          {showSetFilter && (
            <div className="space-y-2 rounded-md border border-slate-700 bg-slate-900 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Filter sets..."
                  value={setFilter}
                  onChange={(e) => setSetFilter(e.target.value)}
                  className="border-slate-700 bg-slate-800 pl-10 text-sm text-slate-100 placeholder:text-slate-600"
                  autoFocus
                />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {/* All Sets option */}
                <button
                  onClick={() => {
                    setSelectedSet("")
                    setShowSetFilter(false)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-slate-800 rounded",
                    !selectedSet ? "bg-blue-500/10 text-blue-400" : "text-slate-300"
                  )}
                >
                  <span>All Sets</span>
                  {!selectedSet && <Check className="h-4 w-4" />}
                </button>
                {filteredSets.map((set) => (
                  <button
                    key={set.code}
                    onClick={() => {
                      setSelectedSet(set.code)
                      setShowSetFilter(false)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-slate-800 rounded",
                      selectedSet === set.code
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-slate-300"
                    )}
                  >
                    <span className="truncate">{set.name}</span>
                    <span className="ml-2 text-xs text-slate-500">{set.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Tips */}
          {!hasSearched && (
            <div className="text-lg text-slate-500">
              <p>Search tips:</p>
              <ul className="mt-1 ml-4 list-disc space-y-0.5">
                <li>Enter a card name and click search</li>
                <li>Use "Exact" for exact name matches</li>
                <li>Use "Set" filter without card name to see all cards in a set</li>
                <li>Combine name + set filter for precise results</li>
              </ul>
            </div>
          )}
        </div>

        {/* Selection Status Bar */}
        {/* {selectedCount > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-blue-500/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-400">
                {selectedCount} card{selectedCount !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
              <button
                onClick={removeSelected}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          </div>
        )} */}

        {/* Search Results */}
        {hasSearched && (
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-800/30">
            {/* Results Header */}
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
              <div className="text-sm text-slate-300">
                {isSearching ? (
                  "Searching..."
                ) : (
                  <>
                    <span className="font-semibold text-white">{searchResults.length}</span>
                    {total > searchResults.length && (
                      <span className="text-slate-500">/{total}</span>
                    )}
                    {" "}result{searchResults.length !== 1 ? "s" : ""}
                    {selectedSet && (
                      <span className="ml-1 text-slate-500">
                        in {sets.find(s => s.code === selectedSet)?.name}
                      </span>
                    )}
                  </>
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="flex items-center gap-2">
                  {selectedCards.size === 0 ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAll}
                        className="h-8 gap-1 text-xs text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                        title={hasMore ? `Select ${searchResults.length} loaded cards` : `Select all ${searchResults.length} cards`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Select {searchResults.length > 20 ? `${searchResults.length}` : 'All'}
                      </Button>
                      {hasMore && total > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={selectAllMatching}
                          disabled={isLoadingMore}
                          className="h-8 gap-1 text-xs text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                          title={`Load and select all ${total} matching cards (for collectors)`}
                        >
                          {isLoadingMore ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                          ) : (
                            <Images className="h-3.5 w-3.5" />
                          )}
                          Select All {total}
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-400">{selectedCards.size} selected</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSelection}
                        className="h-8 gap-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                        title="Clear all selections"
                      >
                        <X className="h-3.5 w-3.5" />
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Results Grid */}
            {searchResults.length > 0 ? (
              <ScrollArea 
                className="flex-1"
                ref={(el) => {
                  // Find the viewport element within ScrollArea for infinite scroll
                  if (el) {
                    const viewport = el.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement
                    if (viewport && viewport !== scrollViewportRef.current) {
                      scrollViewportRef.current = viewport
                    }
                  }
                }}
              >
                <div className="grid grid-cols-3 gap-3 p-4 md:grid-cols-4 lg:grid-cols-5">
                  {searchResults.map((card) => {
                    const isSelected = selectedCards.has(card.id)
                    const imageUrl = getCardImageUrl(card, "md")

                    return (
                      <div
                        key={card.id}
                        className={cn(
                          "group relative rounded-lg transition-all",
                          isSelected
                            ? "ring-2 ring-blue-500"
                            : "hover:ring-2 hover:ring-slate-600"
                        )}
                      >
                        {/* Preview Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewCard(card)
                            // Set quantity to current selection or 1
                            setPreviewQuantity(cardQuantities.get(card.id) || 1)
                          }}
                          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/80 text-white opacity-0 transition-opacity hover:bg-slate-800 group-hover:opacity-100"
                          title="Preview card"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </button>

                        {/* Card Image - Click to select */}
                        <div
                          onClick={() => toggleCardSelection(card)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggleCardSelection(card)
                            }
                          }}
                          className="aspect-[63/88] cursor-pointer overflow-hidden rounded-lg bg-slate-800"
                        >
                          <img
                            src={imageUrl}
                            alt={card.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        {/* Card info overlay */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="truncate text-[10px] font-medium text-white">
                            {card.name}
                          </p>
                          <p className="text-[9px] text-slate-300">
                            {card.set_code} #{card.local_id}
                          </p>
                        </div>

                        {/* Selection indicator - Top left */}
                        {isSelected && (
                          <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                            <Check className="h-4 w-4" />
                          </div>
                        )}

                        {/* Quantity Controls Overlay - Center of card when selected */}
                        {isSelected && (
                          <div 
                            className="absolute inset-0 flex items-center justify-center bg-black/40"
                            onClick={(e) => {
                              // Clicking the overlay (not controls) removes the card
                              setCardSelection(card, 0)
                            }}
                          >
                            <div 
                              className="flex items-center gap-2 rounded-lg bg-slate-900/90 p-2"
                              onClick={(e) => e.stopPropagation()} // Prevent overlay click when clicking controls
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const currentQty = cardQuantities.get(card.id) || 1
                                  const newQty = Math.max(1, currentQty - 1)
                                  setCardSelection(card, newQty)
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="min-w-[2rem] text-center text-lg font-bold text-white">
                                {cardQuantities.get(card.id) || 1}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const currentQty = cardQuantities.get(card.id) || 1
                                  setCardSelection(card, currentQty + 1)
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-500"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCardSelection(card, 0)
                                }}
                                className="ml-1 flex h-8 w-8 items-center justify-center rounded bg-red-900/70 text-red-300 hover:bg-red-900/90"
                                title="Remove card"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                {/* Load more indicator & button */}
                {hasMore && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="text-xs text-slate-500">
                      Showing {searchResults.length} of {total} cards
                    </div>
                    {isLoadingMore ? (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                        Loading...
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMore}
                        className="border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
                      >
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>
            ) : !isSearching ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
                <Search className="h-12 w-12 opacity-50" />
                <p>No cards found</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Initial State */}
        {/* {!hasSearched && (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
            <Search className="h-16 w-16 opacity-30" />
            <p className="text-lg font-medium">Search for Cards</p>
            <p className="text-center text-sm max-w-sm">
              Enter a card name above and click search to find cards.
              Use set filters to narrow down results.
            </p>
          </div>
        )} */}

        {/* Card Preview Modal */}
        <Dialog open={!!previewCard} onOpenChange={() => setPreviewCard(null)}>
          <DialogContent className="max-w-md border-slate-800 bg-slate-900 p-0">
            <DialogTitle className="sr-only">
              {previewCard?.name || 'Card Preview'}
            </DialogTitle>
            {previewCard && (
              <div className="flex flex-col gap-4 p-4">
                <div className="aspect-[63/88] overflow-hidden rounded-lg">
                  <img
                    src={getCardImageUrl(previewCard, 'md')}
                    alt={previewCard.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-100">
                    {previewCard.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {previewCard.set_name} #{previewCard.local_id}
                  </p>
                </div>
                
                {/* Quantity Controls with Trash Reset */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPreviewQuantity(Math.max(0, previewQuantity - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className={cn(
                    "min-w-[3rem] text-center text-lg font-semibold",
                    previewQuantity > 0 ? "text-blue-400" : "text-slate-500"
                  )}>
                    {previewQuantity}
                  </span>
                  <button
                    onClick={() => setPreviewQuantity(previewQuantity + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {previewQuantity > 0 && (
                    <button
                      onClick={() => setPreviewQuantity(0)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900/70"
                      title="Reset quantity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Done Button */}
                <button
                  onClick={() => {
                    // Apply the quantity selection
                    if (previewQuantity > 0) {
                      setCardSelection(previewCard, previewQuantity)
                    } else if (selectedCards.has(previewCard.id)) {
                      // Remove if quantity is 0 and card was selected
                      setCardSelection(previewCard, 0)
                    }
                    setPreviewCard(null)
                  }}
                  className="w-full rounded-lg bg-slate-700 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600"
                >
                  Done
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }
)
