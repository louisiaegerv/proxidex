"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { ZoomIn, ZoomOut, Maximize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LivePreview } from "@/components/proxy/live-preview"

// Page dimensions in mm (from PAGE_DIMENSIONS)
const LETTER_WIDTH_MM = 216
const LETTER_HEIGHT_MM = 279
// mm to pixels at 96 DPI (from live-preview)
const MM_TO_PX = 3.78
// Letter page size in pixels at 1x scale (0.8 base * 1.0 zoom)
const PAGE_WIDTH_PX = LETTER_WIDTH_MM * MM_TO_PX * 0.8 // ~653px (LivePreview uses 0.8 base scale)
// Desired padding on each side
const PAGE_PADDING = 16

export function MobilePreview() {
  const [scale, setScale] = useState(1)
  const [isFitToWidth, setIsFitToWidth] = useState(true)
  const [showHint, setShowHint] = useState(true)
  const [contentHeight, setContentHeight] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  // Calculate fit-to-width scale based on container width
  // The LivePreview renders at ~653px wide (0.8 base scale), so we calculate
  // how much to scale THAT to fit in our container with padding
  const calculateFitScale = useCallback((containerW: number) => {
    if (containerW <= 0) return 0.6
    const availableWidth = containerW - PAGE_PADDING * 2
    return Math.min(availableWidth / PAGE_WIDTH_PX, 1.2) // Cap at 120%
  }, [])

  // Hide hint after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Measure content height (at scale 1, i.e., unscaled)
  useEffect(() => {
    const measureContent = () => {
      if (measureRef.current) {
        const height = measureRef.current.scrollHeight
        setContentHeight(height)
      }
    }

    measureContent()

    const observer = new ResizeObserver(() => {
      measureContent()
    })

    if (measureRef.current) {
      observer.observe(measureRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Track container width and auto-fit on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth
        setContainerWidth(width)
        
        // Auto-fit to width when in fit-to-width mode
        if (isFitToWidth) {
          const fitScale = calculateFitScale(width)
          setScale(fitScale)
        }
      }
    }

    updateWidth()

    const observer = new ResizeObserver(() => {
      updateWidth()
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [isFitToWidth, calculateFitScale])

  // Double tap to fit to width
  const onDoubleClick = useCallback(() => {
    if (containerRef.current) {
      const fitScale = calculateFitScale(containerRef.current.clientWidth)
      setScale(fitScale)
      setIsFitToWidth(true)
    }
  }, [calculateFitScale])

  // Set specific zoom level (disables auto-fit)
  const setZoom = useCallback((newScale: number) => {
    setIsFitToWidth(false)
    setScale(Math.max(0.3, Math.min(2, newScale)))
  }, [])

  // Fit to width (enables auto-fit)
  const fitToWidth = useCallback(() => {
    if (containerRef.current) {
      const fitScale = calculateFitScale(containerRef.current.clientWidth)
      setScale(fitScale)
      setIsFitToWidth(true)
    }
  }, [calculateFitScale])

  // Calculate the scaled height for the container
  const scaledHeight = contentHeight > 0 ? contentHeight * scale : "auto"

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header - NOT zoomed */}
      <div className="shrink-0 border-b border-border bg-muted/50 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Print Preview</h1>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => setZoom(scale - 0.15)}
              title="Zoom out"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => setZoom(scale + 0.15)}
              title="Zoom in"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            
            <Button
              variant={isFitToWidth ? "secondary" : "ghost"}
              size="icon"
              className={`h-9 w-9 ${isFitToWidth ? "text-foreground bg-muted" : "text-muted-foreground"}`}
              onClick={fitToWidth}
              title="Fit to width"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Zoomable Content Area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto bg-background"
        onDoubleClick={onDoubleClick}
      >
        {/* Zoom hint */}
        {showHint && (
          <div className="animate-fade-out pointer-events-none absolute top-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-card/90 px-4 py-2 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">Double-tap to fit to width</p>
          </div>
        )}

        {/* Hidden measurement div - NO containerWidth prop so it renders at natural size */}
        <div
          ref={measureRef}
          className="absolute opacity-0 pointer-events-none"
          style={{ position: "fixed", left: "-9999px", top: 0 }}
        >
          <LivePreview hideHeader />
        </div>

        {/* Visible scaled content */}
        <div
          style={{
            height: scaledHeight,
            minHeight: "100%",
          }}
          className="flex justify-center py-4"
        >
          <div
            ref={contentRef}
            className="origin-top transition-transform duration-100 ease-out"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
            }}
          >
            {/* NO containerWidth prop - we handle scaling ourselves */}
            <LivePreview hideHeader />
          </div>
        </div>
      </div>
    </div>
  )
}
