"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useProxyList } from "@/stores/proxy-list"
import { useSubscription } from "@/components/subscription-provider"
import { SyncIndicator } from "./sync-indicator"
import type { SubscriptionType } from "@/lib/pricing"

/**
 * CloudSyncProvider - Handles automatic cloud sync and tier-based storage
 * 
 * Features:
 * - Fetches user subscription tier on login
 * - Sets up tiered storage (sessionStorage for free, localStorage for pro)
 * - Auto-migrates data when user upgrades
 * - Auto-syncs decks and settings to cloud for pro users
 * - Loads from cloud on initial login
 */

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId } = useAuth()
  const { subscription } = useSubscription()
  const [syncState, setSyncState] = useState<{
    status: "idle" | "syncing" | "synced" | "error"
    lastSync: string | null
  }>({ status: "idle", lastSync: null })
  
  // Get store values
  const decks = useProxyList((state) => state.decks)
  const settings = useProxyList((state) => state.settings)
  const activeDeckId = useProxyList((state) => state.activeDeckId)
  const userTier = useProxyList((state) => state.userTier)
  const setUserTier = useProxyList((state) => state.setUserTier)
  const setDecks = useProxyList((state) => state.setDecks)
  const updateSettings = useProxyList((state) => state.updateSettings)
  
  // Track loading and sync state
  const hasLoadedFromCloud = useRef(false)
  const hasFetchedSubscription = useRef(false)
  const isSyncing = useRef(false)
  const lastDecksRef = useRef<string>("")
  const lastSettingsRef = useRef<string>("")
  const syncTimeout = useRef<NodeJS.Timeout | null>(null)
  
  // Sync subscription tier from context to store
  useEffect(() => {
    if (!isSignedIn || !subscription || hasFetchedSubscription.current) return
    
    hasFetchedSubscription.current = true
    
    const tier = subscription.tier as SubscriptionType
    console.log("[CloudSync] User tier:", tier)
    
    // This will trigger migration if upgrading from free to pro
    setUserTier(tier)
  }, [isSignedIn, subscription, setUserTier])
  
  // Reset flags on logout
  useEffect(() => {
    if (!isSignedIn) {
      hasLoadedFromCloud.current = false
      hasFetchedSubscription.current = false
      lastDecksRef.current = ""
      lastSettingsRef.current = ""
    }
  }, [isSignedIn])
  
  // Load deck list (metadata only) from cloud ONCE on login (for pro users)
  useEffect(() => {
    if (!isSignedIn || hasLoadedFromCloud.current) return
    if (userTier === "free") return // Only load from cloud for pro users initially
    
    // Wait for subscription to be fetched first
    if (!hasFetchedSubscription.current) return
    
    // Mark as loaded immediately to prevent re-runs
    hasLoadedFromCloud.current = true
    
    const loadDeckListFromCloud = async () => {
      try {
        console.log("[CloudSync] Loading deck list from cloud...")
        
        // Load deck list (metadata only - no card items)
        const decksResponse = await fetch("/api/decks/list")
        if (decksResponse.ok) {
          const { decks: cloudDecks } = await decksResponse.json()
          
          if (cloudDecks && cloudDecks.length > 0) {
            // Convert to minimal deck objects (items will be lazy-loaded)
            // Initialize with empty items array - they'll be fetched when deck is selected
            const formattedDecks = cloudDecks.map((d: any) => ({
              id: d.id,
              name: d.name,
              items: [], // Empty initially - lazy loaded when selected
              isActive: d.isActive,
              createdAt: new Date(d.createdAt).getTime(),
              updatedAt: new Date(d.updatedAt).getTime(),
              _cardCount: d.cardCount, // Estimated card count for UI
              _needsLoad: true // Flag to indicate items need to be loaded
            }))
            
            // Update store with deck list
            setDecks(formattedDecks)
            
            // Update reference so we don't immediately re-sync
            lastDecksRef.current = JSON.stringify(formattedDecks)
            
            console.log("[CloudSync] Loaded", formattedDecks.length, "deck metadata from cloud")
          }
        }
        
        // Load settings
        const settingsResponse = await fetch("/api/user/profile")
        if (settingsResponse.ok) {
          const { settings: cloudSettings } = await settingsResponse.json()
          
          if (cloudSettings) {
            updateSettings(cloudSettings)
            lastSettingsRef.current = JSON.stringify(cloudSettings)
            console.log("[CloudSync] Loaded settings from cloud")
          }
        }
      } catch (error) {
        console.error("[CloudSync] Failed to load from cloud:", error)
      }
    }
    
    loadDeckListFromCloud()
  }, [isSignedIn, userTier, setDecks, updateSettings])
  
  // Lazy load deck items when a deck is selected and needs loading
  const loadDeckItems = useCallback(async (deckId: string) => {
    if (!isSignedIn) return
    
    const deck = decks.find(d => d.id === deckId)
    if (!deck?._needsLoad) return // Already loaded or local deck
    
    try {
      console.log("[CloudSync] Lazy loading deck items:", deckId)
      
      const response = await fetch(`/api/decks/${deckId}`)
      if (response.ok) {
        const { deck: fullDeck } = await response.json()
        
        // Update the deck with full items
        setDecks(decks.map(d => 
          d.id === deckId 
            ? {
                ...d,
                items: fullDeck.items,
                _needsLoad: false,
                updatedAt: new Date(fullDeck.updatedAt).getTime()
              }
            : d
        ))
        
        console.log("[CloudSync] Loaded", fullDeck.items.length, "items for deck", deckId)
      }
    } catch (error) {
      console.error("[CloudSync] Failed to load deck items:", error)
    }
  }, [isSignedIn, decks, setDecks])
  
  // Sync decks to cloud (for pro users)
  const syncDecksToCloud = useCallback(async () => {
    if (!isSignedIn || !userId || decks.length === 0 || isSyncing.current) return
    if (userTier === "free") return // Don't sync to cloud for free users
    
    isSyncing.current = true
    setSyncState((prev) => ({ ...prev, status: "syncing" }))
    
    try {
      for (const deck of decks) {
        await fetch("/api/decks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: deck.id,
            name: deck.name,
            items: deck.items,
            isActive: deck.id === activeDeckId
          })
        })
      }
      
      setSyncState({
        status: "synced",
        lastSync: new Date().toISOString()
      })
      
      setTimeout(() => {
        setSyncState((prev) => ({ ...prev, status: "idle" }))
        isSyncing.current = false
      }, 3000)
      
    } catch (error) {
      console.error("[CloudSync] Failed to sync decks:", error)
      setSyncState((prev) => ({ ...prev, status: "error" }))
      isSyncing.current = false
    }
  }, [isSignedIn, userId, decks, activeDeckId, userTier])
  
  // Sync settings to cloud (for pro users)
  const syncSettingsToCloud = useCallback(async () => {
    if (!isSignedIn || !userId || isSyncing.current) return
    if (userTier === "free") return // Don't sync to cloud for free users
    
    isSyncing.current = true
    setSyncState((prev) => ({ ...prev, status: "syncing" }))
    
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings })
      })
      
      setSyncState({
        status: "synced",
        lastSync: new Date().toISOString()
      })
      
      setTimeout(() => {
        setSyncState((prev) => ({ ...prev, status: "idle" }))
        isSyncing.current = false
      }, 3000)
      
    } catch (error) {
      console.error("[CloudSync] Failed to sync settings:", error)
      setSyncState((prev) => ({ ...prev, status: "error" }))
      isSyncing.current = false
    }
  }, [isSignedIn, userId, settings, userTier])
  
  // Auto-sync decks when they change (with debounce) - only for pro users
  useEffect(() => {
    if (!isSignedIn || !hasLoadedFromCloud.current) return
    if (userTier === "free") return
    
    const currentDecksJson = JSON.stringify(decks)
    
    // Skip if unchanged
    if (currentDecksJson === lastDecksRef.current) return
    
    // Update reference
    lastDecksRef.current = currentDecksJson
    
    // Debounce sync
    if (syncTimeout.current) clearTimeout(syncTimeout.current)
    syncTimeout.current = setTimeout(() => {
      syncDecksToCloud()
    }, 3000)
    
    return () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current)
    }
  }, [decks, isSignedIn, syncDecksToCloud, userTier])
  
  // Auto-sync settings when they change (with debounce) - only for pro users
  useEffect(() => {
    if (!isSignedIn || !hasLoadedFromCloud.current) return
    if (userTier === "free") return
    
    const currentSettingsJson = JSON.stringify(settings)
    
    // Skip if unchanged
    if (currentSettingsJson === lastSettingsRef.current) return
    
    // Update reference
    lastSettingsRef.current = currentSettingsJson
    
    // Debounce sync
    if (syncTimeout.current) clearTimeout(syncTimeout.current)
    syncTimeout.current = setTimeout(() => {
      syncSettingsToCloud()
    }, 3000)
    
    return () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current)
    }
  }, [settings, isSignedIn, syncSettingsToCloud, userTier])
  
  // Lazy load deck items when active deck changes and needs loading
  useEffect(() => {
    if (!isSignedIn || !activeDeckId) return
    
    const activeDeck = decks.find(d => d.id === activeDeckId)
    if (activeDeck?._needsLoad) {
      loadDeckItems(activeDeckId)
    }
  }, [isSignedIn, activeDeckId, decks, loadDeckItems])
  
  return (
    <>
      {children}
      {isSignedIn && userTier !== "free" && (
        <div className="fixed bottom-4 right-4 z-50">
          <SyncIndicator status={syncState.status} />
        </div>
      )}
    </>
  )
}
