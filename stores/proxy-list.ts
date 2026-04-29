import { create } from "zustand"
import { persist, createJSONStorage, StateStorage } from "zustand/middleware"
import type { ProxyItem, PrintSettings, Deck } from "@/types"
import type { SubscriptionType } from "@/lib/pricing"

import { FREE_TIER_DECK_MAX_CARDS } from "@/lib/exports"
import { getImageUrl } from "@/lib/images"

// Stable empty array to avoid new references on every call
const EMPTY_ARRAY: ProxyItem[] = []

interface ProxyListState {
  // Multi-deck structure
  decks: Deck[]
  activeDeckId: string | null

  // User subscription tier (affects storage)
  userTier: SubscriptionType
  setUserTier: (tier: SubscriptionType) => void

  // Storage notice for UI
  showStorageNotice: boolean
  setShowStorageNotice: (show: boolean) => void
  storageNoticeDismissed: boolean // Persisted: true if user dismissed it
  dismissStorageNotice: () => void

  // Deck management methods
  createDeck: (name: string) => string | null
  switchDeck: (deckId: string) => void
  renameDeck: (deckId: string, name: string) => void
  deleteDeck: (deckId: string) => void
  getActiveDeck: () => Deck | null
  getDeckById: (deckId: string) => Deck | undefined

  // Proxy list methods (operate on active deck)
  getItems: () => ProxyItem[]
  setItems: (items: ProxyItem[]) => void
  setDecks: (decks: Deck[]) => void
  canAddCards: (count: number) => {
    allowed: boolean
    reason?: string
    currentCount?: number
    maxAllowed?: number
    canAdd?: number
  }
  addItem: (
    card: {
      cardId: string
      name: string
      image: string | undefined
      setName: string
      setId: string
      localId: string
      variant?: "normal" | "holo" | "reverse"
    },
    quantity?: number
  ) => void
  removeItem: (id: string) => void
  removeItems: (ids: string[]) => void
  updateQuantity: (id: string, quantity: number) => void
  updateVariant: (id: string, variant: "normal" | "holo" | "reverse") => void
  reorderItems: (startIndex: number, endIndex: number) => void
  reorderItemsById: (activeId: string, overId: string) => void
  updateItemCard: (id: string, cardData: Partial<ProxyItem>) => void
  clearList: () => void
  getTotalCards: () => number
  getItemCount: () => number
  hasItems: () => boolean
  getTotalCardCount: () => number

  // Selection state for bulk operations
  selectedIds: Set<string>
  isBulkMode: boolean
  lastSelectedId: string | null
  toggleBulkMode: () => void
  selectItem: (id: string) => void
  deselectItem: (id: string) => void
  toggleSelection: (id: string) => void
  selectRange: (startId: string, endId: string) => void
  selectAll: () => void
  deselectAll: () => void
  clearSelection: () => void
  getSelectedCount: () => number

  // Print settings
  settings: PrintSettings
  updateSettings: (settings: Partial<PrintSettings>) => void
  resetSettings: () => void

  // PDF Generation state
  isGenerating: boolean
  setIsGenerating: (isGenerating: boolean) => void
  generationProgress: {
    stage: string
    current: number
    total: number
    message: string
  } | null
  setGenerationProgress: (
    progress: {
      stage: string
      current: number
      total: number
      message: string
    } | null
  ) => void
}

// Storage version for migrations
const STORAGE_VERSION = 3

// Storage key — free users only. Pro users use cloud (no local storage).
const FREE_STORAGE_KEY = "proxidex-proxy-list-free"

// Track current user tier so storage adapter can behave correctly
let currentUserTier: SubscriptionType = "free"

// Track if migration has been attempted this session
let hasAttemptedMigration = false

/**
 * Create a storage adapter that uses sessionStorage for free users
 * and NO local storage for Pro users (cloud is source of truth).
 *
 * - Pro users: return null on read, no-op on write
 * - Free users: sessionStorage
 * - Guests (not logged in): sessionStorage (tab-scoped, lost on close)
 */
function createTieredStorage(): StateStorage {
  return {
    getItem: (name: string): string | null => {
      if (typeof window === "undefined") return null

      // Pro users: cloud is source of truth, never load from local storage
      if (isProTier(currentUserTier)) {
        return null
      }

      // Free users: use sessionStorage
      return sessionStorage.getItem(name)
    },

    setItem: (name: string, value: string): void => {
      if (typeof window === "undefined") return

      // Pro users: cloud is source of truth, don't save locally
      if (isProTier(currentUserTier)) {
        return
      }

      // Free users: use sessionStorage
      sessionStorage.setItem(name, value)
    },

    removeItem: (name: string): void => {
      if (typeof window === "undefined") return

      if (isProTier(currentUserTier)) {
        return
      }

      sessionStorage.removeItem(name)
    },
  }
}

/**
 * Check if user has Pro tier (any paid tier)
 */
function isProTier(tier: string): boolean {
  return tier !== "free" && tier !== ""
}

export const useProxyList = create<ProxyListState>()(
  persist(
    (set, get) => ({
      // Initial state
      decks: [],
      activeDeckId: null,
      userTier: "free",
      showStorageNotice: false,
      storageNoticeDismissed: false,
      selectedIds: new Set(),
      isBulkMode: false,
      lastSelectedId: null,
      isGenerating: false,
      generationProgress: null,
      settings: {
        pageSize: "letter",
        cardsPerRow: 3,
        rowsPerPage: 3,
        cardWidth: 63,
        cardHeight: 88,
        bleed: 0,
        gap: 2,
        showCutLines: true,
        imageQuality: "high",
        offsetX: 0,
        offsetY: 0,
        bleedMethod: "replicate",
      },

      // Set user tier and handle storage migration
      setUserTier: (tier: SubscriptionType) => {
        const currentTier = get().userTier
        const wasFree = !isProTier(currentTier)
        const isNowPro = isProTier(tier)

        // Update module-level tier so storage adapter behaves correctly
        currentUserTier = tier

        // If upgrading from free to pro, clear local sessionStorage
        // so next refresh doesn't load stale free data before cloud sync
        if (wasFree && isNowPro && typeof window !== "undefined") {
          console.log(
            "[Storage] User upgraded to Pro, clearing local sessionStorage..."
          )
          sessionStorage.removeItem(FREE_STORAGE_KEY)
        }

        // Only show storage notice if user hasn't dismissed it before
        const { storageNoticeDismissed } = get()
        set({
          userTier: tier,
          showStorageNotice: !isNowPro && !storageNoticeDismissed,
        })
      },

      setShowStorageNotice: (show: boolean) => {
        set({ showStorageNotice: show })
      },

      dismissStorageNotice: () => {
        set({ showStorageNotice: false, storageNoticeDismissed: true })
      },

      // Deck management
      createDeck: (name: string) => {
        const { decks, userTier } = get()

        // Check if free user has reached deck limit (2 decks)
        if (!isProTier(userTier) && decks.length >= 2) {
          return null
        }

        const now = Date.now()
        const newDeck: Deck = {
          id: `deck-${now}`,
          name,
          items: [],
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          decks: [...state.decks, newDeck],
          activeDeckId: newDeck.id,
        }))

        return newDeck.id
      },

      switchDeck: (deckId: string) => {
        set({
          activeDeckId: deckId,
          selectedIds: new Set(),
          isBulkMode: false,
          lastSelectedId: null,
        })
      },

      renameDeck: (deckId: string, name: string) => {
        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === deckId ? { ...deck, name, updatedAt: Date.now() } : deck
          ),
        }))
      },

      deleteDeck: (deckId: string) => {
        set((state) => {
          const newDecks = state.decks.filter((d) => d.id !== deckId)
          const newActiveDeckId =
            state.activeDeckId === deckId
              ? newDecks.length > 0
                ? newDecks[0].id
                : null
              : state.activeDeckId

          return {
            decks: newDecks,
            activeDeckId: newActiveDeckId,
            selectedIds: new Set(),
            isBulkMode: false,
            lastSelectedId: null,
          }
        })
      },

      getActiveDeck: () => {
        const { decks, activeDeckId } = get()
        if (!activeDeckId) return null
        return decks.find((d) => d.id === activeDeckId) || null
      },

      getDeckById: (deckId: string) => {
        return get().decks.find((d) => d.id === deckId)
      },

      getItems: () => {
        const { decks, activeDeckId } = get()
        if (!activeDeckId) return EMPTY_ARRAY
        const activeDeck = decks.find((d) => d.id === activeDeckId)
        return activeDeck?.items ?? EMPTY_ARRAY
      },

      setItems: (items: ProxyItem[]) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? { ...deck, items, updatedAt: Date.now() }
              : deck
          ),
        }))
      },

      setDecks: (decks: Deck[]) => {
        set({ decks })
      },

      // Actions - operate on active deck
      canAddCards: (count: number) => {
        const { userTier, getActiveDeck } = get()
        const activeDeck = getActiveDeck()

        // Pro users have no limit
        if (userTier !== "free") return { allowed: true }

        // Free tier: check deck size limit
        const currentCount = activeDeck?.items.length || 0
        const wouldExceed = currentCount + count > FREE_TIER_DECK_MAX_CARDS

        if (wouldExceed) {
          return {
            allowed: false,
            reason: `Free tier: Max ${FREE_TIER_DECK_MAX_CARDS} cards per deck. Upgrade to Pro for unlimited.`,
            currentCount,
            maxAllowed: FREE_TIER_DECK_MAX_CARDS,
            canAdd: Math.max(0, FREE_TIER_DECK_MAX_CARDS - currentCount),
          }
        }

        return { allowed: true }
      },

      addItem: (card, quantity = 1) => {
        let targetDeckId = get().activeDeckId

        // Auto-create default deck if none exists
        if (!targetDeckId || !get().decks.find((d) => d.id === targetDeckId)) {
          const now = Date.now()
          const defaultDeck: Deck = {
            id: `deck-${now}`,
            name: "Default Deck",
            items: [],
            createdAt: now,
            updatedAt: now,
          }
          set((state) => ({
            decks: [...state.decks, defaultDeck],
            activeDeckId: defaultDeck.id,
          }))
          targetDeckId = defaultDeck.id
        }

        // Check free tier deck size limit
        const targetDeck = get().decks.find((d) => d.id === targetDeckId)
        if (get().userTier === "free" && targetDeck) {
          const currentCount = targetDeck.items.length
          if (currentCount + quantity > FREE_TIER_DECK_MAX_CARDS) {
            // Only add up to the limit
            const allowedCount = Math.max(
              0,
              FREE_TIER_DECK_MAX_CARDS - currentCount
            )
            if (allowedCount === 0) {
              console.warn(
                `[ProxyList] Free tier deck limit reached (${FREE_TIER_DECK_MAX_CARDS} cards)`
              )
              return
            }
            // Adjust quantity to not exceed limit
            quantity = allowedCount
          }
        }

        const newItems: ProxyItem[] = []
        const baseId = `${card.cardId}-${Date.now()}`

        for (let i = 0; i < quantity; i++) {
          newItems.push({
            id: `${baseId}-${i}`,
            cardId: card.cardId,
            name: card.name,
            image: card.image,
            setName: card.setName,
            setId: card.setId,
            localId: card.localId,
            variant: card.variant || "normal",
          })
        }

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === targetDeckId
              ? {
                  ...deck,
                  items: [...deck.items, ...newItems],
                  updatedAt: Date.now(),
                }
              : deck
          ),
        }))
      },

      removeItem: (id) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? {
                  ...deck,
                  items: deck.items.filter((item) => item.id !== id),
                  updatedAt: Date.now(),
                }
              : deck
          ),
          selectedIds: new Set(
            [...state.selectedIds].filter((sid) => sid !== id)
          ),
        }))
      },

      removeItems: (ids) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? {
                  ...deck,
                  items: deck.items.filter((item) => !ids.includes(item.id)),
                  updatedAt: Date.now(),
                }
              : deck
          ),
          selectedIds: new Set(
            [...state.selectedIds].filter((sid) => !ids.includes(sid))
          ),
        }))
      },

      updateQuantity: (id, quantity) => {
        // Quantity is now always 1 per item - duplicates are stored as separate items
        // This method is kept for API compatibility but does nothing
        if (quantity < 1) return
        // No-op: quantity field removed from ProxyItem
      },

      updateVariant: (id, variant) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? {
                  ...deck,
                  items: deck.items.map((item) =>
                    item.id === id ? { ...item, variant } : item
                  ),
                  updatedAt: Date.now(),
                }
              : deck
          ),
        }))
      },

      reorderItems: (startIndex, endIndex) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== activeDeck.id) return deck
            const items = [...deck.items]
            const [removed] = items.splice(startIndex, 1)
            items.splice(endIndex, 0, removed)
            return { ...deck, items, updatedAt: Date.now() }
          }),
        }))
      },

      reorderItemsById: (activeId: string, overId: string) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== activeDeck.id) return deck
            const items = [...deck.items]
            const activeIndex = items.findIndex((item) => item.id === activeId)
            const overIndex = items.findIndex((item) => item.id === overId)

            if (
              activeIndex === -1 ||
              overIndex === -1 ||
              activeIndex === overIndex
            )
              return deck

            const [removed] = items.splice(activeIndex, 1)
            items.splice(overIndex, 0, removed)
            return { ...deck, items, updatedAt: Date.now() }
          }),
        }))
      },

      updateItemCard: (id, cardData) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? {
                  ...deck,
                  items: deck.items.map((item) =>
                    item.id === id ? { ...item, ...cardData } : item
                  ),
                  updatedAt: Date.now(),
                }
              : deck
          ),
        }))
      },

      clearList: () => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? {
                  ...deck,
                  items: [],
                  updatedAt: Date.now(),
                }
              : deck
          ),
          selectedIds: new Set(),
          isBulkMode: false,
          lastSelectedId: null,
        }))
      },

      getTotalCards: () => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return 0
        return activeDeck.items.length
      },

      getItemCount: () => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return 0
        return activeDeck.items.length
      },

      hasItems: () => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return false
        return activeDeck.items.length > 0
      },

      getTotalCardCount: () => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return 0
        return activeDeck.items.length
      },

      // Selection actions
      toggleBulkMode: () => {
        set((state) => ({
          isBulkMode: !state.isBulkMode,
          selectedIds: !state.isBulkMode ? state.selectedIds : new Set(),
          lastSelectedId: null,
        }))
      },

      selectItem: (id) => {
        set((state) => ({
          selectedIds: new Set([...state.selectedIds, id]),
          lastSelectedId: id,
        }))
      },

      deselectItem: (id) => {
        set((state) => {
          const newSelected = new Set(state.selectedIds)
          newSelected.delete(id)
          return { selectedIds: newSelected }
        })
      },

      toggleSelection: (id) => {
        set((state) => {
          const newSelected = new Set(state.selectedIds)
          if (newSelected.has(id)) {
            newSelected.delete(id)
          } else {
            newSelected.add(id)
          }
          return {
            selectedIds: newSelected,
            lastSelectedId: id,
          }
        })
      },

      selectRange: (startId, endId) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        const items = activeDeck.items
        const startIndex = items.findIndex((item) => item.id === startId)
        const endIndex = items.findIndex((item) => item.id === endId)

        if (startIndex === -1 || endIndex === -1) return

        const minIndex = Math.min(startIndex, endIndex)
        const maxIndex = Math.max(startIndex, endIndex)

        const newSelected = new Set(get().selectedIds)
        for (let i = minIndex; i <= maxIndex; i++) {
          newSelected.add(items[i].id)
        }

        set({
          selectedIds: newSelected,
          lastSelectedId: endId,
        })
      },

      selectAll: () => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set(() => ({
          selectedIds: new Set(activeDeck.items.map((item) => item.id)),
        }))
      },

      deselectAll: () => {
        set({ selectedIds: new Set(), lastSelectedId: null })
      },

      clearSelection: () => {
        set({ selectedIds: new Set(), isBulkMode: false, lastSelectedId: null })
      },

      getSelectedCount: () => {
        return get().selectedIds.size
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }))
      },

      resetSettings: () => {
        set({
          settings: {
            pageSize: "letter",
            cardsPerRow: 3,
            rowsPerPage: 3,
            cardWidth: 63,
            cardHeight: 88,
            bleed: 0,
            gap: 2,
            showCutLines: true,
            imageQuality: "high",
            offsetX: 0,
            offsetY: 0,
            bleedMethod: "replicate",
          },
        })
      },

      setIsGenerating: (isGenerating) => {
        set({ isGenerating })
      },

      setGenerationProgress: (progress) => {
        set({ generationProgress: progress })
      },
    }),
    {
      name: FREE_STORAGE_KEY, // Default to free tier key, will be overridden by storage function
      version: STORAGE_VERSION,
      storage: createJSONStorage(createTieredStorage),
      migrate: (persistedState, version) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = persistedState as any

        // Migration from v1 to v2: Convert flat items array to decks structure
        if (version < 2 && state.items && Array.isArray(state.items)) {
          console.log(
            "[migrate] Migrating from v1 to v2: Converting items array to decks structure"
          )
          const now = Date.now()
          const migratedDeck: Deck = {
            id: `deck-${now}`,
            name: "Default Deck",
            items: state.items,
            createdAt: now,
            updatedAt: now,
          }
          state.decks = [migratedDeck]
          state.activeDeckId = migratedDeck.id
          delete state.items
        }

        // Migration from v2 to v3: Remove originalImage and quantity fields from items
        if (version < 3 && state.decks) {
          console.log(
            "[migrate] Migrating from v2 to v3: Removing originalImage and quantity fields"
          )
          state.decks = state.decks.map((deck: Deck) => ({
            ...deck,
            items: deck.items.map((item: ProxyItem) => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { ...rest } = item as any
              // Remove originalImage and quantity if they exist
              delete (rest as any).originalImage
              delete (rest as any).quantity
              return rest as ProxyItem
            }),
          }))
        }

        // Ensure decks array exists
        if (!state.decks || !Array.isArray(state.decks)) {
          state.decks = []
        }

        // Ensure at least one deck exists
        if (state.decks.length === 0) {
          const now = Date.now()
          const defaultDeck: Deck = {
            id: `deck-${now}`,
            name: "Default Deck",
            items: [],
            createdAt: now,
            updatedAt: now,
          }
          state.decks = [defaultDeck]
          state.activeDeckId = defaultDeck.id
        }

        // Ensure activeDeckId is valid
        if (
          !state.activeDeckId ||
          !state.decks.find((d: Deck) => d.id === state.activeDeckId)
        ) {
          state.activeDeckId = state.decks[0]?.id || null
        }

        // Ensure userTier exists (new field)
        if (!state.userTier) {
          state.userTier = "free"
        }

        return state
      },
      partialize: (state) => ({
        decks: state.decks.map((deck) => ({
          ...deck,
          items: deck.items.map((item) => ({
            ...item,
            image: undefined,
          })),
        })),
        activeDeckId: state.activeDeckId,
        settings: state.settings,
        userTier: state.userTier,
        // Persist dismissal state so notice doesn't show again
        storageNoticeDismissed: state.storageNoticeDismissed,
        // Don't persist selection state
        selectedIds: new Set(),
        isBulkMode: false,
        lastSelectedId: null,
        // Don't persist generation state
        isGenerating: false,
        generationProgress: null,
        // Don't persist UI state (but do persist dismissal)
        showStorageNotice: false,
      }),
      onRehydrateStorage: () => {
        // Return the rehydration callback that will receive the state
        return (rehydratedState, error) => {
          if (error) {
            console.error("[DEBUG onRehydrate] Rehydration error:", error)
            return
          }

          if (!rehydratedState) {
            console.log("[DEBUG onRehydrate] No state to rehydrate")
            return
          }

          // Migration: Check for old format (items array at root level)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyState = rehydratedState as any
          if (anyState.items && Array.isArray(anyState.items)) {
            console.log(
              "[DEBUG onRehydrate] Migrating from old format (v1) to new format (v2)"
            )
            const now = Date.now()
            const migratedDeck: Deck = {
              id: `deck-${now}`,
              name: "Default Deck",
              items: anyState.items,
              createdAt: now,
              updatedAt: now,
            }
            rehydratedState.decks = [migratedDeck]
            rehydratedState.activeDeckId = migratedDeck.id
            // Remove old items property
            delete anyState.items
          }

          // Ensure at least one deck exists
          if (!rehydratedState.decks || rehydratedState.decks.length === 0) {
            const now = Date.now()
            const defaultDeck: Deck = {
              id: `deck-${now}`,
              name: "Default Deck",
              items: [],
              createdAt: now,
              updatedAt: now,
            }
            rehydratedState.decks = [defaultDeck]
            rehydratedState.activeDeckId = defaultDeck.id
          }

          // Ensure activeDeckId is valid
          if (
            !rehydratedState.activeDeckId ||
            !rehydratedState.decks.find(
              (d: Deck) => d.id === rehydratedState.activeDeckId
            )
          ) {
            rehydratedState.activeDeckId = rehydratedState.decks[0]?.id || null
          }

          // Ensure userTier exists
          if (!rehydratedState.userTier) {
            rehydratedState.userTier = "free"
          }

          // Sync module-level tier so storage adapter behaves correctly on next write
          currentUserTier = rehydratedState.userTier

          // Reconstruct image URLs for items that lost them during serialization
          // (partialize strips image to keep storage small)
          if (rehydratedState.decks) {
            rehydratedState.decks = rehydratedState.decks.map((deck: Deck) => ({
              ...deck,
              items: deck.items.map((item: ProxyItem) => {
                if (item.image) return item
                // Reconstruct from card metadata using md size (UI default)
                try {
                  return {
                    ...item,
                    image: getImageUrl(
                      item.name,
                      item.setId,
                      item.localId,
                      "md"
                    ),
                  }
                } catch {
                  return item
                }
              }),
            }))
          }

          // Show storage notice for free users (unless already dismissed)
          rehydratedState.showStorageNotice =
            !isProTier(rehydratedState.userTier) &&
            !rehydratedState.storageNoticeDismissed

          // Reset selection state
          rehydratedState.selectedIds = new Set()
          rehydratedState.isBulkMode = false
          rehydratedState.lastSelectedId = null
          // Reset generation state
          rehydratedState.isGenerating = false
          rehydratedState.generationProgress = null
        }
      },
    }
  )
)

// Helper hook to check if user is on Pro tier
export function useIsPro() {
  const userTier = useProxyList((state) => state.userTier)
  return isProTier(userTier)
}

// Helper hook to get storage notice state
export function useStorageNotice() {
  const showStorageNotice = useProxyList((state) => state.showStorageNotice)
  const setShowStorageNotice = useProxyList(
    (state) => state.setShowStorageNotice
  )
  return { showStorageNotice, setShowStorageNotice }
}
