"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { ProxyItem, BleedMethod } from "@/types"
import { CardWithBleed } from "./card-with-bleed"

// mm to pixels at 96 DPI (screen preview)
const MM_TO_PX_SCREEN = 3.78

export interface PrintSheetProps {
  cards: ProxyItem[]
  cardsPerRow?: number
  rowsPerPage?: number
  bleedMm?: number
  gapMm?: number
  bleedMethod?: BleedMethod
  showCutLines?: boolean
  showTrimLines?: boolean
  pageSize?: "letter" | "a4"
  // Pre-generated bleed images for each card
  bleedImages?: Record<string, string>
  className?: string
  scale?: number // Scale factor for preview (default: 1)
  maxPreviewWidth?: number // Max width in pixels, auto-scale to fit
}

/**
 * Page dimensions in mm
 */
const PAGE_DIMENSIONS = {
  letter: { width: 216, height: 279 },
  a4: { width: 210, height: 297 },
}

/**
 * PrintSheet Component
 *
 * Renders a grid of cards with proper bleed extension.
 * Cards are positioned at 63mm×88mm intervals with NO overlap.
 * Bleed areas extend outward but don't affect grid spacing.
 *
 * Grid layout:
 * - Each cell: 63mm × 88mm (trim size)
 * - Gap between cells: configurable (default 2mm)
 * - Cards bleed outward from cell boundaries
 */
export function PrintSheet({
  cards,
  cardsPerRow = 3,
  rowsPerPage = 3,
  bleedMm = 0,
  gapMm = 2,
  bleedMethod = "replicate",
  showCutLines = true,
  showTrimLines = true,
  pageSize = "letter",
  bleedImages = {},
  className,
  scale = 1,
  maxPreviewWidth = 600,
}: PrintSheetProps) {
  // Standard card dimensions
  const cardWidthMm = 63
  const cardHeightMm = 88

  // Calculate grid dimensions
  const gridWidthMm = cardsPerRow * cardWidthMm + (cardsPerRow - 1) * gapMm
  const gridHeightMm = rowsPerPage * cardHeightMm + (rowsPerPage - 1) * gapMm

  // Page dimensions
  const pageDims = PAGE_DIMENSIONS[pageSize]

  // Calculate margins to center the grid
  const marginXMm = (pageDims.width - gridWidthMm) / 2
  const marginYMm = (pageDims.height - gridHeightMm) / 2

  // Calculate preview scale to fit within max width
  const previewScale = useMemo(() => {
    const naturalWidth = pageDims.width * MM_TO_PX_SCREEN
    if (naturalWidth <= maxPreviewWidth) return scale
    return (maxPreviewWidth / naturalWidth) * scale
  }, [pageDims.width, scale, maxPreviewWidth])

  // Convert to pixels for rendering
  const pageWidthPx = pageDims.width * MM_TO_PX_SCREEN * previewScale
  const pageHeightPx = pageDims.height * MM_TO_PX_SCREEN * previewScale
  const marginXPx = marginXMm * MM_TO_PX_SCREEN * previewScale
  const marginYPx = marginYMm * MM_TO_PX_SCREEN * previewScale
  const cardWidthPx = cardWidthMm * MM_TO_PX_SCREEN * previewScale
  const cardHeightPx = cardHeightMm * MM_TO_PX_SCREEN * previewScale
  const gapPx = gapMm * MM_TO_PX_SCREEN * previewScale

  // Limit cards to grid capacity
  const maxCards = cardsPerRow * rowsPerPage
  const displayCards = cards.slice(0, maxCards)

  return (
    <div
      className={cn("relative bg-white shadow-lg", className)}
      style={{
        width: pageWidthPx,
        height: pageHeightPx,
        minWidth: pageWidthPx,
        minHeight: pageHeightPx,
      }}
    >
      {/* Cut lines at card boundaries */}
      {showCutLines && (
        <svg
          className="pointer-events-none absolute inset-0"
          width={pageWidthPx}
          height={pageHeightPx}
        >
          {/* Horizontal cut lines */}
          {Array.from({ length: rowsPerPage + 1 }).map((_, i) => {
            const y = marginYPx + i * (cardHeightPx + gapPx)
            return (
              <line
                key={`h-${i}`}
                x1={marginXPx - 8 * previewScale}
                y1={y}
                x2={
                  marginXPx +
                  gridWidthMm * MM_TO_PX_SCREEN * previewScale +
                  8 * previewScale
                }
                y2={y}
                stroke="#10b981" // Emerald-500
                strokeWidth={0.75 * previewScale}
                strokeDasharray={`${4 * previewScale} ${2 * previewScale}`}
              />
            )
          })}

          {/* Vertical cut lines */}
          {Array.from({ length: cardsPerRow + 1 }).map((_, i) => {
            const x = marginXPx + i * (cardWidthPx + gapPx)
            return (
              <line
                key={`v-${i}`}
                x1={x}
                y1={marginYPx - 8 * previewScale}
                x2={x}
                y2={
                  marginYPx +
                  gridHeightMm * MM_TO_PX_SCREEN * previewScale +
                  8 * previewScale
                }
                stroke="#10b981" // Emerald-500
                strokeWidth={0.75 * previewScale}
                strokeDasharray={`${4 * previewScale} ${2 * previewScale}`}
              />
            )
          })}
        </svg>
      )}

      {/* Cards grid */}
      {displayCards.map((card, index) => {
        const row = Math.floor(index / cardsPerRow)
        const col = index % cardsPerRow

        // Position within the grid (trim line boundaries)
        const x = marginXPx + col * (cardWidthPx + gapPx)
        const y = marginYPx + row * (cardHeightPx + gapPx)

        // Full image URL
        const imageUrl = card.image ? `${card.image}/low.webp` : ""

        return (
          <div
            key={`${card.id}-${index}`}
            className="absolute"
            style={{
              left: x,
              top: y,
              width: cardWidthPx,
              height: cardHeightPx,
            }}
          >
            <CardWithBleed
              imageUrl={imageUrl}
              name={card.name}
              bleedMm={bleedMm}
              method={bleedMethod}
              showTrimLines={showTrimLines}
              bleedImageUrl={bleedImages[card.cardId]}
              className="h-full w-full"
            />
          </div>
        )
      })}

      {/* Empty slot indicators (if grid not full) */}
      {displayCards.length < maxCards &&
        Array.from({ length: maxCards - displayCards.length }).map(
          (_, index) => {
            const actualIndex = displayCards.length + index
            const row = Math.floor(actualIndex / cardsPerRow)
            const col = actualIndex % cardsPerRow

            const x = marginXPx + col * (cardWidthPx + gapPx)
            const y = marginYPx + row * (cardHeightPx + gapPx)

            return (
              <div
                key={`empty-${index}`}
                className="absolute flex items-center justify-center rounded border-2 border-dashed border-slate-200 bg-slate-50"
                style={{
                  left: x,
                  top: y,
                  width: cardWidthPx,
                  height: cardHeightPx,
                }}
              >
                <span className="text-xs text-slate-300">Empty</span>
              </div>
            )
          }
        )}
    </div>
  )
}

/**
 * SimpleCardPreview - Simpler component for individual card preview
 * Shows a single card with bleed at actual size
 */
export interface SimpleCardPreviewProps {
  imageUrl: string
  name?: string
  bleedMm?: number
  bleedMethod?: BleedMethod
  showTrimLines?: boolean
  bleedImageUrl?: string
  className?: string
}

export function SimpleCardPreview({
  imageUrl,
  name,
  bleedMm = 0,
  bleedMethod = "replicate",
  showTrimLines = true,
  bleedImageUrl,
  className,
}: SimpleCardPreviewProps) {
  // Scale for screen preview (at 96 DPI instead of 300)
  const previewScale = 0.32 // 96/300 ≈ 0.32

  return (
    <div
      className={cn("relative inline-block", className)}
      style={{
        transform: `scale(${previewScale})`,
        transformOrigin: "top left",
      }}
    >
      <CardWithBleed
        imageUrl={imageUrl}
        name={name}
        bleedMm={bleedMm}
        method={bleedMethod}
        showTrimLines={showTrimLines}
        bleedImageUrl={bleedImageUrl}
      />
    </div>
  )
}
