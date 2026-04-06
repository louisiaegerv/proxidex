"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LivePreview } from "@/components/proxy/live-preview"

export function MobilePreview() {
  const [scale, setScale] = useState(1)
  const [showHint, setShowHint] = useState(true)
  const [contentHeight, setContentHeight] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  // Hide hint after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Update hint text after initial show
  useEffect(() => {
    if (!showHint) {
      // Re-show hint when scale changes significantly
      const timer = setTimeout(() => setShowHint(true), 100)
      const hideTimer = setTimeout(() => setShowHint(false), 3000)
      return () => {
        clearTimeout(timer)
        clearTimeout(hideTimer)
      }
    }
  }, [scale])

  // Measure content height and update when scale changes
  useEffect(() => {
    const measureContent = () => {
      if (measureRef.current) {
        const height = measureRef.current.scrollHeight
        setContentHeight(height)
      }
    }

    // Initial measurement
    measureContent()

    // Set up resize observer
    const observer = new ResizeObserver(() => {
      measureContent()
    })

    if (measureRef.current) {
      observer.observe(measureRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Track container width for responsive scaling
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
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
  }, [])



  // Double tap to reset
  const onDoubleClick = useCallback(() => {
    setScale(1)
  }, [])

  // Set specific zoom level
  const setZoom = useCallback((newScale: number) => {
    setScale(Math.max(0.5, Math.min(3, newScale)))
  }, [])

  const resetZoom = useCallback(() => {
    setScale(1)
  }, [])

  // Calculate the scaled height
  const scaledHeight = contentHeight > 0 ? contentHeight * scale : "auto"

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Header - NOT zoomed */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/50 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-100">Preview</h1>
            <p className="text-xs text-slate-500">
              Use buttons to zoom • Double-tap to reset
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400"
              onClick={() => setZoom(scale - 0.25)}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="w-12 text-center text-sm font-medium text-slate-300">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400"
              onClick={() => setZoom(scale + 0.25)}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400"
              onClick={resetZoom}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Zoomable Content Area - ONLY this area zooms */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto bg-slate-950"
        onDoubleClick={onDoubleClick}
      >
        {/* Zoom hint */}
        {showHint && (
          <div className="animate-fade-out pointer-events-none absolute top-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 backdrop-blur-sm">
            <p className="text-xs text-slate-300">Use buttons to zoom in/out</p>
          </div>
        )}

        {/* Hidden measurement div to get original content height */}
        <div
          ref={measureRef}
          className="absolute opacity-0 pointer-events-none"
          style={{ position: "fixed", left: "-9999px", top: 0, width: containerWidth > 0 ? containerWidth : "100vw" }}
        >
          <LivePreview hideHeader containerWidth={containerWidth} />
        </div>

        {/* Visible scaled content - height matches scaled size */}
        <div
          style={{
            height: scale === 1 ? "auto" : scaledHeight,
            minHeight: "100%",
          }}
        >
          <div
            ref={contentRef}
            className="origin-top transition-transform duration-100 ease-out"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
            }}
          >
            <LivePreview hideHeader containerWidth={containerWidth} />
          </div>
        </div>
      </div>
    </div>
  )
}
