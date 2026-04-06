"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { FileText, Trophy, Link, Plus, Loader2, Images } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { MetaDeckSelector } from "./meta-deck-selector"
import { DeckUrlImport } from "./deck-url-import"
import { SetBrowser, SetBrowserRef } from "./set-browser"
import { LoadConfirmDialog } from "./load-confirm-dialog"
import { useProxyList } from "@/stores/proxy-list"
import { parseDeckList, type DeckListItem } from "@/lib/deck-parser"

interface AddCardsModalProps {
  isOpen: boolean
  onClose: () => void
  onAddCards: (items: DeckListItem[]) => void
}

type AddMethod = "text" | "meta" | "url" | "browse"

interface MethodOption {
  value: AddMethod
  label: string
  icon: React.ElementType
  description: string
}

const methods: MethodOption[] = [
  {
    value: "text",
    label: "Type / Paste",
    icon: FileText,
    description: "Enter cards manually or paste a deck list",
  },
  {
    value: "browse",
    label: "Browse Sets",
    icon: Images,
    description: "Browse cards by set and select visually",
  },
  {
    value: "meta",
    label: "Meta Decks",
    icon: Trophy,
    description: "Import from top tournament decks",
  },
  {
    value: "url",
    label: "URL Import",
    icon: Link,
    description: "Import from Limitless TCG URL",
  },
]

export function AddCardsModal({
  isOpen,
  onClose,
  onAddCards,
}: AddCardsModalProps) {
  const [activeMethod, setActiveMethod] = useState<AddMethod | null>(null)
  const [textInput, setTextInput] = useState("")
  const [pendingItems, setPendingItems] = useState<DeckListItem[] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importSource, setImportSource] = useState<string>("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [browseSelection, setBrowseSelection] = useState<{ count: number; total: number } | null>(null)

  const setBrowserRef = useRef<SetBrowserRef>(null)

  const existingItems = useProxyList(
    (state) => state.getActiveDeck()?.items ?? []
  )
  const clearList = useProxyList((state) => state.clearList)
  const existingCardCount = existingItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  const handleMethodChange = (method: AddMethod) => {
    setActiveMethod(method)
    setPendingItems(null)
    setImportSource("")
    setBrowseSelection(null)
  }

  const handleBackToMethods = () => {
    setActiveMethod(null)
    setPendingItems(null)
    setImportSource("")
    setBrowseSelection(null)
    // Clear SetBrowser selection when going back
    if (setBrowserRef.current) {
      setBrowserRef.current.clearSelection()
    }
    setTextInput("")
  }

  const handleTextChange = (value: string) => {
    setTextInput(value)
    if (value.trim()) {
      const items = parseDeckList(value)
      setPendingItems(items)
    } else {
      setPendingItems(null)
    }
  }

  const handleMetaSelect = useCallback(
    (items: DeckListItem[], deckName: string) => {
      setPendingItems(items)
      setImportSource(deckName)
      setActiveMethod("text")
      const text = items
        .map((item) =>
          `${item.quantity} ${item.cardName} ${item.setCode || ""} ${item.cardNumber || ""}`.trim()
        )
        .join("\n")
      setTextInput(text)
    },
    []
  )

  const handleUrlImport = useCallback(
    (items: DeckListItem[], deckName: string) => {
      setPendingItems(items)
      setImportSource(deckName)
      setActiveMethod("text")
      const text = items
        .map((item) =>
          `${item.quantity} ${item.cardName} ${item.setCode || ""} ${item.cardNumber || ""}`.trim()
        )
        .join("\n")
      setTextInput(text)
    },
    []
  )

  const handleAddToDeck = async () => {
    let itemsToAdd: DeckListItem[] | null = null
    let source = importSource

    // Get items based on active method
    if (activeMethod === "browse" && setBrowserRef.current) {
      const selectedCards = setBrowserRef.current.getSelectedCards()
      if (selectedCards.length > 0) {
        itemsToAdd = selectedCards.map(({ card, quantity }) => ({
          quantity,
          cardName: card.name,
          setCode: card.set_code,
          cardNumber: card.local_id,
        }))
        source = "Set Browser"
      }
    } else {
      itemsToAdd = pendingItems
    }

    if (!itemsToAdd || itemsToAdd.length === 0) return

    // Check if there are existing cards
    if (existingCardCount > 0) {
      setPendingItems(itemsToAdd)
      setImportSource(source)
      setShowConfirmDialog(true)
      return
    }

    await processAddToDeck(itemsToAdd, source)
  }

  const processAddToDeck = async (
    items: DeckListItem[],
    source: string,
    action: "overwrite" | "add" = "add"
  ) => {
    setIsProcessing(true)
    try {
      // If overwrite action, clear existing cards first
      if (action === "overwrite") {
        clearList()
      }

      onAddCards(items)
      setTextInput("")
      setPendingItems(null)
      setImportSource("")
      setBrowseSelection(null)
      
      // Clear SetBrowser selection
      if (setBrowserRef.current) {
        setBrowserRef.current.clearSelection()
      }
      
      setActiveMethod("text")
      setShowConfirmDialog(false)
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOverwrite = () => {
    const items = pendingItems
    const source = importSource
    if (items) {
      processAddToDeck(items, source, "overwrite")
    }
  }

  const handleAddToExisting = () => {
    const items = pendingItems
    const source = importSource
    if (items) {
      processAddToDeck(items, source, "add")
    }
  }

  const handleConfirmDialogClose = () => {
    setShowConfirmDialog(false)
  }

  const handleClose = () => {
    if (!isProcessing) {
      // Reset to initial state
      setActiveMethod(null)
      setTextInput("")
      setPendingItems(null)
      setBrowseSelection(null)
      if (setBrowserRef.current) {
        setBrowserRef.current.clearSelection()
      }
      onClose()
    }
  }

  // Calculate total cards for display
  const totalCards = activeMethod === "browse" 
    ? (browseSelection?.total || 0)
    : activeMethod === null
    ? 0
    : (pendingItems?.reduce((sum, item) => sum + item.quantity, 0) || 0)

  const hasItems = activeMethod === "browse"
    ? (browseSelection?.count || 0) > 0
    : activeMethod === null
    ? false
    : (pendingItems && pendingItems.length > 0)

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

  const loadSample = () => {
    handleTextChange(sampleDeck)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose} 
          // modal={false}
      >
        <DialogContent className={cn(
          "h-dvh w-dvw max-w-dvw overflow-hidden border-slate-800 bg-slate-900 p-0 text-slate-100 transition-all md:h-[600px] md:max-h-[90vh]",
          "flex flex-col",
          activeMethod === "browse" || activeMethod === "url" ? "sm:max-w-5xl" : "sm:max-w-2xl",
          activeMethod === "browse" && "md:h-[80vh]"
        )}>
          <DialogHeader className="border-b border-slate-800 px-6 py-4 h-15">
            <DialogTitle className="flex items-center justify-center text-lg font-semibold text-slate-100">
              {activeMethod && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToMethods}
                  className="absolute left-4 h-8 gap-1 px-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  ← Back
                </Button>
              )}
              {activeMethod === null && "Add Cards to Deck"}
              {activeMethod === "text" && "Type / Paste"}
              {activeMethod === "browse" && "Set Selector"}
              {activeMethod === "meta" && "Deck Selector"}
              {activeMethod === "url" && "URL Import"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Method Selector - Initial view */}
            {activeMethod === null && (
              <div className="flex flex-1 px-6 py-8">
                <div className="grid w-full max-w-2xl flex-1 grid-cols-2 gap-4 mx-auto content-center">
                  {methods.map((method) => {
                    const Icon = method.icon

                    return (
                      <button
                        key={method.value}
                        onClick={() => handleMethodChange(method.value)}
                        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-slate-400 transition-all hover:border-blue-500 hover:bg-slate-800 hover:text-blue-400"
                      >
                        <Icon className="h-8 w-8" />
                        <span className="text-base font-medium">
                          {method.label}
                        </span>
                        <span className="text-center text-sm text-slate-500 max-w-50">
                          {method.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Content Area - Focused method views */}
            {activeMethod !== null && (
              <div className="flex flex-1 flex-col overflow-hidden" style={{ minHeight: 0 }}>
                <div className="flex-1 overflow-y-auto px-6 py-4" style={{ minHeight: 0 }}>
                  {activeMethod === "text" && (
                    <div className="flex h-full flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-400">
                          Enter cards in format:{" "}
                          <code className="rounded bg-slate-800 px-1 py-0.5 text-sm">
                            4 Charmander OBF 26
                          </code>
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadSample}
                          className="h-7 text-sm text-slate-500 hover:text-slate-300"
                        >
                          Load Sample
                        </Button>
                      </div>

                      {importSource && (
                        <div className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-400">
                          Imported from: {importSource}
                        </div>
                      )}

                      <Textarea
                        value={textInput}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder={`Paste deck list here...\n\nExamples:\n4 Charmander OBF 26\n3 Charizard ex OBF 125\nBoss's Orders PAL 172\nDialga, DP\nPikachu, MEW`}
                        className="min-h-50 resize-none border-slate-700 bg-slate-800/50 font-mono text-sm text-slate-100 placeholder:text-slate-600"
                      />

                      <div className="text-sm text-slate-500">
                        <p className="text-md">Formats supported:</p>
                        <ul className="mt-1 ml-4 list-disc">
                          <li>
                            4 Charmander OBF 26 (quantity + name + set + number)
                          </li>
                          <li>Dialga, DP (name + set, finds first match)</li>
                          <li>4 Charmander (quantity + name only)</li>
                          <li>Boss's Orders (name only, defaults to 1)</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeMethod === "browse" && (
                    <SetBrowser
                      ref={setBrowserRef}
                      onSelectionChange={(count, total) => {
                        setBrowseSelection({ count, total })
                      }}
                    />
                  )}

                  {activeMethod === "meta" && (
                    <MetaDeckSelector onSelectDeck={handleMetaSelect} />
                  )}

                  {activeMethod === "url" && (
                    <DeckUrlImport onImport={handleUrlImport} />
                  )}
                </div>

                {/* Footer - Only show for text and browse methods */}
                {activeMethod !== "url" && activeMethod !== "meta" && (
                <div className="border-t border-slate-800 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                      {hasItems ? (
                        <span className="text-slate-300">
                          <span className="font-semibold text-white">
                            {totalCards}
                          </span>{" "}
                          card{totalCards !== 1 ? "s" : ""} to add
                          {activeMethod === "browse" && browseSelection && browseSelection.count > 0 && (
                            <span className="ml-1 text-slate-500">
                              ({browseSelection.count} unique)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>Enter cards or select cards to add</span>
                      )}
                    </div>

                    <Button
                      onClick={handleAddToDeck}
                      disabled={!hasItems || isProcessing}
                      className="gap-2 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Add to Deck
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Confirmation Dialog */}
      <LoadConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleConfirmDialogClose}
        onOverwrite={handleOverwrite}
        onAddToExisting={handleAddToExisting}
        existingCardCount={existingCardCount}
        newDeckName={importSource || "Imported Deck"}
      />
    </>
  )
}
