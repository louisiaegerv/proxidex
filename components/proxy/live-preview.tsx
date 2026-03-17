"use client"

import { useMemo, useState } from "react"
import { useProxyList } from "@/stores/proxy-list"
import { getFullImageUrl } from "@/lib/tcgdex"
import { PAGE_DIMENSIONS, BleedMethod } from "@/types"
import { generateProxyPDF, downloadPDF } from "@/lib/pdf"
import { Button } from "@/components/ui/button"
import { Printer, Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { CardVariantModal } from "./card-variant-modal"
import { cn } from "@/lib/utils"
import { CardWithBleed } from "@/components/card-with-bleed"
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

// mm to pixels for preview (at 96 DPI, 1mm ≈ 3.78px)
const MM_TO_PX = 3.78

// Zoom levels
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2]

interface DisplayCard {
  id: string
  itemId: string
  name: string
  image?: string
  index: number
  itemIndex: number
  row: number
  col: number
  imageX: number
  imageY: number
  imageWidth: number
  imageHeight: number
}

export function LivePreview() {
  const { items, getTotalCards, settings, reorderItems } = useProxyList()
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [zoomIndex, setZoomIndex] = useState(2)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const totalCards = getTotalCards()
  const zoom = ZOOM_LEVELS[zoomIndex]

  // Use mouse sensor with activation constraint to prevent accidental drags
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  })
  const sensors = useSensors(mouseSensor, touchSensor)

  // Calculate preview dimensions
  const preview = useMemo(() => {
    const cardWidthMm = settings.cardWidth
    const cardHeightMm = settings.cardHeight
    const bleedMm = settings.bleed
    const imageWidthMm = cardWidthMm + bleedMm * 2
    const imageHeightMm = cardHeightMm + bleedMm * 2
    const spacingX = imageWidthMm + settings.gap
    const spacingY = imageHeightMm + settings.gap

    const pageDims = PAGE_DIMENSIONS[settings.pageSize]

    const gridWidthMm =
      settings.cardsPerRow * imageWidthMm +
      (settings.cardsPerRow - 1) * settings.gap
    const gridHeightMm =
      settings.rowsPerPage * imageHeightMm +
      (settings.rowsPerPage - 1) * settings.gap

    const marginXMm = (pageDims.width - gridWidthMm) / 2 + settings.offsetX
    const marginYMm = (pageDims.height - gridHeightMm) / 2 + settings.offsetY

    const baseScale = 0.8
    const finalScale = baseScale * zoom

    return {
      width: pageDims.width * finalScale * MM_TO_PX,
      height: pageDims.height * finalScale * MM_TO_PX,
      marginX: marginXMm * finalScale * MM_TO_PX,
      marginY: marginYMm * finalScale * MM_TO_PX,
      cardWidth: cardWidthMm * finalScale * MM_TO_PX,
      cardHeight: cardHeightMm * finalScale * MM_TO_PX,
      imageWidth: imageWidthMm * finalScale * MM_TO_PX,
      imageHeight: imageHeightMm * finalScale * MM_TO_PX,
      bleed: bleedMm * finalScale * MM_TO_PX,
      spacingX: spacingX * finalScale * MM_TO_PX,
      spacingY: spacingY * finalScale * MM_TO_PX,
      scale: finalScale,
      cardsPerPage: settings.cardsPerRow * settings.rowsPerPage,
      gridCols: settings.cardsPerRow,
      gridRows: settings.rowsPerPage,
    }
  }, [settings, zoom])

  // Build display cards with position info
  // Each item is now a single card (quantity is always 1)
  const displayCards = useMemo(() => {
    const cards: DisplayCard[] = []
    items.forEach((item, itemIndex) => {
      const cardIndex = itemIndex
      const pageIndex = Math.floor(cardIndex / preview.cardsPerPage)
      const pageCardIndex = cardIndex % preview.cardsPerPage
      const row = Math.floor(pageCardIndex / settings.cardsPerRow)
      const col = pageCardIndex % settings.cardsPerRow

      cards.push({
        id: item.id,  // Use item.id directly since each item is one card
        itemId: item.id,
        name: item.name,
        image: item.image,
        index: cardIndex,
        itemIndex,
        row,
        col,
        imageX: preview.marginX + col * preview.spacingX,
        imageY: preview.marginY + row * preview.spacingY,
        imageWidth: preview.imageWidth,
        imageHeight: preview.imageHeight,
      })
    })
    return cards
  }, [items, preview, settings.cardsPerRow])

  const activeCard = useMemo(() => {
    return displayCards.find((c) => c.id === activeId)
  }, [activeId, displayCards])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setOverId(null)
  }

  const handleDragMove = (event: DragMoveEvent) => {
    // Track which card we're hovering over for live preview
    if (event.over) {
      setOverId(event.over.id as string)
    } else {
      setOverId(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverId(null)

    if (!over) return

    const activeCard = displayCards.find((c) => c.id === active.id)
    const overCard = displayCards.find((c) => c.id === over.id)

    if (!activeCard || !overCard) return
    if (activeCard.id === overCard.id) return
    // Allow dragging even if same item (different instances of same card)
    // since each card is now stored individually

    // Swap items by their IDs - each card is now an individual item
    reorderItems(activeCard.itemIndex, overCard.itemIndex)
  }

  const totalPages = Math.ceil(displayCards.length / preview.cardsPerPage) || 1

  const handleZoomIn = () =>
    setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1))
  const handleZoomOut = () => setZoomIndex((i) => Math.max(i - 1, 0))
  const handleResetZoom = () => setZoomIndex(1)

  const handleCardClick = (cardId: string, itemId: string) => {
    setSelectedCardId(cardId)
    setSelectedItemId(itemId)
  }

  const handleCloseModal = () => {
    setSelectedCardId(null)
    setSelectedItemId(null)
  }

  const handleGeneratePDF = async () => {
    if (items.length === 0) return
    setIsGenerating(true)
    try {
      const pdfBytes = await generateProxyPDF(items, settings)
      downloadPDF(pdfBytes, `proxymon-${totalCards}-cards.pdf`)
    } catch (error) {
      console.error("Failed to generate PDF:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <div className="space-y-4 text-center">
          <div className="text-6xl opacity-20">🎴</div>
          <div>
            <p className="text-lg font-medium text-slate-400">
              No cards added yet
            </p>
            <p className="mt-1 text-sm">
              Paste a deck list on the left to get started
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Print Preview
          </h2>
          <p className="text-sm text-slate-500">
            {totalCards} cards · {totalPages} page{totalPages !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomOut}
              disabled={zoomIndex === 0}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-xs">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomIn}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleResetZoom}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Pages */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 space-y-8 overflow-auto pb-8">
          {Array.from({ length: totalPages }).map((_, pageIndex) => {
            const pageCards = displayCards.slice(
              pageIndex * preview.cardsPerPage,
              (pageIndex + 1) * preview.cardsPerPage
            )

            return (
              <div key={pageIndex} className="flex flex-col items-center">
                <div className="mb-2 text-xs text-slate-500">
                  Page {pageIndex + 1} of {totalPages}
                </div>

                <div
                  className="card-grid relative bg-white shadow-2xl"
                  style={{
                    width: preview.width,
                    height: preview.height,
                    minWidth: preview.width,
                    minHeight: preview.height,
                  }}
                >
                  {/* Cards */}
                  {pageCards.map((card) => {
                    const isActive = card.id === activeId
                    const isOver = card.id === overId
                    const imageUrl = getFullImageUrl(card.image, "low", "webp")

                    return (
                      <DraggableCard
                        key={card.id}
                        card={card}
                        isActive={isActive}
                        isOver={isOver}
                        activeId={activeId}
                        onClick={() => handleCardClick(card.id, card.itemId)}
                      >
                        {imageUrl ? (
                          <CardWithBleed
                            imageUrl={imageUrl}
                            name={card.name}
                            bleedMm={settings.bleed}
                            method={settings.bleedMethod as BleedMethod}
                            showTrimLines={false}
                            bleedColor={settings.bleedColor}
                            dpi={96}
                            fillParent
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs">
                            {card.name}
                          </div>
                        )}
                      </DraggableCard>
                    )
                  })}

                  {/* Cut lines */}
                  {settings.showCutLines && (
                    <svg
                      className="pointer-events-none absolute inset-0 z-10"
                      width={preview.width}
                      height={preview.height}
                    >
                      {Array.from({
                        length: preview.gridRows * preview.gridCols,
                      }).map((_, i) => {
                        const row = Math.floor(i / preview.gridCols)
                        const col = i % preview.gridCols

                        const cardX =
                          preview.marginX +
                          col * preview.spacingX +
                          preview.bleed
                        const cardY =
                          preview.marginY +
                          row * preview.spacingY +
                          preview.bleed

                        const cutColor = settings.cutLineColor
                          ? `rgb(${settings.cutLineColor.r}, ${settings.cutLineColor.g}, ${settings.cutLineColor.b})`
                          : "#10b981"

                        return (
                          <g key={`card-cuts-${row}-${col}`}>
                            <line
                              x1={cardX - 4}
                              y1={cardY}
                              x2={cardX + preview.cardWidth + 4}
                              y2={cardY}
                              stroke={cutColor}
                              strokeWidth={1.5}
                              strokeDasharray="4 2"
                            />
                            <line
                              x1={cardX - 4}
                              y1={cardY + preview.cardHeight}
                              x2={cardX + preview.cardWidth + 4}
                              y2={cardY + preview.cardHeight}
                              stroke={cutColor}
                              strokeWidth={1.5}
                              strokeDasharray="4 2"
                            />
                            <line
                              x1={cardX}
                              y1={cardY - 4}
                              x2={cardX}
                              y2={cardY + preview.cardHeight + 4}
                              stroke={cutColor}
                              strokeWidth={1.5}
                              strokeDasharray="4 2"
                            />
                            <line
                              x1={cardX + preview.cardWidth}
                              y1={cardY - 4}
                              x2={cardX + preview.cardWidth}
                              y2={cardY + preview.cardHeight + 4}
                              stroke={cutColor}
                              strokeWidth={1.5}
                              strokeDasharray="4 2"
                            />
                          </g>
                        )
                      })}
                    </svg>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Drag Overlay - shows the card following the cursor */}
        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div
              className="cursor-grabbing shadow-2xl"
              style={{
                width: activeCard.imageWidth,
                height: activeCard.imageHeight,
                position: "fixed",
                pointerEvents: "none",
              }}
            >
              {activeCard.image ? (
                <CardWithBleed
                  imageUrl={getFullImageUrl(activeCard.image, "low", "webp")!}
                  name={activeCard.name}
                  bleedMm={settings.bleed}
                  method={settings.bleedMethod as BleedMethod}
                  showTrimLines={false}
                  bleedColor={settings.bleedColor}
                  dpi={96}
                  fillParent
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs">
                  {activeCard.name}
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Legend */}
      <div className="mt-4 text-center text-xs text-slate-500">
        {settings.bleed > 0 && (
          <div className="text-emerald-400">
            Green line = cut line · Card artwork extends {settings.bleed}mm past
            cut
          </div>
        )}
      </div>

      <CardVariantModal
        isOpen={!!selectedCardId}
        onClose={handleCloseModal}
        cardId={selectedCardId}
        itemId={selectedItemId}
      />
    </div>
  )
}

// Draggable and droppable card component
interface DraggableCardProps {
  card: DisplayCard
  isActive: boolean
  isOver: boolean
  activeId: string | null
  children: React.ReactNode
  onClick?: () => void
}

function DraggableCard({
  card,
  isActive,
  isOver,
  activeId,
  children,
  onClick,
}: DraggableCardProps) {
  // Make card draggable
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: card.id,
    data: { card },
  })

  // Make card droppable (can receive drops from other cards)
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: card.id,
    data: { card },
  })

  // Calculate visual shift based on drag-over state
  // When a card is being dragged over this card, shift this card
  // to indicate where the drop will place the dragged card
  const getShift = () => {
    if (!isOver || !activeId) return { x: 0, y: 0 }
    // Subtle shift to indicate this is the drop target
    return { x: 0, y: 0 }
  }

  const shift = getShift()

  const style = {
    opacity: isDragging ? 0.3 : isActive ? 0.5 : 1,
    zIndex: isDragging ? 50 : isOver ? 40 : undefined,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  }

  return (
    <div
      ref={setDroppableRef}
      className={cn(
        "absolute transition-all duration-200",
        isOver && "z-40 scale-105 ring-2 ring-green-400 ring-offset-2"
      )}
      style={{
        left: card.imageX + shift.x,
        top: card.imageY + shift.y,
        width: card.imageWidth,
        height: card.imageHeight,
      }}
    >
      <div
        ref={setDraggableRef}
        {...attributes}
        {...listeners}
        onClick={onClick}
        className={cn(
          "h-full w-full transition-all hover:brightness-110",
          isDragging && "ring-2 ring-blue-400"
        )}
        style={style}
      >
        {children}
      </div>
    </div>
  )
}
