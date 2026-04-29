"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { RainbowButton } from "@/components/ui/rainbow-button"

interface ConvergedCtaProps {
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"]
}

export function ConvergedCta({ scrollYProgress }: ConvergedCtaProps) {
  const opacity = useTransform(
    scrollYProgress,
    [0.5, 0.7, 0.9],
    [0, 1, 0]
  )
  const scale = useTransform(scrollYProgress, [0.5, 0.7], [0.8, 1])

  return (
    <motion.div
      className="absolute z-20 px-4 text-center"
      style={{ opacity, scale }}
    >
      <h2 className="mb-4 text-3xl font-bold md:text-4xl">
        Ready to <span className="text-primary">Print?</span>
      </h2>
      <p className="mx-auto mb-6 max-w-md text-muted-foreground">
        Join thousands of players who&apos;ve already ditched the manual
        work.
      </p>
      <a href="https://app.proxidex.com">
        <RainbowButton size="lg" className="text-white dark:text-black">
          Start Printing Now
        </RainbowButton>
      </a>
    </motion.div>
  )
}
