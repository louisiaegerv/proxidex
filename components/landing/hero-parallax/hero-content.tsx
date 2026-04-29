"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { RainbowButton } from "@/components/ui/rainbow-button"

interface HeroContentProps {
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"]
}

export function HeroContent({ scrollYProgress }: HeroContentProps) {
  const contentOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const contentY = useTransform(scrollYProgress, [0, 0.3], [0, -50])

  return (
    <motion.div
      className="relative z-20 mx-auto max-w-3xl px-4 text-center"
      style={{ opacity: contentOpacity, y: contentY }}
    >
      {/* Main Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="mb-6 text-4xl leading-tight font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-6xl [paint-order:stroke_fill]"
      >
        <span className="text-primary-foreground capitalize">
          <span className="text-shadow-[2px_2px_0px_rgb(0_0_0_/.5)] [paint-order:stroke_fill] [-webkit-text-stroke:2px_black]">
            Your next favorite deck is
          </span>{" "}
          <br />
          <div className="glitter-container">
            <div className="glitter-text text-shadow-[2px_2px_0px_rgb(255_255_255_/.25)]">
              one print away.
            </div>
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} className="sparkle dark:block">
                ✦
              </div>
            ))}
          </div>
        </span>
      </motion.h1>

      {/* Subheadline - The Value Prop */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 2.0 }}
        className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl md:text-2xl [paint-order:stroke_fill] [-webkit-text-stroke:1px_white] text-shadow-[1px_1px_0px_white] dark:[-webkit-text-stroke:2px_black] dark:text-shadow-[1px_1px_0px_black]"
      >
        Stop watching from the sidelines. Import a deck from the current
        meta with one click and be shuffling up in minutes.
      </motion.p>

      {/* Primary CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 4.0 }}
        className="mb-6"
      >
        <a
          href="https://app.proxidex.com"
          className="inline-flex items-center font-bold transition-all hover:scale-105"
        >
          <RainbowButton
            className="text-base text-white sm:text-lg dark:text-black"
            size="lg"
          >
            Print Your Unbeatable Deck
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </RainbowButton>
        </a>
      </motion.div>

      {/* Trust Indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 5.0 }}
        className="flex flex-col items-center justify-center gap-4 text-xs font-bold capitalize sm:gap-6 sm:text-sm md:tracking-wide"
      >
        {[
          "One-click LimitlessTCG import",
          "Bleed Edge Extension",
          "450+ DPI quality",
          "Free forever",
        ].map((text) => (
          <span key={text} className="flex items-center gap-1">
            <svg
              className="h-3 w-3 text-green-500 sm:h-4 sm:w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {text}
          </span>
        ))}
      </motion.div>
    </motion.div>
  )
}
