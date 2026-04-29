"use client"

import Image from "next/image"
import type { HeroCard } from "@/lib/hero-cards"

interface MobileCardsProps {
  cards: HeroCard[]
}

const CORNERS = [
  { top: "5%", left: "4%", rotate: -15 },
  { bottom: "5%", left: "4%", rotate: 12 },
  { top: "5%", right: "4%", rotate: 15 },
  { bottom: "5%", right: "4%", rotate: -12 },
]

export function MobileCards({ cards }: MobileCardsProps) {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-60 lg:hidden">
      {cards.slice(0, 4).map((card, i) => {
        const pos = CORNERS[i]
        const { rotate, ...style } = pos as {
          rotate: number
          top?: string
          left?: string
          right?: string
          bottom?: string
        }
        return (
          <div
            key={`mobile-${card.id}`}
            className="absolute"
            style={{
              ...style,
              transform: `rotate(${rotate}deg)`,
            }}
          >
            <Image
              src={card.imageUrl}
              alt={card.name}
              width={110}
              height={154}
              className="rounded-lg shadow-xl"
            />
          </div>
        )
      })}
    </div>
  )
}
