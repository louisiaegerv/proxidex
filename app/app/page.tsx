"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { DeckSidebar } from "@/components/deck/deck-sidebar"
import { LivePreview } from "@/components/proxy/live-preview"
import { SettingsSidebar } from "@/components/proxy/settings-sidebar"
import { MobileLayout } from "@/components/mobile/mobile-layout"
import { MobileSettings } from "@/components/mobile/mobile-settings"
import { MobilePreview } from "@/components/mobile/mobile-preview"

export default function AppPage() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  // Detect mobile viewport on client
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Show nothing during SSR/hydration to prevent mismatch
  if (isMobile === null) {
    return (
      <div className="flex h-dvh flex-col bg-background overscroll-none">
        {/* Loading state - matches desktop structure */}
        <div className="hidden h-14 items-center justify-between border-b border-border bg-muted/50 px-4 lg:flex">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-muted" />
            <div className="h-6 w-32 rounded bg-muted" />
          </div>
        </div>
        <main className="flex flex-1 overflow-hidden">
          <div className="hidden flex-1 lg:flex">
            <div className="w-80 shrink-0 border-r border-border bg-muted/50" />
            <div className="flex-1 bg-background p-6" />
            <div className="w-80 shrink-0 border-l border-border bg-muted/50" />
          </div>
        </main>
      </div>
    )
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex h-dvh flex-col bg-background overscroll-none">
        <MobileLayout
          deckSection={<DeckSidebar variant="mobile" />}
          previewSection={<MobilePreview />}
          settingsSection={<MobileSettings />}
        />
      </div>
    )
  }

  // Desktop Layout
  return (
    <div className="flex h-dvh flex-col bg-background overscroll-none">
      <Header />
      <main className="flex flex-1 overflow-hidden">
        {/* Left: Deck Input Tabs */}
        <div className="w-80 shrink-0 border-r border-border bg-muted/50">
          <DeckSidebar />
        </div>

        {/* Center: Live Preview */}
        <div className="flex-1 overflow-auto bg-background p-6">
          <LivePreview />
        </div>

        {/* Right: Settings & Details */}
        <div className="w-80 shrink-0 border-l border-border bg-muted/50">
          <SettingsSidebar />
        </div>
      </main>
    </div>
  )
}
