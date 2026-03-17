"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Trophy,
  TrendingUp,
  Users,
  Loader2,
  RefreshCw,
  Search,
  AlertCircle,
  ArrowRight,
  Check,
} from "lucide-react"
import {
  fetchMetaDecks,
  fetchDeckDetail,
  convertToDeckList,
  clearDeckCache,
  type LimitlessDeck,
} from "@/lib/limitless"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useProxyList } from "@/stores/proxy-list"
import { LoadConfirmDialog } from "./load-confirm-dialog"

interface MetaDeckSelectorProps {
  onPopulateText: (text: string, source: string) => void
}

export function MetaDeckSelector({ onPopulateText }: MetaDeckSelectorProps) {
  const [decks, setDecks] = useState<LimitlessDeck[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingDeck, setIsFetchingDeck] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"winRate" | "share" | "count">("winRate")
  const [status, setStatus] = useState<string>("")
  const [pendingDeck, setPendingDeck] = useState<LimitlessDeck | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
  const existingCards = useProxyList((state) => state.items)
  const clearList = useProxyList((state) => state.clearList)
  const totalExistingCards = existingCards.reduce((sum, item) => sum + item.quantity, 0)

  const loadDecks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Clear cache to ensure we get fresh data with sprites
      clearDeckCache()
      const data = await fetchMetaDecks("tcg", 50)
      if (data.length === 0) {
        setError("No decks found. The data source may be unavailable.")
      } else {
        setDecks(data)
      }
    } catch (err) {
      console.error("[Meta Decks] Error loading decks:", err)
      setError(
        `Failed to load meta decks: ${err instanceof Error ? err.message : "Unknown error"}`
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDecks()
  }, [loadDecks])

  const processDeckLoad = async (deck: LimitlessDeck, shouldClear: boolean) => {
    setIsFetchingDeck(deck.id)
    setStatus(`Loading ${deck.name}...`)

    try {
      // Fetch detailed deck information
      const detail = await fetchDeckDetail(deck.id)

      if (!detail || !detail.cards || detail.cards.length === 0) {
        setStatus("No card data available for this deck")
        setTimeout(() => setStatus(""), 3000)
        setIsFetchingDeck(null)
        return
      }

      // Clear existing if user chose to overwrite
      if (shouldClear) {
        clearList()
      }

      // Convert to deck list format
      const deckListText = convertToDeckList(detail.cards)
      const cardCount = detail.cards.reduce((sum, c) => sum + c.quantity, 0)

      setStatus(`Loaded ${cardCount} cards! Switching to Deck List...`)

      // Populate the text area and switch tabs (with a small delay so user sees the success message)
      setTimeout(() => {
        onPopulateText(deckListText, `Meta: ${deck.name}`)
        setStatus("")
      }, 800)
    } catch (err) {
      setStatus("Failed to load deck")
      console.error(err)
      setTimeout(() => setStatus(""), 3000)
    } finally {
      setIsFetchingDeck(null)
    }
  }

  const handleSelectDeck = async (deck: LimitlessDeck) => {
    // Check if there are existing cards
    if (totalExistingCards > 0) {
      setPendingDeck(deck)
      setShowConfirmDialog(true)
      return
    }
    
    // No existing cards, load directly
    await processDeckLoad(deck, false)
  }

  const handleConfirmOverwrite = () => {
    if (pendingDeck) {
      processDeckLoad(pendingDeck, true)
      setShowConfirmDialog(false)
      setPendingDeck(null)
    }
  }

  const handleConfirmAdd = () => {
    if (pendingDeck) {
      processDeckLoad(pendingDeck, false)
      setShowConfirmDialog(false)
      setPendingDeck(null)
    }
  }

  // Filter and sort decks
  const filteredDecks = decks
    .filter((deck) =>
      deck.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "winRate":
          return b.winRate - a.winRate
        case "share":
          return b.share - a.share
        case "count":
          return b.count - a.count
        default:
          return 0
      }
    })

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

  const getWinRateColor = (rate: number) => {
    if (rate >= 0.55) return "text-green-400"
    if (rate >= 0.5) return "text-yellow-400"
    if (rate >= 0.45) return "text-orange-400"
    return "text-red-400"
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-100">Meta Decks</h2>
            <p className="mt-1 text-xs text-slate-500">
              Top tournament decks from Limitless TCG
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-100"
            onClick={loadDecks}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 border-b border-slate-800 p-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-slate-700 bg-slate-900/50 pl-10 text-sm text-slate-100 placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className="border-b border-slate-800 bg-blue-900/20 px-4 py-2">
          <p className="flex items-center gap-2 text-xs text-blue-400">
            {isFetchingDeck ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            {status}
          </p>
        </div>
      )}

      {/* Deck List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-slate-400">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDecks}
              className="mt-2 border-slate-700 text-slate-300"
            >
              Retry
            </Button>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
            <Search className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">No decks found</p>
            <p className="text-xs text-slate-600">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredDecks.map((deck, index) => (
              <div
                key={deck.id}
                className={cn(
                  "group relative rounded-lg border border-transparent bg-slate-900/30 p-3 transition-all",
                  "hover:border-slate-700 hover:bg-slate-800/50",
                  isFetchingDeck === deck.id &&
                    "border-blue-500/50 bg-blue-900/20"
                )}
              >
                {/* Rank */}
                <div className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400">
                  {index + 1}
                </div>

                {/* Content */}
                <div className="ml-7 flex items-start gap-3">
                  {/* Pokemon Sprites */}
                  {deck.sprites && deck.sprites.length > 0 && (
                    <div className="flex flex-shrink-0 items-center gap-0.5">
                      {deck.sprites.map((sprite, i) => (
                        <img
                          key={i}
                          src={sprite}
                          alt=""
                          className="h-8 w-8 rounded bg-slate-800/50 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none"
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="pr-16 text-sm font-medium text-slate-200">
                      {deck.name}
                    </h3>

                    {/* Stats */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span
                        className={cn(
                          "flex items-center gap-1 font-medium",
                          getWinRateColor(deck.winRate)
                        )}
                      >
                        <Trophy className="h-3 w-3" />
                        {deck.count}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <TrendingUp className="h-3 w-3" />
                        {formatPercent(deck.share)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Load Button */}
                <Button
                  size="sm"
                  className="absolute top-2 right-2 h-7 bg-blue-600 px-3 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-blue-500"
                  onClick={() => handleSelectDeck(deck)}
                  disabled={isFetchingDeck !== null}
                >
                  {isFetchingDeck === deck.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="mr-1 h-3 w-3" />
                      Load
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-slate-800 p-3">
        <p className="text-center text-[10px] text-slate-600">
          Click Load to import into the Deck List tab for review
        </p>
      </div>

      {/* Load Confirm Dialog */}
      <LoadConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false)
          setPendingDeck(null)
        }}
        onOverwrite={handleConfirmOverwrite}
        onAddToExisting={handleConfirmAdd}
        existingCardCount={totalExistingCards}
        newDeckName={pendingDeck?.name || ""}
      />
    </div>
  )
}
