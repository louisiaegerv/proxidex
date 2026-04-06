"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Loader2, ChevronDown, ZoomIn, X } from "lucide-react"
import { useProxyList } from "@/stores/proxy-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getCardImageUrl } from "@/lib/images"

// Local card result from our database
interface LocalCard {
  id: string
  name: string
  set_code: string
  set_name: string
  local_id: string
  folder_name: string
  variants: string
  sizes: string
}

interface CardVariantModalProps {
  isOpen: boolean
  onClose: () => void
  cardId: string | null
  itemId: string | null
}

interface VariantCard {
  id: string
  name: string
  localId: string
  image: string
  setName: string
  setId: string
}

const INITIAL_LOAD_COUNT = 12
const LOAD_MORE_COUNT = 12

export function CardVariantModal({
  isOpen,
  onClose,
  cardId,
  itemId,
}: CardVariantModalProps) {
  const [variants, setVariants] = useState<VariantCard[]>([])
  const [allMatchingCards, setAllMatchingCards] = useState<LocalCard[]>([])
  const [cardsWithImagesCount, setCardsWithImagesCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentCardDetails, setCurrentCardDetails] =
    useState<VariantCard | null>(null)
  const [previewVariant, setPreviewVariant] = useState<VariantCard | null>(null)
  const processedIndexRef = useRef(0)

  const updateItemCard = useProxyList((state) => state.updateItemCard)
  const items = useProxyList((state) => state.getActiveDeck()?.items ?? [])

  const currentItem = items.find((item) => item.id === itemId)

  // Helper function to build variant from local card (sm for modal thumbnails)
  const buildVariant = useCallback((card: LocalCard): VariantCard => {
    return {
      id: card.id,
      name: card.name,
      localId: card.local_id,
      image: getCardImageUrl(card, 'sm'),
      setName: card.set_name,
      setId: card.set_code,
    }
  }, [])

  // Helper function to load cards from a starting index until we have enough
  const loadCardsWithImages = useCallback(
    async (
      matchingCards: LocalCard[],
      startIndex: number,
      targetCount: number
    ): Promise<{ variants: VariantCard[]; nextIndex: number }> => {
      const newVariants: VariantCard[] = []
      let currentIndex = startIndex

      // Load cards until we have enough
      while (
        newVariants.length < targetCount &&
        currentIndex < matchingCards.length
      ) {
        const card = matchingCards[currentIndex]
        newVariants.push(buildVariant(card))
        currentIndex++
      }

      return { variants: newVariants, nextIndex: currentIndex }
    },
    [buildVariant]
  )

  // Load more variants
  const loadMore = useCallback(async () => {
    if (isLoadingMore || allMatchingCards.length === 0) return

    setIsLoadingMore(true)

    const { variants: newVariants, nextIndex } = await loadCardsWithImages(
      allMatchingCards,
      processedIndexRef.current,
      LOAD_MORE_COUNT
    )

    processedIndexRef.current = nextIndex
    setVariants((prev) => [...prev, ...newVariants])
    setIsLoadingMore(false)
  }, [allMatchingCards, isLoadingMore, loadCardsWithImages])

  useEffect(() => {
    if (!isOpen || !currentItem) return

    async function loadVariants() {
      setIsLoading(true)
      processedIndexRef.current = 0
      try {
        // Search for cards with the same name using local API
        const response = await fetch(
          `/api/cards/search?q=${encodeURIComponent(currentItem!.name)}&limit=100`
        )
        
        if (!response.ok) {
          throw new Error('Failed to search variants')
        }
        
        const data = await response.json()
        let matchingCards: LocalCard[] = data.cards || []

        console.log(
          `[Variant Modal] Found ${matchingCards.length} matching cards for: ${currentItem!.name}`
        )

        // Sort to prioritize exact matches first, then starts with, then contains
        const searchName = currentItem!.name.toLowerCase()
        matchingCards = matchingCards.sort((a, b) => {
          const aName = (a.name || "").toLowerCase()
          const bName = (b.name || "").toLowerCase()
          const aExact = aName === searchName
          const bExact = bName === searchName
          const aStartsWith = aName.startsWith(searchName)
          const bStartsWith = bName.startsWith(searchName)

          // Exact matches come first
          if (aExact && !bExact) return -1
          if (bExact && !aExact) return 1

          // Then starts with
          if (aStartsWith && !bStartsWith) return -1
          if (bStartsWith && !aStartsWith) return 1

          // Otherwise maintain original order (stable sort)
          return 0
        })

        setAllMatchingCards(matchingCards)

        // Load initial batch of cards
        const { variants: initialVariants, nextIndex } =
          await loadCardsWithImages(
            matchingCards,
            0,
            INITIAL_LOAD_COUNT
          )

        processedIndexRef.current = nextIndex
        setVariants(initialVariants)

        // Find current card details from loaded variants
        const currentVariant = initialVariants.find(
          (v) => v.id === currentItem?.cardId
        )
        if (currentVariant) {
          setCurrentCardDetails(currentVariant)
        }

        setCardsWithImagesCount(matchingCards.length)
      } catch (error) {
        console.error("Error loading variants:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadVariants()
    setSearchQuery("")
    setCardsWithImagesCount(0)
  }, [isOpen, currentItem, loadCardsWithImages])

  const handleSelectVariant = (variant: VariantCard) => {
    if (!itemId) return

    // Swap sm to md for the selected variant (modal shows sm, preview needs md)
    const mdImageUrl = variant.image.replace(/_sm\.webp$/, '_md.webp')

    // Images are pre-processed, use md version for preview
    updateItemCard(itemId, {
      cardId: variant.id,
      name: variant.name,
      image: mdImageUrl,
      originalImage: mdImageUrl,
      setName: variant.setName,
      setId: variant.setId,
      localId: variant.localId,
    })
    onClose()
  }

  const filteredVariants = searchQuery
    ? variants.filter(
        (v) =>
          v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.setName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : variants

  // Calculate remaining cards to load
  const remainingToLoad = cardsWithImagesCount - variants.length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open === false && onClose()}>
      <DialogContent overflow-hidden className="max-h-[90vh]  sm:max-w-5xl border-slate-800 bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            Change Card Variant
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Search within variants */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search variants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-slate-700 bg-slate-800 pl-10 text-slate-100"
            />
          </div>

          {/* Current selection */}
          {currentItem && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-800 bg-blue-900/20 p-3">
              <div className="h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-slate-800">
                {currentItem.image && (
                  <img
                    src={currentItem.image}
                    alt={currentItem.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div>
                <p className="font-medium text-slate-200">{currentItem.name}</p>
                <p className="text-sm text-slate-500">
                  {currentCardDetails
                    ? `${currentCardDetails.setName} (${currentCardDetails.setId}) · #${currentCardDetails.localId}`
                    : `${currentItem.setName} (${currentItem.setId}) · #${currentItem.localId}`}
                </p>
              </div>
              <div className="ml-auto text-xs text-blue-400">Current</div>
            </div>
          )}

          {/* Variants grid */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-slate-500">
                Loading variants...
              </div>
            ) : filteredVariants.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-slate-500">
                No variants found
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {filteredVariants.map((variant) => {
                    const isCurrent = variant.id === currentItem?.cardId

                    return (
                      <div
                        key={variant.id}
                        className={`group relative overflow-hidden rounded-lg transition-all ${
                          isCurrent
                            ? "ring-2 ring-blue-500"
                            : "hover:ring-2 hover:ring-slate-600"
                        }`}
                      >
                        {/* Preview Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewVariant(variant)
                          }}
                          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/80 text-white opacity-0 transition-opacity hover:bg-slate-800 group-hover:opacity-100"
                          title="Preview card"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </button>

                        {/* Card Image - Click to select */}
                        <button
                          onClick={() => handleSelectVariant(variant)}
                          className="aspect-[63/88] w-full bg-slate-800"
                        >
                          {variant.image ? (
                            <img
                              src={variant.image}
                              alt={variant.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-600">
                              No Image
                            </div>
                          )}
                        </button>
                        {isCurrent && (
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                            <div className="rounded bg-blue-500 px-2 py-1 text-xs text-white">
                              Current
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Load More Button */}
                {!searchQuery && remainingToLoad > 0 && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          Load More (
                          {Math.min(LOAD_MORE_COUNT, remainingToLoad)} more)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="text-center text-xs text-slate-500">
            {searchQuery
              ? `Showing ${filteredVariants.length} of ${variants.length} loaded variants`
              : cardsWithImagesCount > 0
                ? `Showing ${variants.length} of ${cardsWithImagesCount} variants`
                : `Showing ${variants.length} variants`}
          </div>
        </div>

        {/* Card Preview Modal */}
        <Dialog open={!!previewVariant} onOpenChange={() => setPreviewVariant(null)}>
          <DialogContent className="max-w-md border-slate-800 bg-slate-900 p-0">
            <DialogTitle className="sr-only">
              {previewVariant?.name || 'Card Preview'}
            </DialogTitle>
            {previewVariant && (
              <div className="flex flex-col gap-4 p-4">
                <div className="aspect-[63/88] overflow-hidden rounded-lg">
                  <img
                    src={previewVariant.image}
                    alt={previewVariant.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-100">
                    {previewVariant.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {previewVariant.setName} #{previewVariant.localId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleSelectVariant(previewVariant)
                      setPreviewVariant(null)
                    }}
                    className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500"
                  >
                    Select This Variant
                  </button>
                  <button
                    onClick={() => setPreviewVariant(null)}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
