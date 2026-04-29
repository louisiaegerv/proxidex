"use client"

import { useState } from "react"
import { useAuth, SignInButton } from "@clerk/nextjs"
import { Printer, Lock, Loader2, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSubscription } from "@/components/subscription-provider"
import { useTrophyUnlock } from "@/components/trophies/use-trophy-unlock"

interface AuthExportButtonProps {
  onExport: () => void
  disabled?: boolean
  isProcessing?: boolean
}

export function AuthExportButton({
  onExport,
  disabled = false,
  isProcessing = false,
}: AuthExportButtonProps) {
  const { isSignedIn } = useAuth()
  const { subscription, isLoading: isCheckingSubscription } = useSubscription()
  const [isLoading, setIsLoading] = useState(false)
  const { unlockTrophy } = useTrophyUnlock()

  const isPro = subscription?.isPro ?? false

  const handleExport = async () => {
    if (!isSignedIn) return
    setIsLoading(true)

    try {
      await fetch("/api/exports/record", { method: "POST" })
      unlockTrophy("first_export")
      onExport()
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Not signed in - show sign in button
  if (!isSignedIn) {
    return (
      <>
        <SignInButton>
          <Button
            className="w-full bg-blue-600 text-white hover:bg-blue-500"
            disabled={disabled}
          >
            <Lock className="mr-2 h-4 w-4" />
            Export
          </Button>
        </SignInButton>

        <p className="mt-2 text-center text-xs text-slate-500">
          Sign in to export your proxy deck
        </p>
      </>
    )
  }

  // Loading state
  if (isCheckingSubscription) {
    return (
      <Button className="w-full bg-slate-700 text-slate-300" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    )
  }

  // Pro users - single premium export button
  if (isPro) {
    return (
      <Button
        className="w-full border border-amber-400/30 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500"
        disabled={disabled || isLoading || isProcessing}
        onClick={() => {
          setIsLoading(true)
          unlockTrophy("first_export")
          onExport()
          setIsLoading(false)
        }}
      >
        {isLoading || isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Crown className="mr-2 h-4 w-4" />
            Export
          </>
        )}
      </Button>
    )
  }

  // Free users - single export button
  return (
    <Button
      className="w-full bg-blue-600 text-white hover:bg-blue-500"
      disabled={disabled || isLoading || isProcessing}
      onClick={handleExport}
    >
      {isLoading || isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Printer className="mr-2 h-4 w-4" />
          Export
        </>
      )}
    </Button>
  )
}
