"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { bleedImageCache } from "@/lib/pdf"

export type BleedMethod = "replicate" | "mirror" | "edge"

export interface CardWithBleedProps {
  imageUrl: string
  name?: string
  bleedMm?: number
  method?: BleedMethod
  showTrimLines?: boolean
  className?: string
  onBleedGenerated?: (bleedImageUrl: string) => void
  // Optional pre-generated bleed image
  bleedImageUrl?: string
  // Optional color for replicate method
  bleedColor?: { r: number; g: number; b: number }
  // DPI for rendering (default 300 for print, use 96 for screen preview)
  dpi?: number
  // Fill parent container instead of setting explicit mm dimensions
  // Use when parent already accounts for bleed area sizing
  fillParent?: boolean
  // Card dimensions in mm (defaults to standard Pokemon card size: 63mm x 88mm)
  cardWidth?: number
  cardHeight?: number
  // Render in black and white (grayscale) for draft printing
  grayscale?: boolean
}

/**
 * Generate bleed image client-side using Canvas API
 * All processing happens in the browser - no server calls
 */
async function generateBleedClientSide(
  imageUrl: string,
  method: BleedMethod,
  bleedMm: number,
  bleedColor?: { r: number; g: number; b: number }
): Promise<string> {
  // Load the image
  const img = new Image()
  img.crossOrigin = "anonymous"
  
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = imageUrl
  })

  const width = img.width
  const height = img.height
  
  // Calculate bleed in pixels (assuming 300 DPI for consistency with PDF)
  const bleedPx = Math.round((bleedMm * 300) / 25.4)
  
  if (bleedPx === 0) {
    // No bleed needed, return original as data URL
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/png')
  }

  // Create canvas with bleed dimensions
  const canvas = document.createElement('canvas')
  canvas.width = width + bleedPx * 2
  canvas.height = height + bleedPx * 2
  const ctx = canvas.getContext('2d')!

  switch (method) {
    case 'replicate':
      return generateReplicateBleed(ctx, img, width, height, bleedPx, bleedColor)
    case 'mirror':
      return generateMirrorBleed(ctx, img, width, height, bleedPx)
    case 'edge':
      return generateEdgeBleed(ctx, img, width, height, bleedPx)
    default:
      return generateReplicateBleed(ctx, img, width, height, bleedPx, bleedColor)
  }
}

/**
 * REPLICATE method: Extend canvas with a solid color
 */
function generateReplicateBleed(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  bleedPx: number,
  userColor?: { r: number; g: number; b: number }
): string {
  // Fill entire canvas with bleed color first
  if (userColor) {
    ctx.fillStyle = `rgb(${userColor.r}, ${userColor.g}, ${userColor.b})`
  } else {
    // Auto-detect from border (sample corners)
    const cornerCanvas = document.createElement('canvas')
    cornerCanvas.width = 5
    cornerCanvas.height = 5
    const cornerCtx = cornerCanvas.getContext('2d')!
    cornerCtx.drawImage(img, 0, 0, 5, 5, 0, 0, 5, 5)
    const pixel = cornerCtx.getImageData(2, 2, 1, 1).data
    ctx.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`
  }
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  
  // Draw original image in center
  ctx.drawImage(img, bleedPx, bleedPx, width, height)
  
  return ctx.canvas.toDataURL('image/png')
}

/**
 * MIRROR method: Extend canvas by mirroring edge pixels
 */
function generateMirrorBleed(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  bleedPx: number
): string {
  // Draw original in center
  ctx.drawImage(img, bleedPx, bleedPx, width, height)
  
  // Mirror left edge
  ctx.save()
  ctx.translate(bleedPx, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(img, 0, 0, bleedPx, height, 0, bleedPx, bleedPx, height)
  ctx.restore()
  
  // Mirror right edge
  ctx.save()
  ctx.translate(ctx.canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(img, width - bleedPx, 0, bleedPx, height, 0, bleedPx, bleedPx, height)
  ctx.restore()
  
  // Mirror top edge
  ctx.save()
  ctx.translate(0, bleedPx)
  ctx.scale(1, -1)
  ctx.drawImage(img, 0, 0, width, bleedPx, bleedPx, 0, width, bleedPx)
  ctx.restore()
  
  // Mirror bottom edge
  ctx.save()
  ctx.translate(0, ctx.canvas.height)
  ctx.scale(1, -1)
  ctx.drawImage(img, 0, height - bleedPx, width, bleedPx, bleedPx, 0, width, bleedPx)
  ctx.restore()
  
  // Mirror corners by flipping both axes
  // Top-left corner: flip top-left of original image
  ctx.save()
  ctx.translate(0, 0)
  ctx.scale(-1, -1)
  ctx.drawImage(img, 0, 0, bleedPx, bleedPx, -bleedPx, -bleedPx, bleedPx, bleedPx)
  ctx.restore()
  
  // Top-right corner: flip top-right of original image
  ctx.save()
  ctx.translate(ctx.canvas.width, 0)
  ctx.scale(-1, -1)
  ctx.drawImage(img, width - bleedPx, 0, bleedPx, bleedPx, 0, -bleedPx, bleedPx, bleedPx)
  ctx.restore()
  
  // Bottom-left corner: flip bottom-left of original image
  ctx.save()
  ctx.translate(0, ctx.canvas.height)
  ctx.scale(-1, -1)
  ctx.drawImage(img, 0, height - bleedPx, bleedPx, bleedPx, -bleedPx, 0, bleedPx, bleedPx)
  ctx.restore()
  
  // Bottom-right corner: flip bottom-right of original image
  ctx.save()
  ctx.translate(ctx.canvas.width, ctx.canvas.height)
  ctx.scale(-1, -1)
  ctx.drawImage(img, width - bleedPx, height - bleedPx, bleedPx, bleedPx, 0, 0, bleedPx, bleedPx)
  ctx.restore()
  
  return ctx.canvas.toDataURL('image/png')
}

/**
 * EDGE method: Extend canvas by stretching the 1px outermost border
 */
function generateEdgeBleed(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  bleedPx: number
): string {
  // Create temp canvas to read pixel data
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.drawImage(img, 0, 0)
  
  const imageData = tempCtx.getImageData(0, 0, width, height)
  const data = imageData.data
  
  // Helper to get pixel color
  const getPixel = (x: number, y: number): [number, number, number, number] => {
    const idx = (y * width + x) * 4
    return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]]
  }
  
  // Fill white background
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  
  // Draw original image
  ctx.drawImage(img, bleedPx, bleedPx)
  
  // Edge inset to avoid corner artifacts
  const inset = 2
  
  // Stretch left edge (1px strip replicated horizontally)
  for (let y = 0; y < height; y++) {
    const [r, g, b, a] = getPixel(inset, y)
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
    for (let x = 0; x < bleedPx; x++) {
      ctx.fillRect(x, bleedPx + y, 1, 1)
    }
  }
  
  // Stretch right edge
  for (let y = 0; y < height; y++) {
    const [r, g, b, a] = getPixel(width - 1 - inset, y)
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
    for (let x = 0; x < bleedPx; x++) {
      ctx.fillRect(bleedPx + width + x, bleedPx + y, 1, 1)
    }
  }
  
  // Stretch top edge
  for (let x = 0; x < width; x++) {
    const [r, g, b, a] = getPixel(x, inset)
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
    for (let y = 0; y < bleedPx; y++) {
      ctx.fillRect(bleedPx + x, y, 1, 1)
    }
  }
  
  // Stretch bottom edge
  for (let x = 0; x < width; x++) {
    const [r, g, b, a] = getPixel(x, height - 1 - inset)
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
    for (let y = 0; y < bleedPx; y++) {
      ctx.fillRect(bleedPx + x, bleedPx + height + y, 1, 1)
    }
  }
  
  // Fill corners with corner pixel colors
  const topLeft = getPixel(inset, inset)
  ctx.fillStyle = `rgba(${topLeft[0]},${topLeft[1]},${topLeft[2]},${topLeft[3] / 255})`
  ctx.fillRect(0, 0, bleedPx, bleedPx)
  
  const topRight = getPixel(width - 1 - inset, inset)
  ctx.fillStyle = `rgba(${topRight[0]},${topRight[1]},${topRight[2]},${topRight[3] / 255})`
  ctx.fillRect(bleedPx + width, 0, bleedPx, bleedPx)
  
  const bottomLeft = getPixel(inset, height - 1 - inset)
  ctx.fillStyle = `rgba(${bottomLeft[0]},${bottomLeft[1]},${bottomLeft[2]},${bottomLeft[3] / 255})`
  ctx.fillRect(0, bleedPx + height, bleedPx, bleedPx)
  
  const bottomRight = getPixel(width - 1 - inset, height - 1 - inset)
  ctx.fillStyle = `rgba(${bottomRight[0]},${bottomRight[1]},${bottomRight[2]},${bottomRight[3] / 255})`
  ctx.fillRect(bleedPx + width, bleedPx + height, bleedPx, bleedPx)
  
  return ctx.canvas.toDataURL('image/png')
}

/**
 * CardWithBleed Component
 *
 * Displays a card with proper bleed extension. The card content (63mm×88mm)
 * remains at original size, while the bleed area extends outward.
 *
 * Layout:
 * - Container: 63mm × 88mm (trim size)
 * - Canvas: (63 + 2×bleed)mm × (88 + 2×bleed)mm
 * - Canvas is positioned absolutely with negative margins to extend outward
 */
export function CardWithBleed({
  imageUrl,
  name = "Card",
  bleedMm = 0,
  method = "replicate",
  showTrimLines = true,
  className,
  onBleedGenerated,
  bleedImageUrl,
  bleedColor,
  dpi = 300,
  fillParent = false,
  cardWidth = 63,
  cardHeight = 88,
  grayscale = false,
}: CardWithBleedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedBleedUrl, setGeneratedBleedUrl] = useState<
    string | undefined
  >(bleedImageUrl)

  // Use provided dimensions or defaults (standard Pokemon card: 63mm x 88mm)
  const cardWidthMm = cardWidth
  const cardHeightMm = cardHeight

  // Use device pixel ratio for sharp rendering on high-DPI displays
  // This ensures the canvas looks crisp even when scaled via CSS
  const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
  
  // Calculate dimensions in pixels at specified DPI
  const mmToPx = (mm: number) => (mm * dpi) / 25.4
  const cardWidthPx = mmToPx(cardWidthMm) * pixelRatio
  const cardHeightPx = mmToPx(cardHeightMm) * pixelRatio
  const bleedPx = mmToPx(bleedMm) * pixelRatio

  // Canvas dimensions (includes bleed on all sides)
  const canvasWidthPx = cardWidthPx + bleedPx * 2
  const canvasHeightPx = cardHeightPx + bleedPx * 2

  // Generate bleed client-side with caching
  const generateBleed = useCallback(async () => {
    if (bleedMm === 0 || bleedImageUrl) {
      setGeneratedBleedUrl(bleedImageUrl)
      return
    }

    // Create absolute URL for cache key consistency with batch processing
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const absoluteImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${origin}${imageUrl}`
    
    // Create cache key from all parameters that affect the output
    const cacheKey = `${absoluteImageUrl}|${method}|${bleedMm}|${bleedColor?.r ?? "auto"}|${bleedColor?.g ?? "auto"}|${bleedColor?.b ?? "auto"}`

    // Check cache first (shared cache from lib/pdf.ts)
    if (bleedImageCache.has(cacheKey)) {
      const cached = bleedImageCache.get(cacheKey)!
      setGeneratedBleedUrl(cached)
      onBleedGenerated?.(cached)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use client-side generation instead of API
      const bleedDataUrl = await generateBleedClientSide(
        imageUrl,
        method,
        bleedMm,
        bleedColor
      )
      
      // Store in shared cache (accessible from lib/pdf.ts for HTML export)
      bleedImageCache.set(cacheKey, bleedDataUrl)
      setGeneratedBleedUrl(bleedDataUrl)
      onBleedGenerated?.(bleedDataUrl)
    } catch (err) {
      console.error("Error generating bleed:", err)
      setError(err instanceof Error ? err.message : "Failed to generate bleed")
    } finally {
      setIsLoading(false)
    }
  }, [imageUrl, method, bleedMm, bleedImageUrl, onBleedGenerated, bleedColor])

  // Draw the card on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions (at high DPI for sharpness)
    canvas.width = canvasWidthPx
    canvas.height = canvasHeightPx
    
    // Scale context to match pixel ratio for correct drawing
    ctx.scale(pixelRatio, pixelRatio)

    // Clear canvas (use unscaled dimensions)
    ctx.clearRect(0, 0, canvas.width / pixelRatio, canvas.height / pixelRatio)

    const draw = async () => {
      try {
        // Load the image (either original or with bleed)
        const img = new Image()
        img.crossOrigin = "anonymous"

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error("Failed to load image"))
          img.src = generatedBleedUrl || imageUrl
        })

        // Draw the image to fill the canvas
        // Use unscaled dimensions since context is scaled
        const drawWidth = canvas.width / pixelRatio
        const drawHeight = canvas.height / pixelRatio
        ctx.drawImage(img, 0, 0, drawWidth, drawHeight)
        
        // Apply grayscale filter if enabled
        if (grayscale) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            // Luminance formula for grayscale
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
            data[i] = gray
            data[i + 1] = gray
            data[i + 2] = gray
          }
          ctx.putImageData(imageData, 0, 0)
        }

        // Draw trim lines if enabled
        if (showTrimLines && bleedMm > 0) {
          ctx.strokeStyle = "rgba(239, 68, 68, 0.8)" // Red-500 with opacity
          ctx.lineWidth = 1
          ctx.setLineDash([4, 4])

          // Use unscaled bleed amount for drawing
          const bleedDraw = bleedPx / pixelRatio
          const drawCanvasWidth = canvasWidthPx / pixelRatio
          const drawCanvasHeight = canvasHeightPx / pixelRatio

          // Top trim line
          ctx.beginPath()
          ctx.moveTo(0, bleedDraw)
          ctx.lineTo(drawCanvasWidth, bleedDraw)
          ctx.stroke()

          // Bottom trim line
          ctx.beginPath()
          ctx.moveTo(0, drawCanvasHeight - bleedDraw)
          ctx.lineTo(drawCanvasWidth, drawCanvasHeight - bleedDraw)
          ctx.stroke()

          // Left trim line
          ctx.beginPath()
          ctx.moveTo(bleedDraw, 0)
          ctx.lineTo(bleedDraw, drawCanvasHeight)
          ctx.stroke()

          // Right trim line
          ctx.beginPath()
          ctx.moveTo(drawCanvasWidth - bleedDraw, 0)
          ctx.lineTo(drawCanvasWidth - bleedDraw, drawCanvasHeight)
          ctx.stroke()

          // Reset line dash
          ctx.setLineDash([])

          // Add "TRIM" labels at corners
          ctx.fillStyle = "rgba(239, 68, 68, 0.9)"
          ctx.font = "bold 10px sans-serif"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"

          // Draw small corner markers
          const corners = [
            { x: bleedDraw, y: bleedDraw }, // Top-left
            { x: drawCanvasWidth - bleedDraw, y: bleedDraw }, // Top-right
            { x: bleedDraw, y: drawCanvasHeight - bleedDraw }, // Bottom-left
            { x: drawCanvasWidth - bleedDraw, y: drawCanvasHeight - bleedDraw }, // Bottom-right
          ]

          corners.forEach((corner) => {
            ctx.fillRect(corner.x - 1, corner.y - 1, 3, 3)
          })
        }
      } catch (err) {
        console.error("Error drawing card:", err)
        // Draw placeholder (use unscaled dimensions)
        const drawWidth = canvas.width / pixelRatio
        const drawHeight = canvas.height / pixelRatio
        ctx.fillStyle = "#e2e8f0"
        ctx.fillRect(0, 0, drawWidth, drawHeight)
        ctx.fillStyle = "#64748b"
        ctx.font = "14px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(name || "Card", drawWidth / 2, drawHeight / 2)
      }
    }

    draw()
  }, [
    imageUrl,
    generatedBleedUrl,
    bleedMm,
    canvasWidthPx,
    canvasHeightPx,
    bleedPx,
    showTrimLines,
    name,
    pixelRatio,
    grayscale,
  ])

  // Generate bleed when dependencies change
  useEffect(() => {
    generateBleed()
  }, [generateBleed])

  // Convert pixel dimensions back to mm for display
  const displayWidthMm = cardWidthMm + bleedMm * 2
  const displayHeightMm = cardHeightMm + bleedMm * 2

  return (
    <div
      className={cn("relative", className)}
      style={
        fillParent
          ? {
              width: "100%",
              height: "100%",
            }
          : {
              width: `${cardWidthMm}mm`,
              height: `${cardHeightMm}mm`,
            }
      }
    >
      {/* Canvas - fills container when fillParent, otherwise extends outward with bleed */}
      <canvas
        ref={canvasRef}
        style={
          fillParent
            ? {
                width: "100%",
                height: "100%",
                left: 0,
                top: 0,
              }
            : {
                width: `${displayWidthMm}mm`,
                height: `${displayHeightMm}mm`,
                left: `-${bleedMm}mm`,
                top: `-${bleedMm}mm`,
              }
        }
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 p-2">
          <span className="text-center text-xs text-red-400">{error}</span>
        </div>
      )}
    </div>
  )
}
