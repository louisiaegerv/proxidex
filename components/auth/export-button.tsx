"use client"

import { useState, useEffect } from "react"
import { useAuth, SignInButton } from "@clerk/nextjs"
import { Printer, Lock, Loader2, Zap, Turtle, Crown, Sparkles, HelpCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { FREE_TIER_DAILY_LIMIT, TURBO_EXPORT_LIMIT } from "@/lib/exports"
import { useSubscription } from "@/components/subscription-provider"

interface AuthExportButtonProps {
  onExport: (exportType: 'standard' | 'turbo') => void
  disabled?: boolean
  isProcessing?: boolean
}

type ExportType = "standard" | "turbo"

const TURBO_TRIAL_KEY = "proxidex_turbo_trials"
const MAX_TURBO_TRIALS = 3

export function AuthExportButton({ 
  onExport, 
  disabled = false,
  isProcessing = false 
}: AuthExportButtonProps) {
  const { isSignedIn, userId } = useAuth()
  const { subscription, isLoading: isCheckingSubscription } = useSubscription()
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [remainingExports, setRemainingExports] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [turboTrialsRemaining, setTurboTrialsRemaining] = useState(MAX_TURBO_TRIALS)
  const [activeExportType, setActiveExportType] = useState<ExportType | null>(null)
  
  // Use subscription from context
  const isPro = subscription?.isPro ?? false

  // Load turbo trials from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(TURBO_TRIAL_KEY)
      if (saved !== null) {
        setTurboTrialsRemaining(parseInt(saved, 10))
      }
    }
  }, [])

  // Save turbo trials to localStorage
  const saveTurboTrials = (count: number) => {
    setTurboTrialsRemaining(count)
    if (typeof window !== "undefined") {
      localStorage.setItem(TURBO_TRIAL_KEY, count.toString())
    }
  }

  // Check remaining exports (for free users)
  useEffect(() => {
    if (isSignedIn && !isPro) {
      fetch("/api/exports/remaining")
        .then(r => r.json())
        .then(data => setRemainingExports(data.remaining))
        .catch(console.error)
    }
  }, [isSignedIn, isPro])

  const handleStandardExport = async () => {
    if (!isSignedIn) return
    setActiveExportType("standard")
    setIsLoading(true)

    try {
      // Check if user can export
      const response = await fetch("/api/exports/check", { method: "POST" })
      const data = await response.json()

      if (data.canExport) {
        // Record the export
        await fetch("/api/exports/record", { method: "POST" })
        
        // Update remaining count
        setRemainingExports((prev) => (prev !== null ? prev - 1 : null))

        onExport('standard')
      } else {
        setShowLimitDialog(true)
      }
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsLoading(false)
      setActiveExportType(null)
    }
  }

  const handleTurboExport = async () => {
    if (!isSignedIn) return
    if (turboTrialsRemaining <= 0) return

    setActiveExportType("turbo")
    setIsLoading(true)

    try {
      // Check if user can export
      const response = await fetch("/api/exports/check", { method: "POST" })
      const data = await response.json()

      if (data.canExport) {
        // Record the export
        await fetch("/api/exports/record", { method: "POST" })

        // Decrement turbo trial
        saveTurboTrials(turboTrialsRemaining - 1)

        // Update remaining count
        setRemainingExports((prev) => (prev !== null ? prev - 1 : null))

        onExport('turbo')
      } else {
        setShowLimitDialog(true)
      }
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsLoading(false)
      setActiveExportType(null)
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
          Free: {FREE_TIER_DAILY_LIMIT} export per day • {TURBO_EXPORT_LIMIT} Turbo trials
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
      <>
        <Button
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 border border-amber-400/30"
          disabled={disabled || isLoading || isProcessing}
          onClick={() => {
            setIsLoading(true)
            onExport('turbo')
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
              Export PDF
            </>
          )}
        </Button>
        
        <div className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-amber-400/80">
          <Sparkles className="h-3 w-3" />
          <span>Unlimited Pro Export</span>
        </div>
      </>
    )
  }

  // Free users - dual export options
  const hasDailyExport = remainingExports !== null && remainingExports > 0
  const hasTurboTrials = turboTrialsRemaining > 0
  const isTurboExhausted = turboTrialsRemaining === 0

  return (
    <>
      <div className="space-y-2">
        {/* Standard Export - Always available but slower */}
        <Button
          variant="outline"
          className="w-full border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-slate-200"
          disabled={disabled || isLoading || isProcessing || !hasDailyExport}
          onClick={handleStandardExport}
        >
          {isLoading && activeExportType === "standard" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Turtle className="mr-2 h-4 w-4 text-slate-400" />
              Standard Export
            </>
          )}
        </Button>
        
        {/* Standard export info */}
        <div className="flex items-center justify-center px-1">
          {remainingExports !== null && (
            <span className={`text-[10px] ${remainingExports === 0 ? 'text-amber-400' : 'text-slate-500'}`}>
              {remainingExports === 0 
                ? 'Daily limit reached' 
                : `${remainingExports} remaining today`}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700/50" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-950 px-2 text-[10px] text-slate-600">or</span>
          </div>
        </div>

        {/* Turbo Export - Fast but limited trials */}
        {isTurboExhausted ? (
          // Turbo exhausted - show Pro-only button
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-slate-700 bg-slate-900/50 text-slate-500 cursor-help"
                disabled={disabled || !hasDailyExport}
              >
                <Zap className="mr-2 h-4 w-4 text-slate-600" />
                <span className="line-through decoration-slate-600">Turbo Export</span>
                <span className="ml-2 flex items-center gap-0.5 text-amber-500">
                  <Crown className="h-3 w-3" />
                  Pro Only
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-64 border-slate-700 bg-slate-900 p-3"
              side="top"
              align="center"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-200">
                  Turbo Export Unlocked with Pro
                </p>
                <p className="text-xs text-slate-400">
                  You&apos;ve used all your free Turbo trials. Upgrade to Pro for unlimited fast exports.
                </p>
                <Link href="/upgrade">
                  <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-500 text-white mt-2">
                    <Crown className="mr-1.5 h-3 w-3" />
                    Upgrade to Pro
                  </Button>
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          // Turbo available
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20"
            disabled={disabled || isLoading || isProcessing || !hasDailyExport}
            onClick={handleTurboExport}
          >
            {isLoading && activeExportType === "turbo" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Turbo Export
                <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
                  {turboTrialsRemaining} left
                </span>
              </>
            )}
          </Button>
        )}

        {/* Turbo export info */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-slate-500">
            Priority processing
          </span>
          {!isTurboExhausted ? (
            <span className="text-[10px] text-blue-400/80">
              Free trial
            </span>
          ) : (
            <span className="text-[10px] text-amber-500/80">
              Upgrade for unlimited
            </span>
          )}
        </div>
      </div>

      {/* Help/info popover */}
      <div className="mt-2 flex justify-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
              <HelpCircle className="h-3 w-3" />
              What&apos;s the difference?
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-72 border-slate-700 bg-slate-900 p-3"
            side="top"
            align="center"
          >
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800">
                  <Turtle className="h-3 w-3 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-300">Standard Export</p>
                  <p className="text-[10px] text-slate-500">
                    Standard processing. Included with your free daily export.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-500/20">
                  <Zap className="h-3 w-3 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-300">Turbo Export</p>
                  <p className="text-[10px] text-slate-500">
                    Lightning-fast processing, no waiting. {MAX_TURBO_TRIALS} free trials, then Pro only.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500/20">
                  <Crown className="h-3 w-3 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-300">Pro Export</p>
                  <p className="text-[10px] text-slate-500">
                    Unlimited Turbo exports, plus premium features. Upgrade anytime.
                  </p>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Limit Reached Dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="border-slate-800 bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Daily Limit Reached</DialogTitle>
            <DialogDescription className="text-slate-400">
              You&apos;ve used your free export for today. Upgrade to Pro for unlimited exports.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-slate-800 p-4">
              <h4 className="font-semibold text-slate-100 flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" />
                Pro Tier
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Unlimited Turbo exports
                </li>
                <li>✓ Save unlimited decks</li>
                <li>✓ Cloud sync across devices</li>
                <li>✓ Priority support</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Link href="/upgrade" className="flex-1">
                <Button className="w-full bg-amber-600 hover:bg-amber-500">
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="flex-1 border-slate-700"
                onClick={() => setShowLimitDialog(false)}
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
