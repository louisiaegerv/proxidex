"use client"

import { useRef, useEffect } from "react"

interface StardustCanvasProps {
  width: number
  height: number
}

export function StardustCanvas({ width, height }: StardustCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const context = ctx

    const W = width
    const H = height
    const pts = Array.from({ length: 160 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.9 + 0.35,
      h: Math.random() * 360,
      s: Math.random() * 1.9 + 0.7,
      p: Math.random() * Math.PI * 2,
      star: Math.random() < 0.28,
    }))

    function drawStar(x: number, y: number, r: number) {
      context.beginPath()
      context.moveTo(x, y - r * 3)
      context.lineTo(x + r * 0.42, y - r * 0.42)
      context.lineTo(x + r * 3, y)
      context.lineTo(x + r * 0.42, y + r * 0.42)
      context.lineTo(x, y + r * 3)
      context.lineTo(x - r * 0.42, y + r * 0.42)
      context.lineTo(x - r * 3, y)
      context.lineTo(x - r * 0.42, y - r * 0.42)
      context.closePath()
      context.fill()
    }

    let rafId: number
    function tick(ts: number) {
      context.clearRect(0, 0, W, H)
      const t = ts / 1000

      pts.forEach((p) => {
        const alpha = (Math.sin(t * p.s + p.p) + 1) / 2
        if (alpha < 0.04) return

        const hue = (p.h + t * 22) % 360
        context.globalAlpha = alpha * 0.92
        context.fillStyle = `hsl(${hue}, 100%, 88%)`

        if (p.star) {
          drawStar(p.x, p.y, p.r)
        } else {
          context.beginPath()
          context.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          context.fill()
        }

        context.globalAlpha = alpha * 0.12
        context.beginPath()
        context.arc(p.x, p.y, p.r * 3.8, 0, Math.PI * 2)
        context.fill()
      })

      context.globalAlpha = 1
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0 z-10 rounded-xl"
      style={{ mixBlendMode: "screen" }}
    />
  )
}
