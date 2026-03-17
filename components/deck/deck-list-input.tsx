"use client"

import { useState, useCallback } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { parseDeckList, resolveDeckCards } from "@/lib/deck-parser"
import { useProxyList } from "@/stores/proxy-list"
import { getProcessedCardImage } from "@/lib/tcgdex"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function DeckListInput() {
  const [deckText, setDeckText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("")
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [showClearDialog, setShowClearDialog] = useState(false)

  const addItem = useProxyList((state) => state.addItem)
  const clearList = useProxyList((state) => state.clearList)
  const items = useProxyList((state) => state.items)
  const totalCards = useProxyList((state) => state.getTotalCards)()

  const handleProcessDeck = useCallback(async () => {
    if (!deckText.trim()) return

    setIsProcessing(true)
    setParseErrors([])
    setProcessingStatus("Parsing deck list...")

    // Parse the deck list
    const parsedItems = parseDeckList(deckText)

    if (parsedItems.length === 0) {
      setParseErrors(["No valid cards found in deck list"])
      setIsProcessing(false)
      return
    }

    setProcessingStatus(
      `Found ${parsedItems.length} unique cards, searching...`
    )

    // Resolve cards against TCGdex
    const results = await resolveDeckCards(parsedItems)

    const errors: string[] = []
    let addedCount = 0

    // Process each unique card
    for (const result of results) {
      if (result.card) {
        setProcessingStatus(`Processing ${result.card.name}...`)

        // Process image to stretch corners (mandatory preprocessing)
        const processedImage = await getProcessedCardImage(
          result.card.image,
          "high"
        )

        // Add the card with the specified quantity (single call)
        addItem({
          cardId: result.card.id,
          name: result.card.name,
          image: processedImage,
          originalImage: result.card.image, // Store original TCGdex URL
          setName: result.card.set?.name || "Unknown",
          setId: result.card.set?.id || "",
          localId: result.card.localId,
        }, result.item.quantity)
        
        addedCount += result.item.quantity
      } else {
        errors.push(`${result.item.cardName}: ${result.error || "Not found"}`)
      }
    }

    setParseErrors(errors)
    setProcessingStatus(`Added ${addedCount} cards`)
    setIsProcessing(false)

    // Clear textarea on success (visual confirmation + ready for next input)
    if (errors.length === 0 && addedCount > 0) {
      setDeckText("")
    }

    // Clear status after 3 seconds
    setTimeout(() => setProcessingStatus(""), 3000)
  }, [deckText, addItem, setDeckText])

  const handleClearClick = () => {
    if (items.length === 0) {
      // Just clear the text if no items in list
      setDeckText("")
      setParseErrors([])
      setProcessingStatus("")
    } else {
      // Show confirmation dialog if there are items
      setShowClearDialog(true)
    }
  }
  
  const handleClearConfirm = () => {
    setDeckText("")
    setParseErrors([])
    setProcessingStatus("")
    clearList()
    setShowClearDialog(false)
  }

  const sampleDeck = `4 Charmander OBF 26
3 Charmeleon OBF 27
3 Charizard ex OBF 125
4 Arcanine ex OBF 224
2 Bidoof CRZ 111
2 Bibarel CRZ 112
2 Pidgey MEW 16
2 Pidgeotto MEW 17
2 Pidgeot ex OBF 164
4 Ultra Ball SVI 196
4 Rare Candy SVI 191
3 Boss's Orders PAL 172
3 Iono PAL 185
4 Nest Ball SVI 181`

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 p-4">
        <h2 className="font-semibold text-slate-100">Add Cards</h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter card names with or without quantities
        </p>
      </div>

      {/* Input Area */}
      <div className="flex-1 p-4">
        <Textarea
          value={deckText}
          onChange={(e) => setDeckText(e.target.value)}
          placeholder={`Examples:\n4 Charmander OBF 26\n3 Charizard ex OBF 125\nBoss's Orders PAL 172  (defaults to 1)\nMew ex`}
          className="h-full min-h-[300px] resize-none border-slate-700 bg-slate-900/50 font-mono text-sm text-slate-100 placeholder:text-slate-600"
          disabled={isProcessing}
        />
      </div>

      {/* Status & Errors */}
      {(processingStatus || parseErrors.length > 0) && (
        <div className="px-4 pb-2">
          {processingStatus && (
            <div
              className={cn(
                "rounded px-3 py-2 text-xs",
                isProcessing
                  ? "bg-blue-900/30 text-blue-400"
                  : "bg-green-900/30 text-green-400"
              )}
            >
              {isProcessing && (
                <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              )}
              {processingStatus}
            </div>
          )}
          {parseErrors.length > 0 && (
            <div className="mt-2 max-h-24 overflow-auto rounded bg-red-900/30 px-3 py-2 text-xs text-red-400">
              <div className="mb-1 font-semibold">Issues found:</div>
              {parseErrors.map((err, i) => (
                <div key={i} className="truncate">
                  {err}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 border-t border-slate-800 p-4">
        <Button
          className="w-full bg-blue-600 text-white hover:bg-blue-500"
          onClick={handleProcessDeck}
          disabled={isProcessing || !deckText.trim()}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Cards
            </>
          )}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            onClick={() => setDeckText(sampleDeck)}
            disabled={isProcessing}
          >
            Sample
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-slate-700 text-red-400 hover:bg-red-950 hover:text-red-300"
            onClick={handleClearClick}
            disabled={isProcessing && items.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Clear Proxy List</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to remove all {totalCards} card{totalCards !== 1 ? 's' : ''} from your list? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowClearDialog(false)}
              className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
