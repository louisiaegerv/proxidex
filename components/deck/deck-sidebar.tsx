"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, Loader2, Crown } from "lucide-react"
import { type DeckListItem, getCardImageUrl } from "@/lib/deck-parser"
import { resolveDeckCards } from "@/app/actions/deck-actions"
import { useProxyList } from "@/stores/proxy-list"
import { useSubscription } from "@/components/subscription-provider"
import { Button } from "@/components/ui/button"
import { FREE_TIER_DECK_MAX_CARDS } from "@/lib/exports"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { AddCardsModal } from "./add-cards-modal"
import { CardList } from "./card-list"
import { DeckSelector } from "./deck-selector"
import { StorageNotice } from "@/components/storage/storage-notice"
import type { ProxyItem } from "@/types"

interface DeckSidebarProps {
  variant?: "desktop" | "mobile"
}

export function DeckSidebar({ variant = "desktop" }: DeckSidebarProps) {
  const isMobile = variant === "mobile"

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("")
  const [showClearDialog, setShowClearDialog] = useState(false)

  const addItem = useProxyList((state) => state.addItem)
  const clearList = useProxyList((state) => state.clearList)
  const items = useProxyList((state) => state.getItems())
  const totalCards = useProxyList((state) => state.getTotalCards)()
  const reorderItems = useProxyList((state) => state.reorderItems)
  const removeItems = useProxyList((state) => state.removeItems)
  
  const { subscription } = useSubscription()
  const isPro = subscription?.isPro ?? false

  // Calculate unique card count
  const uniqueCardCount = new Set(items.map(item => item.cardId)).size
  const atDeckLimit = !isPro && items.length >= FREE_TIER_DECK_MAX_CARDS

  const handleAddCards = async (deckItems: DeckListItem[]) => {
    if (deckItems.length === 0) return

    // Check free tier deck size limit before processing
    let cardsToAdd = [...deckItems]
    let limitMessage = ""
    
    if (!isPro) {
      const totalCardsToAdd = deckItems.reduce((sum, item) => sum + item.quantity, 0)
      const currentCount = items.length
      
      if (currentCount >= FREE_TIER_DECK_MAX_CARDS) {
        setProcessingStatus("Deck limit reached - Upgrade to Pro for unlimited")
        setTimeout(() => setProcessingStatus(""), 3000)
        setIsAddModalOpen(false)
        return
      }
      
      // Calculate how many cards we can actually add
      const canAddTotal = FREE_TIER_DECK_MAX_CARDS - currentCount
      
      if (totalCardsToAdd > canAddTotal) {
        // Trim the list to only add up to the limit
        let runningTotal = 0
        const trimmedCards: DeckListItem[] = []
        
        for (const item of deckItems) {
          const itemTotal = runningTotal + item.quantity
          if (itemTotal <= canAddTotal) {
            trimmedCards.push(item)
            runningTotal = itemTotal
          } else {
            // Partial quantity for the last card that fits
            const remaining = canAddTotal - runningTotal
            if (remaining > 0) {
              trimmedCards.push({ ...item, quantity: remaining })
            }
            break
          }
        }
        
        cardsToAdd = trimmedCards
        limitMessage = `Added ${canAddTotal} of ${totalCardsToAdd} cards (deck limit reached)`
      }
    }
    
    setProcessingStatus("Processing cards...")
    setIsProcessing(true)
    setIsAddModalOpen(false)

    try {
      // Resolve cards against TCGdex
      const results = await resolveDeckCards(cardsToAdd)

      let addedCount = 0
      const errors: string[] = []

      // Process each card
      for (const result of results) {
        if (result.card) {
          setProcessingStatus(`Adding ${result.card.name}...`)

          // Get image URL from local storage (use md for UI, lg only for PDF generation)
          const imageUrl = getCardImageUrl(result.card, 'md')

          // Add the card with the specified quantity
          addItem({
            cardId: result.card.id,
            name: result.card.name,
            image: imageUrl,
            setName: result.card.set_name || "Unknown",
            setId: result.card.set_code || "",
            localId: result.card.local_id,
          }, result.item.quantity)

          addedCount += result.item.quantity
        } else {
          errors.push(`${result.item.cardName}: ${result.error || "Not found"}`)
        }
      }

      // Show appropriate status message
      if (limitMessage) {
        setProcessingStatus(limitMessage)
      } else if (errors.length > 0) {
        setProcessingStatus(`Added ${addedCount} cards, ${errors.length} failed`)
      } else {
        setProcessingStatus(`Added ${addedCount} cards`)
      }

      // Clear status after 3 seconds
      setTimeout(() => setProcessingStatus(""), 3000)
    } catch (err) {
      setProcessingStatus("Error processing cards")
      setTimeout(() => setProcessingStatus(""), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearClick = () => {
    if (items.length === 0) return
    setShowClearDialog(true)
  }

  const handleClearConfirm = () => {
    clearList()
    setShowClearDialog(false)
  }

  const handleReorder = useCallback((newItems: ProxyItem[]) => {
    // Update the store with the new order using setItems
    useProxyList.getState().setItems(newItems)
  }, [])

  const handleRemove = useCallback(
    (indices: number[]) => {
      // Get the IDs of items to remove
      const idsToRemove = indices
        .map((index) => items[index]?.id)
        .filter(Boolean)
      if (idsToRemove.length > 0) {
        removeItems(idsToRemove)
      }
    },
    [items, removeItems]
  )

  return (
    <div className={cn("flex h-full flex-col", isMobile && "bg-background")}>
      {/* Header */}
      <div
        className={cn(
          "shrink-0 border-b border-border",
          isMobile
            ? "px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]"
            : "p-4"
        )}
      >
        {/* Deck Selector - Primary deck identification */}
        <DeckSelector className={cn("mb-3", isMobile && "text-sm")} />

        {/* Card count and clear action */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {items.length > 0 ? (
              isPro ? (
                <>{totalCards} cards ({uniqueCardCount} unique)</>
              ) : (
                <span className={atDeckLimit ? "text-amber-400 font-medium" : ""}>
                  {totalCards}/{FREE_TIER_DECK_MAX_CARDS} cards
                  {atDeckLimit && (
                    <span className="ml-1 text-amber-500">
                      <Crown className="inline h-3 w-3" />
                    </span>
                  )}
                </span>
              )
            ) : (
              "No cards yet"
            )}
          </p>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearClick}
              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive/90"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Card List Area */}
      <div className="flex-1 overflow-hidden">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-sm font-medium text-foreground">
              Your deck is empty
            </h3>
            <p className="mb-6 text-xs text-muted-foreground">
              Add cards to create your proxy deck. You can import from meta
              decks, paste a list, or search for individual cards.
            </p>
          </div>
        ) : (
          <div className="h-full overflow-auto p-4">
            <CardList
              items={items}
              onReorder={handleReorder}
              onRemove={handleRemove}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={cn(
          "shrink-0 border-t border-border",
          isMobile
            ? "p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
            : "p-4"
        )}
      >
        {/* Storage Notice for Free Users */}
        {/* {!isMobile && <StorageNotice variant="compact" className="mb-3" />} */}

        {/* Processing Status */}
        {processingStatus && (
          <div
            className={cn(
              "mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              isProcessing
                ? "bg-primary/10 text-primary"
                : "bg-green-500/10 text-green-500"
            )}
          >
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            {processingStatus}
          </div>
        )}

        {/* Deck limit warning for free users */}
        {atDeckLimit && (
          <div className="mb-3 rounded-lg bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
            <Crown className="mr-1 inline h-3 w-3" />
            Deck limit reached. Upgrade to Pro for unlimited cards.
          </div>
        )}

        <Button
          onClick={() => setIsAddModalOpen(true)}
          disabled={isProcessing || atDeckLimit}
          className={cn(
            "w-full bg-primary text-primary-foreground hover:bg-primary/90",
            isMobile && "h-12 text-base",
            atDeckLimit && "bg-muted text-muted-foreground hover:bg-muted"
          )}
        >
          <Plus className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
          Add Cards
        </Button>
      </div>

      {/* Add Cards Modal */}
      <AddCardsModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddCards={handleAddCards}
      />

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>Clear Deck</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will remove all {totalCards} cards from your deck. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowClearDialog(false)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearConfirm}
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
