"use client"

import {
  motion,
  useSpring,
  useTransform,
  useMotionValue,
  useScroll,
} from "framer-motion"
import Image from "next/image"
import { useEffect } from "react"
import type { HeroCard } from "@/lib/hero-cards"
import { PrismaticOverlay } from "./prismatic-overlay"
import { StardustCanvas } from "./stardust-canvas"
import { CARD_HALF_W, CARD_HALF_H } from "./constants"

interface ConvergingCardProps {
  card: HeroCard
  position: {
    xFromCenter: number
    yFromCenter: number
    rotate: number
    scale: number
    depth: number
  }
  mouseX: ReturnType<typeof useSpring>
  mouseY: ReturnType<typeof useSpring>
  index: number
  effect?: "prismatic" | "stardust" | null
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"]
  finalPosition: { x: number; y: number; rotate: number; scale: number }
}

export function ConvergingCard({
  card,
  position,
  mouseX,
  mouseY,
  index,
  effect,
  scrollYProgress,
  finalPosition,
}: ConvergingCardProps) {
  const entranceProgress = useMotionValue(0)
  useEffect(() => {
    const timer = setTimeout(() => entranceProgress.set(1), 100)
    return () => clearTimeout(timer)
  }, [entranceProgress])

  const convergence = useTransform(scrollYProgress, [0, 0.6], [0, 1])

  const rawRotateX = useTransform(mouseY, [-1, 1], [3, -3])
  const rawRotateY = useTransform(mouseX, [-1, 1], [-3, 3])

  const x = useTransform(
    [mouseX, convergence, entranceProgress],
    ([mx, conv, ent]) => {
      const c = Math.min(conv as number, 1)
      const mouseOffset = (mx as number) * (position.depth / 3) * (1 - c)
      const scatterX = position.xFromCenter - CARD_HALF_W
      const targetX  = finalPosition.x - CARD_HALF_W
      return mouseOffset + scatterX + (targetX - scatterX) * c
    }
  )

  const y = useTransform(
    [mouseY, convergence, entranceProgress],
    ([my, conv, ent]) => {
      const c = Math.min(conv as number, 1)
      const mouseOffset = (my as number) * (position.depth / 4) * (1 - c)
      const entranceOffset = 80 * (1 - (ent as number))
      const scatterY = position.yFromCenter - CARD_HALF_H
      const targetY  = finalPosition.y - CARD_HALF_H
      return mouseOffset + entranceOffset + scatterY + (targetY - scatterY) * c
    }
  )

  const rotateX = useTransform(
    [rawRotateX, convergence],
    ([rx, conv]) => (rx as number) * (1 - Math.min(conv as number, 1))
  )
  const rotateY = useTransform(
    [rawRotateY, convergence],
    ([ry, conv]) => (ry as number) * (1 - Math.min(conv as number, 1))
  )

  const rotate = useTransform(
    [convergence, entranceProgress],
    ([conv, ent]) => {
      const c = Math.min(conv as number, 1)
      const entranceRotation = position.rotate - 15 * (1 - (ent as number))
      return entranceRotation + (finalPosition.rotate - entranceRotation) * c
    }
  )

  const scale = useTransform(
    [convergence, entranceProgress],
    ([conv, ent]) => {
      const c = Math.min(conv as number, 1)
      const entranceScale = position.scale * 0.9 + position.scale * 0.1 * (ent as number)
      return entranceScale + (finalPosition.scale - entranceScale) * c
    }
  )

  const opacity = useTransform(
    [scrollYProgress, entranceProgress],
    ([scroll, ent]) => {
      const scrollFade =
        (scroll as number) > 0.7
          ? 1 - (((scroll as number) - 0.7) / 0.2) * 0.4
          : 1
      return scrollFade * (ent as number)
    }
  )

  return (
    <motion.div
      className="absolute"
      style={{
        left: "50%",
        top: "50%",
        x,
        y,
        rotateX,
        rotateY,
        rotate,
        scale,
        transformStyle: "preserve-3d",
        zIndex: position.depth,
        opacity,
      }}
    >
      <div
        className="relative overflow-hidden rounded-xl shadow-2xl"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          transform: `translateZ(${position.depth}px)`,
        }}
      >
        <Image
          src={card.imageUrl}
          alt={card.name}
          width={220}
          height={308}
          className="block"
          priority={index < 4}
        />
        {effect === "prismatic" && <PrismaticOverlay />}
        {effect === "stardust" && <StardustCanvas width={220} height={308} />}
      </div>
    </motion.div>
  )
}
