import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProxyItem, PrintSettings, DEFAULT_PRINT_SETTINGS } from '@/types';

interface ProxyListState {
  // Proxy list
  items: ProxyItem[];
  addItem: (card: {
    cardId: string;
    name: string;
    image: string | undefined;        // Processed image (corners stretched)
    originalImage?: string | undefined; // Original TCGdex URL
    setName: string;
    setId: string;
    localId: string;
    variant?: 'normal' | 'holo' | 'reverse';
  }, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateVariant: (id: string, variant: 'normal' | 'holo' | 'reverse') => void;
  reorderItems: (startIndex: number, endIndex: number) => void;
  updateItemCard: (id: string, cardData: Partial<ProxyItem>) => void;
  clearList: () => void;
  getTotalCards: () => number;
  
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
        
        // Add each card as an individual item for maximum flexibility
        // This allows dragging individual cards to reorder them
        const newItems: ProxyItem[] = [];
        const baseId = `${card.cardId}-${Date.now()}`;
        
        for (let i = 0; i < quantity; i++) {
          newItems.push({
            id: `${baseId}-${i}`,
            cardId: card.cardId,
            name: card.name,
            image: card.image,        // Processed image (corners stretched)
            originalImage: card.originalImage, // Original TCGdex URL
            setName: card.setName,
            setId: card.setId,
            localId: card.localId,
            quantity: 1,              // Each item is a single card
            variant: card.variant || 'normal',
          });
        }
        
        set({ items: [...items, ...newItems] });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
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
      
      // Reorder by item ID - used when we only know the IDs
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
        set({ items: [] });
      },

      getTotalCards: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
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
        // Don't persist processed images (base64 is too large for localStorage)
        // Only persist card metadata and original image URLs
        items: state.items.map(item => ({
          ...item,
          image: undefined, // Don't persist processed base64 image
        })),
        settings: state.settings,
      }),
      // Restore processed images on rehydrate
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        
        // Restore original image URLs to image field for compatibility
        // The images will be re-processed when needed or displayed using original URL
        state.items = state.items.map(item => ({
          ...item,
          image: item.originalImage || item.image,
        }));
      },
    }
  )
);
