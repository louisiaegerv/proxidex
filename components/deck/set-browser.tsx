"use client"
import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react"
import { Search, ChevronDown, Check, X, Images, ChevronUp, ZoomIn } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { getCardImageUrl } from "@/lib/images"
import type { CardResult, SetInfo } from "@/lib/db"


export interface SetBrowserRef {
  getSelectedCards: () => Array<{ card: CardResult; quantity: number }>
  clearSelection: () => void
}

interface SetBrowserProps {
  onSelectionChange?: (count: number, totalQuantity: number) => void
}

export const SetBrowser = forwardRef<SetBrowserRef, SetBrowserProps>(
  function SetBrowser({ onSelectionChange }, ref) {
    const [sets, setSets] = useState<SetInfo[]>([])
    const [selectedSet, setSelectedSet] = useState<SetInfo | null>(null)
    const [cards, setCards] = useState<CardResult[]>([])
    const [previewCard, setPreviewCard] = useState<CardResult | null>(null)
    const [isLoadingSets, setIsLoadingSets] = useState(true)
    const [isLoadingCards, setIsLoadingCards] = useState(false)
    const [selectedCards, setSelectedCards] = useState<Map<string, number>>(new Map())
    const [searchQuery, setSearchQuery] = useState("")

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

    // Load cards when set is selected
    const loadCards = useCallback(async (setCode: string) => {
      if (!setCode) return
      setIsLoadingCards(true)
      try {
        const response = await fetch(`/api/cards/search?set=${encodeURIComponent(setCode)}`)
        if (!response.ok) throw new Error("Failed to load cards")
        const data = await response.json()
        setCards(data.cards || [])
      } catch (err) {
        console.error("Error loading cards:", err)
        setCards([])
      } finally {
        setIsLoadingCards(false)
      }
    }, [])

    const handleSetSelect = (setCode: string | null) => {
      if (!setCode) return
      const set = sets.find(s => s.code === setCode)
      if (!set) return
      setSelectedSet(set)
      setSelectedCards(new Map())
      loadCards(setCode)
    }

    const toggleCardSelection = (card: CardResult) => {
      const newSelected = new Map(selectedCards)
      if (newSelected.has(card.id)) {
        newSelected.delete(card.id)
      } else {
        newSelected.set(card.id, 1)
      }
      setSelectedCards(newSelected)
      notifySelectionChange(newSelected)
    }

    const updateQuantity = (cardId: string, delta: number) => {
      const newSelected = new Map(selectedCards)
      const current = newSelected.get(cardId) || 0
      const updated = Math.max(1, current + delta)
      newSelected.set(cardId, updated)
      setSelectedCards(newSelected)
      notifySelectionChange(newSelected)
    }

    const notifySelectionChange = (selected: Map<string, number>) => {
      const count = selected.size
      const total = Array.from(selected.values()).reduce((a, b) => a + b, 0)
      onSelectionChange?.(count, total)
    }

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      getSelectedCards: () => {
        const result: Array<{ card: CardResult; quantity: number }> = []
        selectedCards.forEach((quantity, cardId) => {
          const card = cards.find((c) => c.id === cardId)
          if (card) {
            result.push({ card, quantity })
          }
        })
        return result
      },
      clearSelection: () => {
        setSelectedCards(new Map())
        notifySelectionChange(new Map())
      }
    }))

    const filteredCards = searchQuery
      ? cards.filter(
          (card) =>
            card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            card.local_id.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : cards

    const selectedCount = selectedCards.size
    const totalQuantity = Array.from(selectedCards.values()).reduce((a, b) => a + b, 0)

    const selectedSetName = selectedSet?.name ?? null
    const [setFilter, setSetFilter] = useState("")
    const [setSelectorOpen, setSetSelectorOpen] = useState(true)

    const filteredSets = setFilter
      ? sets.filter(
          (set) =>
            set.name.toLowerCase().includes(setFilter.toLowerCase()) ||
            set.code.toLowerCase().includes(setFilter.toLowerCase())
        )
      : sets

    // Collapse set selector when a set is selected
    useEffect(() => {
      if (selectedSet) {
        setSetSelectorOpen(false)
      }
    }, [selectedSet])

    if (isLoadingSets) {
      return (
        <div className="flex h-64 items-center justify-center text-slate-500">
          Loading sets...
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col gap-4 md:flex-row">
        {/* Set Selector Panel - Collapsible on mobile, sidebar on desktop */}
        <div className="flex-shrink-0 md:w-72">
          {/* Accordion Header - Always visible */}
          <button
            onClick={() => setSetSelectorOpen(!setSelectorOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-left transition-colors hover:bg-slate-700"
          >
            <div>
              <span className="text-xs text-slate-500">Selected Set</span>
              <p className="font-medium text-slate-100">
                {selectedSet ? `${selectedSet.name} (${selectedSet.code})` : "Choose a set..."}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-slate-500 transition-transform",
                setSelectorOpen && "rotate-180"
              )}
            />
          </button>

          {/* Collapsible Set Selector Content */}
          {setSelectorOpen && (
            <div className="mt-2 space-y-2 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Filter sets (e.g., 'scarlet', 'sv')..."
                  value={setFilter}
                  onChange={(e) => setSetFilter(e.target.value)}
                  className="border-slate-700 bg-slate-900 pl-10 text-sm text-slate-100 placeholder:text-slate-600"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border border-slate-700 bg-slate-900">
                {filteredSets.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">No sets found</p>
                ) : (
                  filteredSets.map((set) => (
                    <button
                      key={set.code}
                      onClick={() => handleSetSelect(set.code)}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-slate-800",
                        selectedSet?.code === set.code
                          ? "bg-blue-500/10 text-blue-400"
                          : "text-slate-300"
                      )}
                    >
                      <span className="truncate">{set.name}</span>
                      <span className="ml-2 text-xs text-slate-500">{set.code}</span>
                    </button>
                  ))
                )}
              </div>
              <p className="text-xs text-slate-500">
                {filteredSets.length} of {sets.length} sets
              </p>
            </div>
          )}
        </div>

        {/* Cards Panel */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          {/* Card Filter - Always visible */}
          {selectedSet && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search cards in this set..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoadingCards}
                className="border-slate-700 bg-slate-800 pl-10 text-sm text-slate-100 placeholder:text-slate-600 disabled:opacity-50"
              />
            </div>
          )}

        {!selectedSet ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
            <Images className="h-12 w-12 opacity-50" />
            <p>Select a set to browse cards</p>
          </div>
        ) : isLoadingCards ? (
          <div className="flex h-64 items-center justify-center text-slate-500">
            Loading cards...
          </div>
        ) : (
          <>
            {/* Selected count */}
            {selectedCount > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-blue-500/10 px-3 py-2 text-sm">
                <span className="text-blue-400">
                  {selectedCount} card{selectedCount !== 1 ? "s" : ""} selected
                  {totalQuantity > selectedCount && ` (${totalQuantity} total)`}
                </span>
                <button
                  onClick={() => {
                    setSelectedCards(new Map())
                    notifySelectionChange(new Map())
                  }}
                  className="flex items-center text-xs text-slate-500 hover:text-slate-300"
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </button>
              </div>
            )}

            {/* Cards Grid */}
            <ScrollArea className=" rounded-lg border border-slate-800">
              <div id="cards-grid" className="grid grid-cols-3 gap-3 p-4 md:grid-cols-4">
                {filteredCards.map((card) => {
                  const isSelected = selectedCards.has(card.id)
                  const quantity = selectedCards.get(card.id) || 0
                  const imageUrl = getCardImageUrl(card, "md")

                  return (
                    <div
                      key={card.id}
                      className={`group relative rounded-lg transition-all ${
                        isSelected
                          ? "ring-2 ring-blue-500"
                          : "hover:ring-2 hover:ring-slate-600"
                      }`}
                    >
                      {/* Preview Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewCard(card)
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
                          #{card.local_id}
                        </p>
                      </div>

                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                          <Check className="h-4 w-4" />
                        </div>
                      )}

                      {/* Quantity controls */}
                      {isSelected && (
                        <div
                          className="absolute left-2 right-2 top-1/2 flex -translate-y-1/2 items-center justify-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => updateQuantity(card.id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/90 text-white hover:bg-slate-800"
                          >
                            -
                          </button>
                          <span className="flex h-8 min-w-8 px-2 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(card.id, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/90 text-white hover:bg-slate-800"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {filteredCards.length === 0 && (
                <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                  No cards found
                </div>
              )}
            </ScrollArea>
          </>
        )}

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
                    src={getCardImageUrl(previewCard, 'sm')}
                    alt={previewCard.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-100">
                    {previewCard.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {selectedSet?.name} #{previewCard.local_id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      toggleCardSelection(previewCard)
                      setPreviewCard(null)
                    }}
                    className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500"
                  >
                    {selectedCards.has(previewCard.id) ? 'Remove from Selection' : 'Add to Selection'}
                  </button>
                  <button
                    onClick={() => setPreviewCard(null)}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        </div> {/* Closes Cards Panel */}
      </div>  
    )         
  })            