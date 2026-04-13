import { PDFDocument, rgb } from "pdf-lib"
import { getPrintImageUrl } from "@/lib/images"
import type { ProxyItem, PrintSettings, BleedMethod } from "@/types"

// Page dimensions in points (72 points = 1 inch)
const PAGE_SIZES = {
  letter: { width: 612, height: 792 },
  a4: { width: 595, height: 842 },
}

const PAGE_DIMS_MM = {
  letter: { width: 216, height: 279 },
  a4: { width: 210, height: 297 },
}

function mmToPoints(mm: number): number {
  return (mm * 72) / 25.4
}

function getFullImageUrl(
  baseUrl: string | undefined,
  quality: "low" | "high" = "high"
): string | undefined {
  if (!baseUrl) return undefined
  
  // Local images already have full URL with .webp extension
  if (baseUrl.match(/\.(webp|png|jpg|jpeg)(\?.*)?$/i)) {
    return baseUrl
  }
  
  // Legacy TCGdex URLs need quality appended
  return `${baseUrl}/${quality}.png`
}

// Image cache to avoid double-fetching
const imageCache = new Map<string, Uint8Array>()

function getAbsoluteUrl(url: string): string {
  // If already absolute, return as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  
  // If relative, prepend origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
  }
  
  return url
}

/**
 * Convert WebP or any image format to PNG using Canvas
 * pdf-lib only supports PNG and JPEG natively
 */
async function convertToPng(imageData: Uint8Array): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    try {
      // Create blob from image data
      const blob = new Blob([imageData.buffer as ArrayBuffer])
      const url = URL.createObjectURL(blob)
      
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          URL.revokeObjectURL(url)
          resolve(null)
          return
        }
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0)
        
        // Convert to PNG
        canvas.toBlob((pngBlob) => {
          URL.revokeObjectURL(url)
          if (!pngBlob) {
            resolve(null)
            return
          }
          
          // Read PNG blob as Uint8Array
          const reader = new FileReader()
          reader.onload = () => {
            resolve(new Uint8Array(reader.result as ArrayBuffer))
          }
          reader.onerror = () => resolve(null)
          reader.readAsArrayBuffer(pngBlob)
        }, 'image/png')
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      img.src = url
    } catch (error) {
      console.error('[PDF] Error converting to PNG:', error)
      resolve(null)
    }
  })
}

/**
 * Convert PNG image data to grayscale
 * Uses canvas to read pixel data, convert to grayscale, and export as PNG
 */
async function convertToGrayscale(pngData: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob([pngData.buffer as ArrayBuffer])
      const url = URL.createObjectURL(blob)
      
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        // Draw image
        ctx.drawImage(img, 0, 0)
        
        // Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Convert to grayscale using luminance formula
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          // Luminance formula: 0.299*R + 0.587*G + 0.114*B
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
          // Alpha channel (data[i + 3]) remains unchanged
        }
        
        // Put modified data back
        ctx.putImageData(imageData, 0, 0)
        
        // Export as PNG
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          if (!blob) {
            reject(new Error('Failed to create blob'))
            return
          }
          
          const reader = new FileReader()
          reader.onload = () => {
            resolve(new Uint8Array(reader.result as ArrayBuffer))
          }
          reader.onerror = () => reject(new Error('Failed to read blob'))
          reader.readAsArrayBuffer(blob)
        }, 'image/png')
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }
      
      img.src = url
    } catch (error) {
      reject(error)
    }
  })
}

async function fetchImage(url: string, grayscale: boolean = false): Promise<Uint8Array | null> {
  try {
    // Check cache first (use original URL + grayscale flag as key)
    const cacheKey = `${url}|${grayscale ? 'bw' : 'color'}`
    if (imageCache.has(cacheKey)) {
      return imageCache.get(cacheKey)!
    }

    // Handle data URLs
    if (url.startsWith("data:")) {
      const base64Data = url.split(",")[1]
      if (!base64Data) return null
      let data = new Uint8Array(Buffer.from(base64Data, "base64"))
      
      // Apply grayscale if requested
      if (grayscale) {
        data = await convertToGrayscale(data)
      }
      
      imageCache.set(cacheKey, data)
      return data
    }

    // Convert relative URLs to absolute
    const absoluteUrl = getAbsoluteUrl(url)
    console.log('[PDF] Fetching image:', absoluteUrl, grayscale ? '(grayscale)' : '')

    // Handle regular URLs
    const response = await fetch(absoluteUrl)
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    const arrayBuffer = await response.arrayBuffer()
    let data: Uint8Array = new Uint8Array(arrayBuffer)
    
    // Check if it's WebP (needs conversion for pdf-lib)
    const isWebP = data.length > 12 && 
      data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
      data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50
    
    if (isWebP) {
      console.log('[PDF] Converting WebP to PNG:', absoluteUrl)
      const pngData = await convertToPng(data)
      if (pngData) {
        data = pngData
        console.log('[PDF] WebP conversion successful:', absoluteUrl)
      } else {
        console.error('[PDF] WebP conversion failed:', absoluteUrl)
      }
    }
    
    // Apply grayscale conversion if requested
    if (grayscale) {
      console.log('[PDF] Converting to grayscale:', absoluteUrl)
      data = await convertToGrayscale(data)
    }
    
    imageCache.set(cacheKey, data)
    console.log('[PDF] Successfully loaded image:', absoluteUrl, `(${data.length} bytes)`)
    return data
  } catch (error) {
    console.error("[PDF] Error fetching image:", url, error)
    return null
  }
}

/**
 * Generate bleed image client-side using Canvas API
 * Replaces server-side API processing for better scalability
 */
async function generateBleedImageClientSide(
  imageUrl: string,
  method: BleedMethod,
  bleedMm: number,
  bleedColor?: { r: number; g: number; b: number }
): Promise<string | null> {
  try {
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
  } catch (error) {
    console.error("[PDF] Error generating bleed client-side:", error)
    return null
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
  
  // Fill corners with white (simplification - could mirror corners too)
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, bleedPx, bleedPx)
  ctx.fillRect(bleedPx + width, 0, bleedPx, bleedPx)
  ctx.fillRect(0, bleedPx + height, bleedPx, bleedPx)
  ctx.fillRect(bleedPx + width, bleedPx + height, bleedPx, bleedPx)
  
  return ctx.canvas.toDataURL('image/png')
}

/**
 * EDGE method: Extend canvas by stretching the 1px outermost border
 * Replicates pixel-by-pixel like the original Canvas implementation
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
 * Generate bleed image - now client-side only
 * Falls back to original image if bleed is 0 or processing fails
 */
async function generateBleedImage(
  imageUrl: string,
  method: BleedMethod,
  bleedMm: number,
  bleedColor?: { r: number; g: number; b: number }
): Promise<string | null> {
  // Use client-side processing
  return generateBleedImageClientSide(imageUrl, method, bleedMm, bleedColor)
}

/**
 * Process items in chunks to avoid overwhelming the browser/API
 */
async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  chunkSize: number,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = []
  const total = items.length

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    const chunkResults = await Promise.all(chunk.map(processor))
    results.push(...chunkResults)

    if (onProgress) {
      onProgress(Math.min(i + chunkSize, total), total)
    }

    // No delay between chunks - client-side processing is fast enough
  }

  return results
}

export interface PDFGenerationProgress {
  stage: "bleed-generation" | "pdf-assembly" | "pdf-save"
  current: number
  total: number
  message: string
}

export async function generateProxyPDF(
  items: ProxyItem[],
  settings: PrintSettings,
  onProgress?: (progress: PDFGenerationProgress) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  const pageSize = PAGE_SIZES[settings.pageSize]
  const pageDimsMm = PAGE_DIMS_MM[settings.pageSize]

  // Card dimensions (trim box)
  const cardWidthMm = settings.cardWidth
  const cardHeightMm = settings.cardHeight
  const bleedMm = settings.bleed

  // Image extends past card by bleed
  const imageWidthMm = cardWidthMm + bleedMm * 2
  const imageHeightMm = cardHeightMm + bleedMm * 2

  // Convert to points
  const cardWidthPoints = mmToPoints(cardWidthMm)
  const cardHeightPoints = mmToPoints(cardHeightMm)
  const imageWidthPoints = mmToPoints(imageWidthMm)
  const imageHeightPoints = mmToPoints(imageHeightMm)
  const bleedPoints = mmToPoints(bleedMm)
  const offsetXPoints = mmToPoints(settings.offsetX)
  const offsetYPoints = mmToPoints(settings.offsetY)

  // Spacing is based on IMAGE size + gap to prevent overlap
  const spacingX = mmToPoints(imageWidthMm + settings.gap)
  const spacingY = mmToPoints(imageHeightMm + settings.gap)

  // Cut line spacing is based on card size (trim box boundaries)
  const cutLineSpacingX = mmToPoints(cardWidthMm + settings.gap)
  const cutLineSpacingY = mmToPoints(cardHeightMm + settings.gap)

  // Grid dimensions based on IMAGE sizes + gaps
  const gridWidthMm =
    settings.cardsPerRow * imageWidthMm +
    (settings.cardsPerRow - 1) * settings.gap
  const gridHeightMm =
    settings.rowsPerPage * imageHeightMm +
    (settings.rowsPerPage - 1) * settings.gap

  // Center the image grid + apply offsets
  const marginXMm = (pageDimsMm.width - gridWidthMm) / 2 + settings.offsetX
  const marginYMm = (pageDimsMm.height - gridHeightMm) / 2 + settings.offsetY
  const marginX = mmToPoints(marginXMm)
  const marginY = mmToPoints(marginYMm)

  // Flatten items (each item is 1 card)
  const cardsToPrint: ProxyItem[] = items

  const cardsPerPage = settings.cardsPerRow * settings.rowsPerPage
  const totalPages = Math.ceil(cardsToPrint.length / cardsPerPage)

  // Cache for generated bleed images (key: cardId, value: base64 image data)
  const bleedImageCache = new Map<string, string>()

  // Pre-generate bleed images for all unique cards if bleed is enabled
  if (bleedMm > 0) {
    const uniqueCards = [
      ...new Map(cardsToPrint.map((c) => [c.cardId, c])).values(),
    ]

    onProgress?.({
      stage: "bleed-generation",
      current: 0,
      total: uniqueCards.length,
      message: `Generating bleed for ${uniqueCards.length} unique cards...`,
    })

    // Process in chunks of 5 to avoid overwhelming the API
    await processInChunks(
      uniqueCards,
      async (card) => {
        // Use configured image size for PDF generation
        if (!card.image) return null
        const printImageUrl = getPrintImageUrl(card.image, settings.imageSize ?? 'lg')
        const imageUrl = getFullImageUrl(printImageUrl, settings.imageQuality)
        if (!imageUrl) return null

        const bleedImageUrl = await generateBleedImage(
          imageUrl,
          settings.bleedMethod as BleedMethod,
          bleedMm,
          settings.bleedColor
        )

        if (bleedImageUrl) {
          bleedImageCache.set(card.cardId, bleedImageUrl)
        }
        return card.cardId
      },
      5, // Process 5 cards at a time
      (completed, total) => {
        onProgress?.({
          stage: "bleed-generation",
          current: completed,
          total,
          message: `Generated bleed for ${completed} of ${total} cards...`,
        })
      }
    )
  }

  onProgress?.({
    stage: "pdf-assembly",
    current: 0,
    total: totalPages,
    message: `Assembling ${totalPages} pages...`,
  })

  // Track embedding progress across all pages
  let totalEmbeddedCount = 0
  const totalCardsToEmbed = cardsToPrint.length

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const page = pdfDoc.addPage([pageSize.width, pageSize.height])
    const startCardIndex = pageIndex * cardsPerPage
    const pageCards = cardsToPrint.slice(
      startCardIndex,
      startCardIndex + cardsPerPage
    )

    // Report progress at start of page (layout phase)
    onProgress?.({
      stage: "pdf-assembly",
      current: pageIndex,
      total: totalPages,
      message: `Building page ${pageIndex + 1} of ${totalPages}...`,
    })

    // Helper function to draw cut lines at each card's trim box boundaries
    const drawCutLines = () => {
      if (!settings.showCutLines) return

      // Get custom cut line color or default to emerald
      const cutColor = settings.cutLineColor
        ? rgb(
            settings.cutLineColor.r / 255,
            settings.cutLineColor.g / 255,
            settings.cutLineColor.b / 255
          )
        : rgb(0.06, 0.73, 0.49)
      const lineWidth = settings.cutLineWidth ?? 1.5
      const extension = mmToPoints(settings.cutLineLength ?? 8)

      // Draw cut lines for EACH card individually
      // Card's trim box is offset by bleed from image position
      for (let row = 0; row < settings.rowsPerPage; row++) {
        for (let col = 0; col < settings.cardsPerRow; col++) {
          const cardX = marginX + col * spacingX + bleedPoints
          const cardTopY =
            pageSize.height - marginY - row * spacingY - bleedPoints
          const cardBottomY = cardTopY - cardHeightPoints

          // Top edge of this card
          page.drawLine({
            start: { x: cardX - extension, y: cardTopY },
            end: { x: cardX + cardWidthPoints + extension, y: cardTopY },
            thickness: lineWidth,
            color: cutColor,
            dashArray: [4, 2],
          })

          // Bottom edge of this card
          page.drawLine({
            start: { x: cardX - extension, y: cardBottomY },
            end: { x: cardX + cardWidthPoints + extension, y: cardBottomY },
            thickness: lineWidth,
            color: cutColor,
            dashArray: [4, 2],
          })

          // Left edge of this card
          page.drawLine({
            start: { x: cardX, y: cardTopY + extension },
            end: { x: cardX, y: cardBottomY - extension },
            thickness: lineWidth,
            color: cutColor,
            dashArray: [4, 2],
          })

          // Right edge of this card
          page.drawLine({
            start: { x: cardX + cardWidthPoints, y: cardTopY + extension },
            end: { x: cardX + cardWidthPoints, y: cardBottomY - extension },
            thickness: lineWidth,
            color: cutColor,
            dashArray: [4, 2],
          })
        }
      }
    }

    // Helper function to draw card images (with bleed extending past cut lines)
    const drawCardImages = async () => {
      for (let i = 0; i < pageCards.length; i++) {
        const card = pageCards[i]
        const row = Math.floor(i / settings.cardsPerRow)
        const col = i % settings.cardsPerRow

        // Image position: base grid position
        // Trim box is at: image position + bleed
        // Image extends bleed past trim box on each side
        // In PDF coordinates, y is the bottom of the image
        const imageX = marginX + col * spacingX
        const imageY =
          pageSize.height - marginY - row * spacingY - imageHeightPoints

        // Use cached bleed image if available, otherwise fall back to original
        // Use configured image size for PDF generation
        if (!card.image) continue
        const cachedBleedImage = bleedImageCache.get(card.cardId)
        const printImageUrl = getPrintImageUrl(card.image, settings.imageSize ?? 'lg')
        const imageUrl =
          cachedBleedImage || getFullImageUrl(printImageUrl, settings.imageQuality)

        if (imageUrl) {
          try {
            const imageData = await fetchImage(imageUrl, settings.blackAndWhite ?? false)
            if (imageData) {
              let embeddedImage
              try {
                embeddedImage = await pdfDoc.embedPng(imageData)
              } catch {
                try {
                  embeddedImage = await pdfDoc.embedJpg(imageData)
                } catch {
                  continue
                }
              }

              page.drawImage(embeddedImage, {
                x: imageX,
                y: imageY,
                width: imageWidthPoints,
                height: imageHeightPoints,
              })
            }
          } catch (error) {
            console.error("Error embedding image:", error)
          }
        }
        
        // Report progress after each image embedding
        totalEmbeddedCount++
        onProgress?.({
          stage: "pdf-assembly",
          current: pageIndex + (totalEmbeddedCount / totalCardsToEmbed),
          total: totalPages,
          message: `Embedding images (${totalEmbeddedCount}/${totalCardsToEmbed})...`,
        })
      }
    }

    // Draw based on cutLinePosition setting
    // PDF uses painter's model: later drawings appear on top
    if (settings.cutLinePosition === "front") {
      // Draw images first, then cut lines on top
      await drawCardImages()
      drawCutLines()
    } else {
      // Default: draw cut lines first, then images on top
      drawCutLines()
      await drawCardImages()
    }
  }

  onProgress?.({
    stage: "pdf-save",
    current: 1,
    total: 1,
    message: "Finalizing PDF...",
  })

  return await pdfDoc.save()
}

export function downloadPDF(
  pdfBytes: Uint8Array,
  filename: string = "proxidex-cards.pdf"
) {
  const blob = new Blob([pdfBytes as unknown as BlobPart], {
    type: "application/pdf",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export { getFullImageUrl }

// Global cache for bleed-generated images (key: cacheKey, value: dataURL)
export const bleedImageCache = new Map<string, string>()

/**
 * Clear the image cache to free memory
 */
export function clearImageCache() {
  imageCache.clear()
}

/**
 * Get cached bleed image for a card
 */
export function getCachedBleedImage(cacheKey: string): string | undefined {
  return bleedImageCache.get(cacheKey)
}

/**
 * Set cached bleed image for a card
 */
export function setCachedBleedImage(cacheKey: string, dataUrl: string): void {
  bleedImageCache.set(cacheKey, dataUrl)
}

/**
 * Generate bleed image client-side using Canvas API
 * Processes a single image with bleed
 */
async function generateBleedForBatch(
  imageUrl: string,
  method: BleedMethod,
  bleedMm: number,
  bleedColor?: { r: number; g: number; b: number },
  format: 'png' | 'jpeg' = 'png'
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
    return imageUrl
  }

  // Create canvas with bleed dimensions
  const canvas = document.createElement('canvas')
  canvas.width = width + bleedPx * 2
  canvas.height = height + bleedPx * 2
  const ctx = canvas.getContext('2d')!

  // Use the appropriate method
  switch (method) {
    case 'replicate': {
      // Fill with bleed color
      if (bleedColor) {
        ctx.fillStyle = `rgb(${bleedColor.r}, ${bleedColor.g}, ${bleedColor.b})`
      } else {
        // Auto-detect from center
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = 5
        tempCanvas.height = 5
        const tempCtx = tempCanvas.getContext('2d')!
        tempCtx.drawImage(img, Math.floor(width/2)-2, Math.floor(height/2)-2, 5, 5, 0, 0, 5, 5)
        const pixel = tempCtx.getImageData(2, 2, 1, 1).data
        ctx.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, bleedPx, bleedPx, width, height)
      break
    }
    case 'mirror': {
      // Draw original
      ctx.drawImage(img, bleedPx, bleedPx, width, height)
      
      // Mirror edges
      ctx.save()
      ctx.translate(bleedPx, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0, bleedPx, height, 0, bleedPx, bleedPx, height)
      ctx.restore()
      
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(img, width - bleedPx, 0, bleedPx, height, 0, bleedPx, bleedPx, height)
      ctx.restore()
      
      ctx.save()
      ctx.translate(0, bleedPx)
      ctx.scale(1, -1)
      ctx.drawImage(img, 0, 0, width, bleedPx, bleedPx, 0, width, bleedPx)
      ctx.restore()
      
      ctx.save()
      ctx.translate(0, canvas.height)
      ctx.scale(1, -1)
      ctx.drawImage(img, 0, height - bleedPx, width, bleedPx, bleedPx, 0, width, bleedPx)
      ctx.restore()
      
      // Mirror corners
      ctx.save()
      ctx.translate(0, 0)
      ctx.scale(-1, -1)
      ctx.drawImage(img, 0, 0, bleedPx, bleedPx, -bleedPx, -bleedPx, bleedPx, bleedPx)
      ctx.restore()
      
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, -1)
      ctx.drawImage(img, width - bleedPx, 0, bleedPx, bleedPx, 0, -bleedPx, bleedPx, bleedPx)
      ctx.restore()
      
      ctx.save()
      ctx.translate(0, canvas.height)
      ctx.scale(-1, -1)
      ctx.drawImage(img, 0, height - bleedPx, bleedPx, bleedPx, -bleedPx, 0, bleedPx, bleedPx)
      ctx.restore()
      
      ctx.save()
      ctx.translate(canvas.width, canvas.height)
      ctx.scale(-1, -1)
      ctx.drawImage(img, width - bleedPx, height - bleedPx, bleedPx, bleedPx, 0, 0, bleedPx, bleedPx)
      ctx.restore()
      break
    }
    case 'edge': {
      // Get pixel data
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
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, bleedPx, bleedPx)
      
      const inset = 2
      
      // Stretch edges
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
      
      // Corners
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
      break
    }
  }
  
  return format === 'jpeg' 
    ? canvas.toDataURL('image/jpeg', 0.92)
    : canvas.toDataURL('image/png')
}

/**
 * Batch process all unique cards with bleed in the background
 * Returns a map of imageUrl -> bleedDataUrl
 * @param format - 'png' for PDF (lossless), 'jpeg' for HTML (smaller)
 */
export async function batchGenerateBleedImages(
  items: ProxyItem[],
  settings: PrintSettings,
  onProgress?: (current: number, total: number) => void,
  format: 'png' | 'jpeg' = 'png'
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  
  // Get unique cards (don't process duplicates)
  const uniqueImages = new Map<string, ProxyItem>()
  for (const item of items) {
    if (item.image && !uniqueImages.has(item.image)) {
      uniqueImages.set(item.image, item)
    }
  }
  
  const uniqueItems = Array.from(uniqueImages.values())
  const total = uniqueItems.length
  
  // Process each unique card
  for (let i = 0; i < uniqueItems.length; i++) {
    const item = uniqueItems[i]
    if (!item.image) continue
    
    // Get the actual image URL for processing (lg size for export)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const relativeUrl = getPrintImageUrl(item.image, settings.imageSize ?? 'lg')
    const absoluteUrl = relativeUrl.startsWith('http') 
      ? relativeUrl 
      : `${origin}${relativeUrl}`
    
    // Build cache key using the lg image URL
    const cacheKey = `${absoluteUrl}|${settings.bleedMethod ?? 'replicate'}|${settings.bleed}|${settings.bleedColor?.r ?? 'auto'}|${settings.bleedColor?.g ?? 'auto'}|${settings.bleedColor?.b ?? 'auto'}`
    
    // Check if already cached
    if (bleedImageCache.has(cacheKey)) {
      result.set(item.image, bleedImageCache.get(cacheKey)!)
      onProgress?.(i + 1, total)
      continue
    }
    
    // Generate bleed
    try {
      const bleedDataUrl = await generateBleedForBatch(
        absoluteUrl,
        (settings.bleedMethod as BleedMethod) ?? 'replicate',
        settings.bleed,
        settings.bleedColor,
        format
      )
      
      // Cache it (using absolute URL as key)
      bleedImageCache.set(cacheKey, bleedDataUrl)
      result.set(item.image, bleedDataUrl)
    } catch (err) {
      console.error(`Failed to generate bleed for ${item.image}:`, err)
      // Fall back to original image
      result.set(item.image, item.image)
    }
    
    // Report progress
    onProgress?.(i + 1, total)
    
    // Yield to browser to keep UI responsive
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  
  return result
}

/**
 * Generate HTML file for printing with WebP images
 * This avoids WebP->PNG conversion since browsers handle WebP natively
 * When bleed > 0 and cached images exist, uses those instead
 */
export function generatePrintHTML(
  items: ProxyItem[],
  settings: PrintSettings
): string {
  const pageDims = PAGE_DIMS_MM[settings.pageSize]
  const cardWidth = settings.cardWidth
  const cardHeight = settings.cardHeight
  const bleed = settings.bleed
  const gap = settings.gap
  const imageWidth = cardWidth + bleed * 2
  const imageHeight = cardHeight + bleed * 2

  // Calculate grid dimensions
  const gridWidth =
    settings.cardsPerRow * imageWidth + (settings.cardsPerRow - 1) * gap
  const gridHeight =
    settings.rowsPerPage * imageHeight + (settings.rowsPerPage - 1) * gap

  // Center the grid with offsets
  const marginX = (pageDims.width - gridWidth) / 2 + settings.offsetX
  const marginY = (pageDims.height - gridHeight) / 2 + settings.offsetY

  // Get origin for absolute URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  
  // Helper to build cache key (uses absolute lg URL for consistency)
  const buildBleedCacheKey = (imageUrl: string): string => {
    return `${imageUrl}|${settings.bleedMethod ?? 'replicate'}|${settings.bleed}|${settings.bleedColor?.r ?? 'auto'}|${settings.bleedColor?.g ?? 'auto'}|${settings.bleedColor?.b ?? 'auto'}`
  }
  
  // Flatten items for display (each item is 1 card)
  const cardsToPrint: { item: ProxyItem; imageUrl: string }[] = items.map((item) => {
    let imageUrl = ''
      
      if (item.image) {
        // Get the lg image URL for cache lookup
        const relativeUrl = getPrintImageUrl(item.image, settings.imageSize ?? 'lg')
        const absoluteUrl = relativeUrl.startsWith('http') 
          ? relativeUrl 
          : `${origin}${relativeUrl}`
        
        // If bleed is enabled, try to use cached bleed image
        if (settings.bleed > 0) {
          const cacheKey = buildBleedCacheKey(absoluteUrl)
          const cachedBleed = bleedImageCache.get(cacheKey)
          if (cachedBleed) {
            imageUrl = cachedBleed
          } else {
            // Fall back to raw image URL (will show without bleed)
            imageUrl = absoluteUrl
          }
        } else {
          // No bleed - use WebP URL directly
          imageUrl = absoluteUrl
        }
      }
    return { item, imageUrl }
  })

  const cardsPerPage = settings.cardsPerRow * settings.rowsPerPage
  const totalPages = Math.ceil(cardsToPrint.length / cardsPerPage)

  // Build HTML pages
  let pagesHTML = ''
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const pageCards = cardsToPrint.slice(
      pageIndex * cardsPerPage,
      (pageIndex + 1) * cardsPerPage
    )

    let cardsHTML = ''
    for (let i = 0; i < pageCards.length; i++) {
      const { item, imageUrl } = pageCards[i]
      const row = Math.floor(i / settings.cardsPerRow)
      const col = i % settings.cardsPerRow

      const x = marginX + col * (imageWidth + gap)
      const y = marginY + row * (imageHeight + gap)

      // Cut line positions (relative to card)
      const cutLineExtension = settings.cutLineLength ?? 8
      const cutColor = settings.cutLineColor
        ? `rgb(${settings.cutLineColor.r}, ${settings.cutLineColor.g}, ${settings.cutLineColor.b})`
        : '#10b981'

      // Build cut lines HTML
      const cutLinesHTML = settings.showCutLines
        ? `
          <div class="cut-line cut-line-top" style="
            position: absolute;
            left: -${cutLineExtension}mm;
            right: -${cutLineExtension}mm;
            top: ${bleed}mm;
            height: 0;
            border-top: 1.5px dashed ${cutColor};
            z-index: ${settings.cutLinePosition === 'front' ? '2' : '0'};
          "></div>
          <div class="cut-line cut-line-bottom" style="
            position: absolute;
            left: -${cutLineExtension}mm;
            right: -${cutLineExtension}mm;
            bottom: ${bleed}mm;
            height: 0;
            border-top: 1.5px dashed ${cutColor};
            z-index: ${settings.cutLinePosition === 'front' ? '2' : '0'};
          "></div>
          <div class="cut-line cut-line-left" style="
            position: absolute;
            top: -${cutLineExtension}mm;
            bottom: -${cutLineExtension}mm;
            left: ${bleed}mm;
            width: 0;
            border-left: 1.5px dashed ${cutColor};
            z-index: ${settings.cutLinePosition === 'front' ? '2' : '0'};
          "></div>
          <div class="cut-line cut-line-right" style="
            position: absolute;
            top: -${cutLineExtension}mm;
            bottom: -${cutLineExtension}mm;
            right: ${bleed}mm;
            width: 0;
            border-left: 1.5px dashed ${cutColor};
            z-index: ${settings.cutLinePosition === 'front' ? '2' : '0'};
          "></div>
        `
        : ''

      // Build image HTML
      const imageHTML = `
        <img 
          src="${imageUrl}" 
          alt="${item.name}"
          style="
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            position: relative;
            z-index: 1;
          "
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
        />
        <div class="placeholder" style="
          display: none;
          width: 100%;
          height: 100%;
          background: #e2e8f0;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #64748b;
          position: absolute;
          inset: 0;
          z-index: 1;
        ">${item.name}</div>
      `

      // Order elements based on cutLinePosition
      // "behind" (default): Cut lines first, then image on top
      // "front": Image first, then cut lines on top
      const contentHTML = settings.cutLinePosition === 'front'
        ? imageHTML + cutLinesHTML
        : cutLinesHTML + imageHTML

      cardsHTML += `
        <div class="card-container" style="
          position: absolute;
          left: ${x}mm;
          top: ${y}mm;
          width: ${imageWidth}mm;
          height: ${imageHeight}mm;
        ">
          ${contentHTML}
        </div>
      `
    }

    pagesHTML += `
      <div class="page" style="
        width: ${pageDims.width}mm;
        height: ${pageDims.height}mm;
        position: relative;
        box-sizing: border-box;
        page-break-after: always;
        background: white;
      ">
        ${cardsHTML}
      </div>
    `
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProxiDex - Print Preview</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: ${settings.pageSize === 'letter' ? '8.5in 11in' : 'A4'};
      margin: 0;
    }
    
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f1f5f9;
      padding: 20px;
    }
    
    .controls {
      max-width: 800px;
      margin: 0 auto 20px;
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .controls h1 {
      font-size: 18px;
      margin-bottom: 12px;
    }
    
    .controls p {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 8px;
    }
    
    .controls button {
      background: #10b981;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      margin-right: 8px;
    }
    
    .controls button:hover {
      background: #059669;
    }
    
    .page-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    
    .page {
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    @media print {
      body {
        padding: 0;
        background: white;
      }
      
      .controls {
        display: none;
      }
      
      .page-container {
        gap: 0;
      }
      
      .page {
        box-shadow: none;
        page-break-after: always;
      }
      
      .page:last-child {
        page-break-after: auto;
      }
    }
    
    @media screen {
      .cut-line {
        opacity: 0.6;
      }
    }
  </style>
</head>
<body>
  <div class="controls">
    <h1>🎴 ProxiDex Print Preview</h1>
    <p><strong>${items.length} cards</strong> • ${settings.pageSize.toUpperCase()} • ${settings.cardsPerRow}×${settings.rowsPerPage} grid</p>
    <p>WebP images loaded directly (no conversion). Use your browser's Print dialog (Ctrl+P / Cmd+P) to save as PDF.</p>
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button onclick="window.close()">❌ Close</button>
  </div>
  
  <div class="page-container">
    ${pagesHTML}
  </div>
</body>
</html>`

  return html
}

/**
 * Download HTML file for printing
 */
export function downloadPrintHTML(
  html: string,
  filename: string = "proxidex-cards.html"
) {
  const blob = new Blob([html], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
