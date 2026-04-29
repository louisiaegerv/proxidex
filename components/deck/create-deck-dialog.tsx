"use client"

import { useState, useRef, useCallback } from "react"
import { Layers, Crown, Check } from "lucide-react"
import { useProxyList } from "@/stores/proxy-list"
import { useSubscription } from "@/components/subscription-provider"
import { useTrophyUnlock } from "@/components/trophies/use-trophy-unlock"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

interface CreateDeckDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateDeckDialog({ isOpen, onClose }: CreateDeckDialogProps) {
  const [deckName, setDeckName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const createDeck = useProxyList((state) => state.createDeck)
  const decks = useProxyList((state) => state.decks)

  const { subscription, isLoading } = useSubscription()
  const isPro = subscription?.isPro ?? false
  const { unlockTrophy } = useTrophyUnlock()

  // Check if free user is at deck limit
  const isAtDeckLimit = !isPro && decks.length >= 2

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        // Small delay to ensure dialog animation is complete
        setTimeout(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        }, 50)
      } else {
        // Reset state when dialog closes
        setDeckName("")
        setError(null)
        onClose()
      }
    },
    [onClose]
  )

  const handleSubmit = () => {
    const trimmedName = deckName.trim()

    // Validate name is not empty
    if (!trimmedName) {
      setError("Deck name is required")
      return
    }

    // Check if at deck limit
    if (isAtDeckLimit) {
      return
    }

    // Create the deck - this automatically switches to it
    const result = createDeck(trimmedName)

    if (result === null) {
      // Deck creation failed due to limit
      return
    }

    // Unlock first deck trophy
    unlockTrophy("first_deck")
    // Try to unlock deck collector (progress-based)
    unlockTrophy("deck_collector", { progress: decks.length + 1 })

    // Close the dialog
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  // Show upgrade prompt if free user is at deck limit
  // if (isAtDeckLimit) {
  //   return (
  //     <Dialog open={isOpen} onOpenChange={handleOpenChange}>
  //       <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-md">
  //         <DialogHeader>
  //           <DialogTitle className="flex items-center gap-2 text-slate-100">
  //             <Crown className="h-5 w-5 text-amber-400" />
  //             Deck Limit Reached
  //           </DialogTitle>
  //           <DialogDescription className="text-slate-400">
  //             Free users can create up to 2 decks.
  //           </DialogDescription>
  //         </DialogHeader>

  //         <div className="mt-4 space-y-4">
  //           <div className="rounded-lg bg-slate-800/50 p-4">
  //             <p className="text-sm text-slate-300">
  //               You&apos;ve reached the maximum number of decks for free users.
  //               Upgrade to Pro for unlimited decks and premium features.
  //             </p>
  //             <ul className="mt-3 space-y-2">
  //               <li className="flex items-center gap-2 text-sm text-slate-400">
  //                 <Check className="h-4 w-4 text-amber-400" />
  //                 Unlimited decks
  //               </li>
  //               <li className="flex items-center gap-2 text-sm text-slate-400">
  //                 <Check className="h-4 w-4 text-amber-400" />
  //                 Unlimited exports
  //               </li>
  //               <li className="flex items-center gap-2 text-sm text-slate-400">
  //                 <Check className="h-4 w-4 text-amber-400" />
  //                 Cloud sync & persistent storage
  //               </li>
  //             </ul>
  //           </div>

  //           <div className="flex justify-end gap-2">
  //             <Button
  //               variant="ghost"
  //               onClick={handleCancel}
  //               className="text-slate-400 hover:bg-slate-800 hover:text-slate-200"
  //             >
  //               Cancel
  //             </Button>
  //             <Link href="/upgrade">
  //               <Button
  //                 className="bg-amber-500 text-slate-950 hover:bg-amber-400"
  //                 onClick={handleCancel}
  //               >
  //                 <Crown className="mr-2 h-4 w-4" />
  //                 Upgrade to Pro
  //               </Button>
  //             </Link>
  //           </div>
  //         </div>
  //       </DialogContent>
  //     </Dialog>
  //   )
  // }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <Layers className="h-5 w-5 text-blue-400" />
            Create New Deck
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter a name for your new proxy deck.
            {!isPro && (
              <span className="mt-1 block text-xs text-slate-500">
                Free users can create up to 2 decks ({decks.length}/2 used)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deck-name" className="text-slate-300">
              Deck Name
            </Label>
            <Input
              ref={inputRef}
              id="deck-name"
              value={deckName}
              onChange={(e) => {
                setDeckName(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Gardevoir Deck"
              className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
              maxLength={50}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!deckName.trim() || isLoading}
              className="bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Create Deck
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
