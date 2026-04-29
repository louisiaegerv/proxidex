"use client"

import {
  motion,
  useSpring,
  useMotionValue,
  useScroll,
} from "framer-motion"
import { useRef, useEffect, useState } from "react"
import type { HeroCard } from "@/lib/hero-cards"
import { cn } from "@/lib/utils"
import { HexagonBackground } from "@/components/animate-ui/components/backgrounds/hexagon"
import { ConvergingCard } from "./hero-parallax/converging-card"
import { MarketingPanels } from "./hero-parallax/marketing-panels"
import { HeroContent } from "./hero-parallax/hero-content"
import { MobileCards } from "./hero-parallax/mobile-cards"
import { ConvergedCta } from "./hero-parallax/converged-cta"
import { shuffleArray } from "./hero-parallax/utils"
import {
  LEFT_POSITIONS,
  RIGHT_POSITIONS,
  STACKED_POSITIONS,
} from "./hero-parallax/constants"
import "./HeroParallax.css"

interface HeroParallaxProps {
  cards: HeroCard[]
}

export function HeroParallax({ cards }: HeroParallaxProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const { scrollYProgress } = useScroll({
    target: scrollContainerRef,
    offset: ["start start", "end start"],
  })

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  const [selectedCards, setSelectedCards] = useState<HeroCard[]>(() =>
    cards.slice(0, 8)
  )
  const [effectMap, setEffectMap] = useState<
    Record<number, "prismatic" | "stardust" | null>
  >(() => ({
    0: null,
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
    7: null,
  }))
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setSelectedCards(shuffleArray(cards).slice(0, 8))
    const left = shuffleArray([0, 1, 2, 3])
    const right = shuffleArray([4, 5, 6, 7])
    setEffectMap({
      [left[0]]: "prismatic",
      [left[1]]: "stardust",
      [left[2]]: null,
      [left[3]]: null,
      [right[0]]: "prismatic",
      [right[1]]: "stardust",
      [right[2]]: null,
      [right[3]]: null,
    })
    setIsReady(true)
  }, [cards])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    mouseX.set((e.clientX - centerX) / (rect.width / 2))
    mouseY.set((e.clientY - centerY) / (rect.height / 2))
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  const leftCards = selectedCards.slice(0, 4)
  const rightCards = selectedCards.slice(4, 8)

  return (
    <div ref={scrollContainerRef} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative flex h-full items-center justify-center"
          style={{ perspective: "1000px" }}
        >
          <HexagonBackground className="absolute inset-0 flex items-center justify-center rounded-xl" />
          <style>{`
            @keyframes prismatic-sweep {
              0% { background-position: 0 0; }
              100% { background-position: 200% 200%; }
            }
            @keyframes prismatic-sheen {
              0% { background-position: 0 0; }
              100% { background-position: 100% 100%; }
            }
          `}</style>

          {/* Background accents */}
          <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-lg bg-primary/5 blur-3xl" />
          <div
            className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-lg bg-primary/5 blur-3xl"
            style={{ animationDelay: "1s" }}
          />

          <MarketingPanels scrollYProgress={scrollYProgress} />

          {/* All Cards in one shared coordinate system */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 hidden transition-opacity duration-500 lg:block",
              isReady ? "opacity-100" : "opacity-0"
            )}
            style={{ transformStyle: "preserve-3d" }}
          >
            {leftCards.map((card, i) => (
              <ConvergingCard
                key={`left-${i}-${card.id}`}
                card={card}
                position={LEFT_POSITIONS[i]}
                mouseX={smoothX}
                mouseY={smoothY}
                index={i}
                effect={effectMap[i]}
                scrollYProgress={scrollYProgress}
                finalPosition={STACKED_POSITIONS[i]}
              />
            ))}
            {rightCards.map((card, i) => (
              <ConvergingCard
                key={`right-${i}-${card.id}`}
                card={card}
                position={RIGHT_POSITIONS[i]}
                mouseX={smoothX}
                mouseY={smoothY}
                index={i + 4}
                effect={effectMap[i + 4]}
                scrollYProgress={scrollYProgress}
                finalPosition={STACKED_POSITIONS[i + 4]}
              />
            ))}
          </div>

          <HeroContent scrollYProgress={scrollYProgress} />
          <MobileCards cards={selectedCards} />
          <ConvergedCta scrollYProgress={scrollYProgress} />
        </div>
      </div>
    </div>
  )
}
