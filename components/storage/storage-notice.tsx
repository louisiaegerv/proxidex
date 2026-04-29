"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, X, Crown } from "lucide-react"
import Link from "next/link"
import { useStorageNotice, useIsPro, useProxyList } from "@/stores/proxy-list"

/**
 * StorageNotice - Shows a banner for free users explaining their data is temporary
 *
 * Features:
 * - Displays when user is on free tier
 * - Explains that data clears when tab closes
 * - Provides CTA to upgrade to Pro
 * - Can be dismissed for current session
 */

interface StorageNoticeProps {
  className?: string
  variant?: "banner" | "inline" | "compact"
}

export function StorageNotice({
  className = "",
  variant = "banner",
}: StorageNoticeProps) {
  const isPro = useIsPro()
  const { showStorageNotice } = useStorageNotice()
  const dismissStorageNotice = useProxyList(
    (state) => state.dismissStorageNotice
  )
  const [isVisible, setIsVisible] = useState(false)

  // Delay showing to prevent flash on load
  useEffect(() => {
    if (showStorageNotice && !isPro) {
      const timer = setTimeout(() => setIsVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [showStorageNotice, isPro])

  const handleDismiss = () => {
    setIsVisible(false)
    dismissStorageNotice() // This persists the dismissal
  }

  // Don't render if user is Pro or notice is dismissed
  if (isPro || !isVisible) return null

  if (variant === "compact") {
    return (
      <div
        className={`rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 ${className}`}
      >
        <div className="flex items-center gap-2 text-xs text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Data clears when tab closes</span>
          <Link
            href="/pricing"
            className="shrink-0 font-medium text-amber-300 hover:text-amber-200 hover:underline"
          >
            Upgrade
          </Link>
        </div>
      </div>
    )
  }

  if (variant === "inline") {
    return (
      <div
        className={`rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 ${className}`}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="font-medium text-amber-200">
              Your decks are temporary
            </p>
            <p className="mt-1 text-sm text-amber-200/80">
              Free accounts use session storage. Your decks will be cleared when
              you close this tab.
            </p>
            <Link
              href="/pricing"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-amber-300 hover:text-amber-200 hover:underline"
            >
              <Crown className="h-3.5 w-3.5" />
              Upgrade to Pro to save permanently
            </Link>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded p-1 text-amber-400/60 hover:bg-amber-500/20 hover:text-amber-400"
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // Default banner variant
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 p-4 ${className}`}
    >
      {/* Animated background effect */}
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-amber-500/0 via-amber-400/5 to-amber-500/0" />

      <div className="relative flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-amber-200">
            Sign in & upgrade to Pro to save your changes
          </h4>
          <p className="mt-1 text-sm text-amber-200/70">
            Free accounts use temporary storage. Your data will be cleared when
            you close this browser tab.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
            >
              <Crown className="h-3.5 w-3.5" />
              Upgrade to Pro
            </Link>
            <button
              onClick={handleDismiss}
              className="text-sm text-amber-200/60 hover:text-amber-200"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-amber-400/60 hover:bg-amber-500/20 hover:text-amber-400"
          aria-label="Dismiss notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * StorageNoticeBadge - Small badge for header/toolbar areas
 */
export function StorageNoticeBadge() {
  const isPro = useIsPro()

  if (isPro) return null

  return (
    <Link
      href="/upgrade"
      className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300 transition-colors hover:bg-amber-500/20"
      title="Free tier - data clears when tab closes. Click to upgrade."
    >
      <AlertTriangle className="h-3 w-3" />
      <span>Temporary storage</span>
    </Link>
  )
}
