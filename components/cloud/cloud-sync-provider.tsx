"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useProxyList } from "@/stores/proxy-list"
import { useSubscription } from "@/components/subscription-provider"
import { SyncIndicator } from "./sync-indicator"
import type { SubscriptionType } from "@/lib/pricing"

/**
 * CloudSyncProvider - Handles automatic cloud sync
 *
 * Pro users:
 *   - Cloud is the ONLY source of truth (no local storage)
 *   - Decks/settings load from cloud on login
 *   - Auto-sync changes to cloud after 3s debounce
 *   - Sync indicator shows status
 *
 * Free users:
 *   - sessionStorage only, no cloud sync
 */

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId } = useAuth()
  const { subscription } = useSubscription()
  const isPro = subscription?.isPro ?? false

  const [syncState, setSyncState] = useState<{
    status: "idle" | "syncing" | "synced" | "error"
    lastSync: string | null
  }>({ status: "idle", lastSync: null })

  // Store selectors
  const decks = useProxyList((state) => state.decks)
  const settings = useProxyList((state) => state.settings)
  const activeDeckId = useProxyList((state) => state.activeDeckId)
  const setUserTier = useProxyList((state) => state.setUserTier)
  const setDecks = useProxyList((state) => state.setDecks)
  const switchDeck = useProxyList((state) => state.switchDeck)
  const updateSettings = useProxyList((state) => state.updateSettings)

  // Flags & refs
  const hasLoadedFromCloud = useRef(false)
  const isSyncing = useRef(false)
  const lastDecksRef = useRef<string>("")
  const lastSettingsRef = useRef<string>("")
  const pendingDeletedIdsRef = useRef<string[]>([])
  const decksTimeout = useRef<NodeJS.Timeout | null>(null)
  const settingsTimeout = useRef<NodeJS.Timeout | null>(null)
  // Suppress auto-sync when we just loaded from cloud (cloud is already source of truth)
  const skipNextDecksSync = useRef(false)
  const skipNextSettingsSync = useRef(false)

  // Sync tier to store so proxy-list knows which storage adapter to use
  useEffect(() => {
    if (!subscription) return
    const tier = subscription.tier as SubscriptionType
    setUserTier(tier)
  }, [subscription, setUserTier])

  // Reset flags on logout
  useEffect(() => {
    if (!isSignedIn) {
      hasLoadedFromCloud.current = false
      lastDecksRef.current = ""
      lastSettingsRef.current = ""
    }
  }, [isSignedIn])

  // Load from cloud ONCE on login
  useEffect(() => {
    if (!isSignedIn || hasLoadedFromCloud.current) return
    // Wait for subscription to finish loading before deciding pro vs free
    if (subscription === null) return

    hasLoadedFromCloud.current = true

    const load = async () => {
      if (!isPro) return

      try {
        // Deck metadata
        const decksRes = await fetch("/api/decks/list")
        if (decksRes.ok) {
          const { decks: cloudDecks } = await decksRes.json()
          if (cloudDecks?.length > 0) {
            const formatted = cloudDecks.map((d: any) => ({
              id: d.id,
              name: d.name,
              items: [],
              isActive: d.isActive,
              createdAt: new Date(d.createdAt).getTime(),
              updatedAt: new Date(d.updatedAt).getTime(),
              _cardCount: d.cardCount,
              _needsLoad: true,
            }))
            skipNextDecksSync.current = true
            setDecks(formatted)
            lastDecksRef.current = JSON.stringify(formatted)

            // Ensure activeDeckId points to a valid cloud deck
            const activeCloudDeck =
              formatted.find((d: any) => d.isActive) ?? formatted[0]
            if (activeCloudDeck && activeCloudDeck.id !== activeDeckId) {
              switchDeck(activeCloudDeck.id)
            }
          }
        }

        // Settings
        const settingsRes = await fetch("/api/user/profile")
        if (settingsRes.ok) {
          const { settings: cloudSettings } = await settingsRes.json()
          if (cloudSettings) {
            skipNextSettingsSync.current = true
            updateSettings(cloudSettings)
            lastSettingsRef.current = JSON.stringify(cloudSettings)
          }
        }
      } catch (err) {
        console.error("[CloudSync] Load failed:", err)
      }
    }

    load()
  }, [
    isSignedIn,
    subscription,
    isPro,
    setDecks,
    switchDeck,
    updateSettings,
    activeDeckId,
    userId,
  ])

  // Lazy-load deck items when selected deck needs it
  useEffect(() => {
    if (!isSignedIn || !activeDeckId || !isPro) return

    const activeDeck = decks.find((d) => d.id === activeDeckId)
    if (!activeDeck?._needsLoad) return

    const loadItems = async () => {
      try {
        const res = await fetch(`/api/decks/${activeDeckId}`)
        if (!res.ok) return
        const { deck: fullDeck } = await res.json()
        const updatedDecks = decks.map((d) =>
          d.id === activeDeckId
            ? {
                ...d,
                items: fullDeck.items,
                _needsLoad: false,
                updatedAt: new Date(fullDeck.updatedAt).getTime(),
              }
            : d
        )
        skipNextDecksSync.current = true
        setDecks(updatedDecks)
        lastDecksRef.current = JSON.stringify(updatedDecks)
      } catch (err) {
        console.error("[CloudSync] Lazy load failed:", err)
      }
    }

    loadItems()
  }, [isSignedIn, isPro, activeDeckId, decks, setDecks])

  // Sync decks to cloud
  const syncDecks = useCallback(async () => {
    if (!isSignedIn || !userId || !isPro || isSyncing.current) return

    const deletedDeckIds = pendingDeletedIdsRef.current
    pendingDeletedIdsRef.current = []

    // Nothing to sync if no decks and no deletes
    if (decks.length === 0 && deletedDeckIds.length === 0) return

    isSyncing.current = true
    setSyncState({ status: "syncing", lastSync: null })

    try {
      // Delete removed decks first
      for (const deckId of deletedDeckIds) {
        await fetch(`/api/decks?id=${encodeURIComponent(deckId)}`, {
          method: "DELETE",
        })
      }

      // Upsert remaining decks
      for (const deck of decks) {
        await fetch("/api/decks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: deck.id,
            name: deck.name,
            items: deck.items,
            isActive: deck.id === activeDeckId,
          }),
        })
      }
      setSyncState({ status: "synced", lastSync: new Date().toISOString() })
      setTimeout(() => {
        setSyncState((p) => ({ ...p, status: "idle" }))
        isSyncing.current = false
      }, 3000)
    } catch {
      setSyncState({ status: "error", lastSync: null })
      isSyncing.current = false
    }
  }, [isSignedIn, userId, isPro, decks, activeDeckId])

  // Sync settings to cloud
  const syncSettings = useCallback(async () => {
    if (!isSignedIn || !userId || !isPro || isSyncing.current) return

    isSyncing.current = true
    setSyncState({ status: "syncing", lastSync: null })

    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })
      setSyncState({ status: "synced", lastSync: new Date().toISOString() })
      setTimeout(() => {
        setSyncState((p) => ({ ...p, status: "idle" }))
        isSyncing.current = false
      }, 3000)
    } catch {
      setSyncState({ status: "error", lastSync: null })
      isSyncing.current = false
    }
  }, [isSignedIn, userId, isPro, settings])

  // Auto-sync decks when they change (3s debounce)
  useEffect(() => {
    if (!isSignedIn || !isPro) return

    const json = JSON.stringify(decks)
    if (json === lastDecksRef.current) return

    // Cloud data was just loaded — no need to sync back up
    if (skipNextDecksSync.current) {
      skipNextDecksSync.current = false
      lastDecksRef.current = json
      return
    }

    // Detect deleted decks BEFORE updating lastDecksRef
    let previousDeckIds: string[] = []
    try {
      const previous = JSON.parse(lastDecksRef.current || "[]")
      previousDeckIds = Array.isArray(previous)
        ? previous.map((d: any) => d.id)
        : []
    } catch {
      previousDeckIds = []
    }
    const currentDeckIds = new Set(decks.map((d) => d.id))
    const newlyDeleted = previousDeckIds.filter((id) => !currentDeckIds.has(id))
    if (newlyDeleted.length > 0) {
      pendingDeletedIdsRef.current = [
        ...pendingDeletedIdsRef.current,
        ...newlyDeleted,
      ]
    }

    lastDecksRef.current = json

    if (decksTimeout.current) clearTimeout(decksTimeout.current)
    decksTimeout.current = setTimeout(() => syncDecks(), 3000)

    return () => {
      if (decksTimeout.current) clearTimeout(decksTimeout.current)
    }
  }, [decks, isSignedIn, isPro, syncDecks])

  // Auto-sync settings when they change (3s debounce)
  useEffect(() => {
    if (!isSignedIn || !isPro) return

    const json = JSON.stringify(settings)
    if (json === lastSettingsRef.current) return

    // Cloud settings were just loaded — no need to sync back up
    if (skipNextSettingsSync.current) {
      skipNextSettingsSync.current = false
      lastSettingsRef.current = json
      return
    }

    lastSettingsRef.current = json

    if (settingsTimeout.current) clearTimeout(settingsTimeout.current)
    settingsTimeout.current = setTimeout(() => syncSettings(), 3000)

    return () => {
      if (settingsTimeout.current) clearTimeout(settingsTimeout.current)
    }
  }, [settings, isSignedIn, isPro, syncSettings])

  return (
    <>
      {children}
      {isSignedIn && isPro && (
        <div className="fixed right-4 bottom-4 z-50">
          <SyncIndicator status={syncState.status} />
        </div>
      )}
    </>
  )
}
