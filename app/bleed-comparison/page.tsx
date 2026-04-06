"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Download,
  Upload,
  Sparkles,
  Copy,
  FlipHorizontal,
  StretchHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { CardWithBleed } from "@/components/card-with-bleed"
import type { BleedMethod } from "@/types"

// Sample card images for demonstration
const SAMPLE_CARDS = [
  {
    id: "sample-1",
    cardId: "sample-1",
    name: "Charizard ex",
    image: "https://assets.tcgdex.net/en/sv/sv03/125",
    setName: "Obsidian Flames",
    setId: "sv03",
    localId: "125",
    quantity: 1,
    variant: "normal" as const,
  },
  {
    id: "sample-2",
    cardId: "sample-2",
    name: "Pikachu",
    image: "https://assets.tcgdex.net/en/sv/sv01/042",
    setName: "Scarlet & Violet",
    setId: "sv01",
    localId: "042",
    quantity: 1,
    variant: "normal" as const,
  },
  {
    id: "sample-3",
    cardId: "sample-3",
    name: "Mew ex",
    image: "https://assets.tcgdex.net/en/sv/sv04/053",
    setName: "Paldean Fates",
    setId: "sv04",
    localId: "053",
    quantity: 1,
    variant: "normal" as const,
  },
]

interface BleedResult {
  method: BleedMethod
  imageUrl: string
  isLoading: boolean
  error?: string
}

/**
 * Process corners client-side to handle transparent corners
 */
async function processCornersClientSide(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      
      // Draw original image
      ctx.drawImage(img, 0, 0)
      
      // Get image data to find transparent corners
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Check if we have transparent pixels in corners
      const cornerSize = 20
      let needsProcessing = false
      
      // Check top-left corner
      for (let y = 0; y < cornerSize && !needsProcessing; y++) {
        for (let x = 0; x < cornerSize; x++) {
          const idx = (y * canvas.width + x) * 4
          if (data[idx + 3] < 255) {
            needsProcessing = true
            break
          }
        }
      }
      
      if (!needsProcessing) {
        resolve(imageUrl)
        return
      }
      
      // Fill transparent areas with white (extend card content)
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 255) {
          data[i] = 255     // R
          data[i + 1] = 255 // G
          data[i + 2] = 255 // B
          data[i + 3] = 255 // A
        }
      }
      
      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageUrl
  })
}

/**
 * Extract border color from image (client-side)
 */
async function extractBorderColor(imageUrl: string): Promise<{ r: number; g: number; b: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      
      // Sample from center (avoiding transparent corners)
      const centerX = Math.floor(img.width / 2)
      const centerY = Math.floor(img.height / 2)
      const pixel = ctx.getImageData(centerX, centerY, 1, 1).data
      
      resolve({ r: pixel[0], g: pixel[1], b: pixel[2] })
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageUrl
  })
}

/**
 * Generate bleed image client-side using Canvas API
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
  
  // Calculate bleed in pixels (assuming 300 DPI for PDF)
  const bleedPx = Math.round((bleedMm * 300) / 25.4)
  
  if (bleedPx === 0) {
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

function generateReplicateBleed(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  bleedPx: number,
  userColor?: { r: number; g: number; b: number }
): string {
  if (userColor) {
    ctx.fillStyle = `rgb(${userColor.r}, ${userColor.g}, ${userColor.b})`
  } else {
    // Auto-detect from center of image
    const cornerCanvas = document.createElement('canvas')
    cornerCanvas.width = 5
    cornerCanvas.height = 5
    const cornerCtx = cornerCanvas.getContext('2d')!
    cornerCtx.drawImage(img, Math.floor(img.width/2)-2, Math.floor(img.height/2)-2, 5, 5, 0, 0, 5, 5)
    const pixel = cornerCtx.getImageData(2, 2, 1, 1).data
    ctx.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`
  }
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.drawImage(img, bleedPx, bleedPx, width, height)
  return ctx.canvas.toDataURL('image/png')
}

function generateMirrorBleed(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  bleedPx: number
): string {
  ctx.drawImage(img, bleedPx, bleedPx, width, height)
  
  ctx.save()
  ctx.translate(bleedPx, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(img, 0, 0, bleedPx, height, 0, bleedPx, bleedPx, height)
  ctx.restore()
  
  ctx.save()
  ctx.translate(ctx.canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(img, width - bleedPx, 0, bleedPx, height, 0, bleedPx, bleedPx, height)
  ctx.restore()
  
  ctx.save()
  ctx.translate(0, bleedPx)
  ctx.scale(1, -1)
  ctx.drawImage(img, 0, 0, width, bleedPx, bleedPx, 0, width, bleedPx)
  ctx.restore()
  
  ctx.save()
  ctx.translate(0, ctx.canvas.height)
  ctx.scale(1, -1)
  ctx.drawImage(img, 0, height - bleedPx, width, bleedPx, bleedPx, 0, width, bleedPx)
  ctx.restore()
  
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, bleedPx, bleedPx)
  ctx.fillRect(bleedPx + width, 0, bleedPx, bleedPx)
  ctx.fillRect(0, bleedPx + height, bleedPx, bleedPx)
  ctx.fillRect(bleedPx + width, bleedPx + height, bleedPx, bleedPx)
  
  return ctx.canvas.toDataURL('image/png')
}

function generateEdgeBleed(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  bleedPx: number
): string {
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.drawImage(img, 0, 0)
  
  const imageData = tempCtx.getImageData(0, 0, width, height)
  const data = imageData.data
  
  const getPixel = (x: number, y: number): [number, number, number, number] => {
    const idx = (y * width + x) * 4
    return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]]
  }
  
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.drawImage(img, bleedPx, bleedPx)
  
  const inset = 2
  
  for (let y = 0; y < height; y++) {
    const [r, g, b, a] = getPixel(inset, y)
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
    for (let x = 0; x < bleedPx; x++) {
      ctx.fillRect(x, bleedPx + y, 1, 1)
    }
  }
  
  for (let y = 0; y < height; y++) {
    const [r, g, b, a] = getPixel(width - 1 - inset, y)
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
    for (let x = 0; x < bleedPx; x++) {
      ctx.fillRect(bleedPx + width + x, bleedPx + y, 1, 1)
    }
  }
  
  for (let x = 0; x < width; x++) {
    const [r, g, b, a] = getPixel(x, inset)
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
    for (let y = 0; y < bleedPx; y++) {
      ctx.fillRect(bleedPx + x, y, 1, 1)
    }
  }
  
  for (let x = 0; x < width; x++) {
    const [r, g, b, a] = getPixel(x, height - 1 - inset)
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
    for (let y = 0; y < bleedPx; y++) {
      ctx.fillRect(bleedPx + x, bleedPx + height + y, 1, 1)
    }
  }
  
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

export default function BleedComparisonPage() {
  const [selectedCard, setSelectedCard] = useState(SAMPLE_CARDS[0])
  const [bleedMm, setBleedMm] = useState(5)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<
    { r: number; g: number; b: number } | undefined
  >(undefined)
  const [suggestedColor, setSuggestedColor] = useState<
    { r: number; g: number; b: number } | undefined
  >(undefined)
  const [bleedResults, setBleedResults] = useState<
    Record<BleedMethod, BleedResult>
  >({
    replicate: { method: "replicate", imageUrl: "", isLoading: false },
    mirror: { method: "mirror", imageUrl: "", isLoading: false },
    edge: { method: "edge", imageUrl: "", isLoading: false },
  })

  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null)
  const [isProcessingCorners, setIsProcessingCorners] = useState(false)

  const rawImageUrl = uploadedImage || `${selectedCard.image}/high.png`
  const currentImageUrl = processedImageUrl || rawImageUrl

  // Process corners client-side when image changes
  useEffect(() => {
    const processCorners = async () => {
      if (rawImageUrl.startsWith("data:")) {
        setProcessedImageUrl(rawImageUrl)
        return
      }

      setIsProcessingCorners(true)
      try {
        const processed = await processCornersClientSide(rawImageUrl)
        setProcessedImageUrl(processed === rawImageUrl ? null : processed)
      } catch (err) {
        console.error("Failed to process corners:", err)
        setProcessedImageUrl(null)
      } finally {
        setIsProcessingCorners(false)
      }
    }

    processCorners()
  }, [rawImageUrl])

  // Extract suggested color client-side when image changes
  useEffect(() => {
    const fetchSuggestedColor = async () => {
      try {
        const color = await extractBorderColor(rawImageUrl)
        setSuggestedColor(color)
        if (!selectedColor) {
          setSelectedColor(color)
        }
      } catch (err) {
        console.error("Failed to extract color:", err)
      }
    }
    fetchSuggestedColor()
  }, [rawImageUrl, selectedColor])

  const generateBleedForMethod = useCallback(
    async (method: BleedMethod) => {
      setBleedResults((prev) => ({
        ...prev,
        [method]: { ...prev[method], isLoading: true, error: undefined },
      }))

      try {
        const bleedDataUrl = await generateBleedClientSide(
          currentImageUrl,
          method,
          bleedMm,
          method === "replicate" ? selectedColor : undefined
        )

        setBleedResults((prev) => ({
          ...prev,
          [method]: { ...prev[method], imageUrl: bleedDataUrl, isLoading: false },
        }))
      } catch (err) {
        console.error(`Error generating ${method} bleed:`, err)
        setBleedResults((prev) => ({
          ...prev,
          [method]: {
            ...prev[method],
            isLoading: false,
            error: err instanceof Error ? err.message : "Failed to generate",
          },
        }))
      }
    },
    [currentImageUrl, bleedMm, selectedColor]
  )

  const generateAllBleeds = useCallback(async () => {
    await Promise.all([
      generateBleedForMethod("replicate"),
      generateBleedForMethod("mirror"),
      generateBleedForMethod("edge"),
    ])
  }, [generateBleedForMethod])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const downloadPNG = async (method: BleedMethod) => {
    const result = bleedResults[method]
    if (!result.imageUrl) return

    const link = document.createElement("a")
    link.href = result.imageUrl
    link.download = `card-bleed-${method}-${bleedMm}mm.png`
    link.click()
  }

  const methodConfig = {
    replicate: {
      label: "Solid Color",
      icon: Copy,
      description: "Extends canvas with selected border color",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    mirror: {
      label: "Mirror",
      icon: FlipHorizontal,
      description: "Mirrors edge pixels outward",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    edge: {
      label: "Edge Stretch",
      icon: StretchHorizontal,
      description: "Stretches the 1px outermost border outward",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
    },
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-100">
            Card Bleed Comparison
          </h1>
          <p className="text-slate-400">
            Compare different canvas extension methods for print bleed areas
          </p>
          <p className="text-xs text-slate-500">
            All processing happens in your browser - no server calls needed
          </p>
        </div>

        {/* Controls */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {/* Card Selection */}
            <div className="space-y-3">
              <Label className="text-slate-300">Card</Label>
              <div className="flex gap-2">
                <select
                  value={selectedCard.id}
                  onChange={(e) => {
                    const card = SAMPLE_CARDS.find(
                      (c) => c.id === e.target.value
                    )
                    if (card) {
                      setSelectedCard(card)
                      setUploadedImage(null)
                    }
                  }}
                  className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  disabled={!!uploadedImage}
                >
                  {SAMPLE_CARDS.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
                <label className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4" />
                    </span>
                  </Button>
                </label>
              </div>
              {uploadedImage && (
                <p className="text-xs text-emerald-400">
                  Custom image uploaded
                </p>
              )}
              {isProcessingCorners && (
                <p className="flex items-center gap-1 text-xs text-amber-400">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                  Processing corners...
                </p>
              )}
            </div>

            {/* Bleed Width Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Bleed Width</Label>
                <span className="text-sm text-slate-500">{bleedMm}mm</span>
              </div>
              <Slider
                value={[bleedMm]}
                onValueChange={([value]) => setBleedMm(value)}
                min={0}
                max={5}
                step={0.5}
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0mm</span>
                <span>2.5mm</span>
                <span>5mm</span>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                onClick={generateAllBleeds}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate All Methods
              </Button>
            </div>

            {/* Color Picker (for Replicate) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Bleed Color</Label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={
                    selectedColor
                      ? `#${selectedColor.r.toString(16).padStart(2, "0")}${selectedColor.g.toString(16).padStart(2, "0")}${selectedColor.b.toString(16).padStart(2, "0")}`
                      : "#000000"
                  }
                  onChange={(e) => {
                    const hex = e.target.value
                    const r = parseInt(hex.slice(1, 3), 16)
                    const g = parseInt(hex.slice(3, 5), 16)
                    const b = parseInt(hex.slice(5, 7), 16)
                    setSelectedColor({ r, g, b })
                  }}
                  className="h-10 w-10 cursor-pointer rounded border border-slate-600 bg-transparent"
                />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">
                    {selectedColor
                      ? `RGB(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`
                      : "Loading..."}
                  </p>
                  {suggestedColor && (
                    <button
                      onClick={() => setSelectedColor(suggestedColor)}
                      className="mt-1 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Reset to suggested (auto-detected)
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500">
                For Solid Color method (auto-detected from image center)
              </p>
            </div>
          </div>
        </div>

        {/* Single Card Comparison View */}
        <div className="grid gap-6 lg:grid-cols-3">
          {(Object.keys(methodConfig) as BleedMethod[]).map((method) => {
            const config = methodConfig[method]
            const result = bleedResults[method]
            const Icon = config.icon

            return (
              <div
                key={method}
                className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
              >
                {/* Method Header */}
                <div
                  className={`flex items-center gap-3 border-b border-slate-800 p-4 ${config.bgColor}`}
                >
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <div>
                    <h3 className={`font-semibold ${config.color}`}>
                      {config.label}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {config.description}
                    </p>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-6">
                  <div className="flex justify-center">
                    {result.isLoading ? (
                      <div className="flex h-64 w-48 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500" />
                      </div>
                    ) : result.error ? (
                      <div className="flex h-64 w-48 items-center justify-center rounded-lg bg-red-900/20 p-4">
                        <p className="text-center text-sm text-red-400">
                          {result.error}
                        </p>
                      </div>
                    ) : result.imageUrl ? (
                      <div className="relative">
                        <CardWithBleed
                          imageUrl={currentImageUrl}
                          name={selectedCard.name}
                          bleedMm={bleedMm}
                          method={method}
                          showTrimLines={true}
                          bleedImageUrl={result.imageUrl}
                          bleedColor={
                            method === "replicate" ? selectedColor : undefined
                          }
                        />
                      </div>
                    ) : (
                      <div className="flex h-64 w-48 items-center justify-center rounded-lg border-2 border-dashed border-slate-700">
                        <p className="text-sm text-slate-500">
                          Click Generate to preview
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with specs */}
                <div className="border-t border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      <p>Card: 63×88mm</p>
                      <p>
                        Canvas: {63 + bleedMm * 2}×{88 + bleedMm * 2}mm
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                      onClick={() => downloadPNG(method)}
                      disabled={!result.imageUrl}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      PNG
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Technical Details */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-200">
            Technical Details
          </h3>
          <div className="grid gap-4 text-sm text-slate-400 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium text-slate-300">Solid Color Method</h4>
              <p>
                Samples the image center to suggest a color, but allows you to pick 
                any color using the color picker. Extends the canvas with the 
                selected color as the background.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-slate-300">Mirror Method</h4>
              <p>
                Extracts edge strips from each side, flips them
                horizontally/vertically, and composites them onto a new canvas.
                Corners are handled by flipping both axes.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-slate-300">
                Edge Stretch Method
              </h4>
              <p>
                Extracts the 1px outermost border and stretches it outward using
                nearest-neighbor interpolation (pixel repetition). This creates
                clean, sharp edges identical to canvas drawImage scaling.
                Corners are filled by stretching the corner pixel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
