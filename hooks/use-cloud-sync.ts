/**
 * Auto-sync hook for cloud persistence
 * 
 * Automatically syncs decks and settings to cloud when:
 * - User is logged in
 * - Data changes (with debouncing)
 * - User has Pro tier (for now, we'll check this)
 * 
 * Shows sync status indicator
 */

import { useEffect, useRef, useCallback, useState } from "react"
import { useAuth } from "@clerk/nextjs"

interface SyncState {
  status: "idle" | "syncing" | "synced" | "error"
  lastSyncedAt: string | null
  error: string | null
}

interface UseCloudSyncOptions {
  // Data to sync
  decks: any[]
  settings: any
  activeDeckId: string | null
  
  // Debounce delay in ms (default: 3000ms = 3 seconds)
  debounceMs?: number
}

export function useCloudSync({
  decks,
  settings,
  activeDeckId,
  debounceMs = 3000
}: UseCloudSyncOptions) {
  const { isSignedIn, userId } = useAuth()
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
    lastSyncedAt: null,
    error: null
  })
  
  // Use refs to track timeouts and prevent stale closures
  const deckSyncTimeout = useRef<NodeJS.Timeout | null>(null)
  const settingsSyncTimeout = useRef<NodeJS.Timeout | null>(null)
  const lastDecksRef = useRef<string>("")
  const lastSettingsRef = useRef<string>("")
  
  // Sync a single deck to cloud
  const syncDeck = useCallback(async (deck: any) => {
    if (!isSignedIn || !userId) return
    
    setSyncState(prev => ({ ...prev, status: "syncing" }))
    
    try {
      const response = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deck.id,
          name: deck.name,
          items: deck.items,
          isActive: deck.id === activeDeckId
        })
      })
      
      if (!response.ok) throw new Error("Failed to sync deck")
      
      const data = await response.json()
      setSyncState({
        status: "synced",
        lastSyncedAt: data.syncedAt,
        error: null
      })
      
      // Reset to idle after 3 seconds
      setTimeout(() => {
        setSyncState(prev => ({ ...prev, status: "idle" }))
      }, 3000)
      
    } catch (error) {
      console.error("Sync failed:", error)
      setSyncState(prev => ({
        ...prev,
        status: "error",
        error: "Failed to sync to cloud"
      }))
    }
  }, [isSignedIn, userId, activeDeckId])
  
  // Sync settings to cloud
  const syncSettings = useCallback(async () => {
    if (!isSignedIn || !userId) return
    
    setSyncState(prev => ({ ...prev, status: "syncing" }))
    
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings })
      })
      
      if (!response.ok) throw new Error("Failed to sync settings")
      
      const data = await response.json()
      setSyncState({
        status: "synced",
        lastSyncedAt: data.syncedAt,
        error: null
      })
      
      setTimeout(() => {
        setSyncState(prev => ({ ...prev, status: "idle" }))
      }, 3000)
      
    } catch (error) {
      console.error("Settings sync failed:", error)
      setSyncState(prev => ({
        ...prev,
        status: "error",
        error: "Failed to sync settings"
      }))
    }
  }, [isSignedIn, userId, settings])
  
  // Auto-sync decks when they change
  useEffect(() => {
    if (!isSignedIn || !userId || decks.length === 0) return
    
    // Serialize current decks
    const currentDecksJson = JSON.stringify(decks)
    
    // Skip if nothing changed
    if (currentDecksJson === lastDecksRef.current) return
    
    lastDecksRef.current = currentDecksJson
    
    // Clear existing timeout
    if (deckSyncTimeout.current) {
      clearTimeout(deckSyncTimeout.current)
    }
    
    // Debounce and sync
    deckSyncTimeout.current = setTimeout(() => {
      // Sync the active deck (or all decks if needed)
      const activeDeck = decks.find(d => d.id === activeDeckId) || decks[0]
      if (activeDeck) {
        syncDeck(activeDeck)
      }
    }, debounceMs)
    
    return () => {
      if (deckSyncTimeout.current) {
        clearTimeout(deckSyncTimeout.current)
      }
    }
  }, [decks, activeDeckId, isSignedIn, userId, debounceMs, syncDeck])
  
  // Auto-sync settings when they change
  useEffect(() => {
    if (!isSignedIn || !userId) return
    
    const currentSettingsJson = JSON.stringify(settings)
    
    if (currentSettingsJson === lastSettingsRef.current) return
    
    lastSettingsRef.current = currentSettingsJson
    
    if (settingsSyncTimeout.current) {
      clearTimeout(settingsSyncTimeout.current)
    }
    
    settingsSyncTimeout.current = setTimeout(() => {
      syncSettings()
    }, debounceMs)
    
    return () => {
      if (settingsSyncTimeout.current) {
        clearTimeout(settingsSyncTimeout.current)
      }
    }
  }, [settings, isSignedIn, userId, debounceMs, syncSettings])
  
  // Manual sync trigger (for explicit save button)
  const triggerManualSync = useCallback(async () => {
    const activeDeck = decks.find(d => d.id === activeDeckId) || decks[0]
    if (activeDeck) {
      await syncDeck(activeDeck)
    }
    await syncSettings()
  }, [decks, activeDeckId, syncDeck, syncSettings])
  
  return {
    syncState,
    triggerManualSync
  }
}

// Hook to load decks from cloud on initial load
export function useLoadCloudDecks() {
  const { isSignedIn } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [cloudDecks, setCloudDecks] = useState<any[]>([])
  const hasLoaded = useRef(false)
  
  useEffect(() => {
    if (!isSignedIn || hasLoaded.current) return
    
    const loadDecks = async () => {
      try {
        const response = await fetch("/api/decks")
        if (response.ok) {
          const data = await response.json()
          setCloudDecks(data.decks)
        }
      } catch (error) {
        console.error("Failed to load cloud decks:", error)
      } finally {
        setIsLoading(false)
        hasLoaded.current = true
      }
    }
    
    loadDecks()
  }, [isSignedIn])
  
  return { isLoading, cloudDecks }
}

// Hook to load settings from cloud
export function useLoadCloudSettings() {
  const { isSignedIn } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [cloudSettings, setCloudSettings] = useState<any>(null)
  const hasLoaded = useRef(false)
  
  useEffect(() => {
    if (!isSignedIn || hasLoaded.current) return
    
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/user/profile")
        if (response.ok) {
          const data = await response.json()
          setCloudSettings(data.settings)
        }
      } catch (error) {
        console.error("Failed to load cloud settings:", error)
      } finally {
        setIsLoading(false)
        hasLoaded.current = true
      }
    }
    
    loadSettings()
  }, [isSignedIn])
  
  return { isLoading, cloudSettings }
}
