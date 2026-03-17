import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProxyItem, PrintSettings } from '@/types';

interface ProxyListState {
  // Proxy list
  items: ProxyItem[];
  addItem: (card: {
    cardId: string;
    name: string;
    image: string | undefined;
    originalImage?: string | undefined;
    setName: string;
    setId: string;
    localId: string;
    variant?: 'normal' | 'holo' | 'reverse';
  }, quantity?: number) => void;
  removeItem: (id: string) => void;
  removeItems: (ids: string[]) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateVariant: (id: string, variant: 'normal' | 'holo' | 'reverse') => void;
  reorderItems: (startIndex: number, endIndex: number) => void;
  reorderItemsById: (activeId: string, overId: string) => void;
  updateItemCard: (id: string, cardData: Partial<ProxyItem>) => void;
  clearList: () => void;
  getTotalCards: () => number;
  
  // Selection state for bulk operations
  selectedIds: Set<string>;
  isBulkMode: boolean;
  lastSelectedId: string | null;
  toggleBulkMode: () => void;
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  toggleSelection: (id: string) => void;
  selectRange: (startId: string, endId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  clearSelection: () => void;
  getSelectedCount: () => number;
  
  // Print settings
  settings: PrintSettings;
  updateSettings: (settings: Partial<PrintSettings>) => void;
  resetSettings: () => void;
}

export const useProxyList = create<ProxyListState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      selectedIds: new Set(),
      isBulkMode: false,
      lastSelectedId: null,
      settings: {
        pageSize: 'letter',
        cardsPerRow: 3,
        rowsPerPage: 3,
        cardWidth: 63,
        cardHeight: 88,
        bleed: 0,
        gap: 2,
        showCutLines: true,
        imageQuality: 'high',
        offsetX: 0,
        offsetY: 0,
        bleedMethod: 'replicate',
      },

      // Actions
      addItem: (card, quantity = 1) => {
        const items = get().items;
        
        const newItems: ProxyItem[] = [];
        const baseId = `${card.cardId}-${Date.now()}`;
        
        for (let i = 0; i < quantity; i++) {
          newItems.push({
            id: `${baseId}-${i}`,
            cardId: card.cardId,
            name: card.name,
            image: card.image,
            originalImage: card.originalImage,
            setName: card.setName,
            setId: card.setId,
            localId: card.localId,
            quantity: 1,
            variant: card.variant || 'normal',
          });
        }
        
        set({ items: [...items, ...newItems] });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          selectedIds: new Set([...state.selectedIds].filter((sid) => sid !== id)),
        }));
      },

      removeItems: (ids) => {
        set((state) => ({
          items: state.items.filter((item) => !ids.includes(item.id)),
          selectedIds: new Set([...state.selectedIds].filter((sid) => !ids.includes(sid))),
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }));
      },

      updateVariant: (id, variant) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, variant } : item
          ),
        }));
      },

      reorderItems: (startIndex, endIndex) => {
        const items = [...get().items];
        const [removed] = items.splice(startIndex, 1);
        items.splice(endIndex, 0, removed);
        set({ items });
      },
      
      reorderItemsById: (activeId: string, overId: string) => {
        const items = [...get().items];
        const activeIndex = items.findIndex(item => item.id === activeId);
        const overIndex = items.findIndex(item => item.id === overId);
        
        if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return;
        
        const [removed] = items.splice(activeIndex, 1);
        items.splice(overIndex, 0, removed);
        set({ items });
      },

      updateItemCard: (id, cardData) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, ...cardData }
              : item
          ),
        }));
      },

      clearList: () => {
        set({ items: [], selectedIds: new Set(), isBulkMode: false, lastSelectedId: null });
      },

      getTotalCards: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      // Selection actions
      toggleBulkMode: () => {
        set((state) => ({
          isBulkMode: !state.isBulkMode,
          selectedIds: !state.isBulkMode ? state.selectedIds : new Set(),
          lastSelectedId: null,
        }));
      },

      selectItem: (id) => {
        set((state) => ({
          selectedIds: new Set([...state.selectedIds, id]),
          lastSelectedId: id,
        }));
      },

      deselectItem: (id) => {
        set((state) => {
          const newSelected = new Set(state.selectedIds);
          newSelected.delete(id);
          return { selectedIds: newSelected };
        });
      },

      toggleSelection: (id) => {
        set((state) => {
          const newSelected = new Set(state.selectedIds);
          if (newSelected.has(id)) {
            newSelected.delete(id);
          } else {
            newSelected.add(id);
          }
          return { 
            selectedIds: newSelected,
            lastSelectedId: id,
          };
        });
      },

      selectRange: (startId, endId) => {
        const items = get().items;
        const startIndex = items.findIndex(item => item.id === startId);
        const endIndex = items.findIndex(item => item.id === endId);
        
        if (startIndex === -1 || endIndex === -1) return;
        
        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);
        
        const newSelected = new Set(get().selectedIds);
        for (let i = minIndex; i <= maxIndex; i++) {
          newSelected.add(items[i].id);
        }
        
        set({ 
          selectedIds: newSelected,
          lastSelectedId: endId,
        });
      },

      selectAll: () => {
        set((state) => ({
          selectedIds: new Set(state.items.map(item => item.id)),
        }));
      },

      deselectAll: () => {
        set({ selectedIds: new Set(), lastSelectedId: null });
      },

      clearSelection: () => {
        set({ selectedIds: new Set(), isBulkMode: false, lastSelectedId: null });
      },

      getSelectedCount: () => {
        return get().selectedIds.size;
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      resetSettings: () => {
        set({
          settings: {
            pageSize: 'letter',
            cardsPerRow: 3,
            rowsPerPage: 3,
            cardWidth: 63,
            cardHeight: 88,
            bleed: 0,
            gap: 2,
            showCutLines: true,
            imageQuality: 'high',
            offsetX: 0,
            offsetY: 0,
            bleedMethod: 'replicate',
          },
        });
      },
    }),
    {
      name: 'proxymon-proxy-list',
      partialize: (state) => ({ 
        items: state.items.map(item => ({
          ...item,
          image: undefined,
        })),
        settings: state.settings,
        // Don't persist selection state
        selectedIds: new Set(),
        isBulkMode: false,
        lastSelectedId: null,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        
        state.items = state.items.map(item => ({
          ...item,
          image: item.originalImage || item.image,
        }));
        // Reset selection state
        state.selectedIds = new Set();
        state.isBulkMode = false;
        state.lastSelectedId = null;
      },
    }
  )
);
