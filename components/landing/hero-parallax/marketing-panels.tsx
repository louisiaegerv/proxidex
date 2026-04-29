"use client"

import { motion, useScroll, useTransform } from "framer-motion"

interface MarketingPanelsProps {
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"]
}

export function MarketingPanels({ scrollYProgress }: MarketingPanelsProps) {
  const leftOpacity = useTransform(
    scrollYProgress,
    [0.15, 0.35, 0.6, 0.8],
    [0, 1, 1, 0]
  )
  const leftX = useTransform(scrollYProgress, [0.15, 0.35], [-100, 0])

  const rightOpacity = useTransform(
    scrollYProgress,
    [0.15, 0.35, 0.6, 0.8],
    [0, 1, 1, 0]
  )
  const rightX = useTransform(scrollYProgress, [0.15, 0.35], [100, 0])

  return (
    <>
      {/* Left Marketing Panel - appears on scroll */}
      <motion.div
        className="absolute top-1/2 left-4 z-30 max-w-[200px] -translate-y-1/2 sm:left-8 sm:max-w-xs lg:left-16 lg:max-w-sm xl:left-24"
        style={{ opacity: leftOpacity, x: leftX }}
      >
        <div className="rounded-2xl border border-border/50 bg-background/90 p-4 shadow-xl backdrop-blur-sm sm:p-6 lg:p-8">
          <div className="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 sm:h-10 sm:w-10">
              <svg
                className="h-4 w-4 text-primary sm:h-5 sm:w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold sm:text-lg">
              Stop Wasting Time
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm lg:text-base">
            Hours spent manually cropping, aligning, and formatting cards?
            Not anymore. Our one-click import gets you from decklist to
            print-ready in seconds.
          </p>
          <ul className="mt-3 hidden space-y-1 sm:block sm:space-y-2">
            <li className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="h-1 w-1 rounded-full bg-primary sm:h-1.5 sm:w-1.5" />
              <span>No more Photoshop nightmares</span>
            </li>
            <li className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="h-1 w-1 rounded-full bg-primary sm:h-1.5 sm:w-1.5" />
              <span>Skip the manual cropping</span>
            </li>
            <li className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="h-1 w-1 rounded-full bg-primary sm:h-1.5 sm:w-1.5" />
              <span>Instant bleed edge added</span>
            </li>
          </ul>
        </div>
      </motion.div>

      {/* Right Marketing Panel - appears on scroll */}
      <motion.div
        className="absolute top-1/2 right-4 z-30 max-w-[200px] -translate-y-1/2 sm:right-8 sm:max-w-xs lg:right-16 lg:max-w-sm xl:right-24"
        style={{ opacity: rightOpacity, x: rightX }}
      >
        <div className="rounded-2xl border border-border/50 bg-background/90 p-4 shadow-xl backdrop-blur-sm sm:p-6 lg:p-8">
          <div className="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 sm:h-10 sm:w-10">
              <svg
                className="h-4 w-4 text-green-500 sm:h-5 sm:w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold sm:text-lg">
              Tournament Ready
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm lg:text-base">
            Test with proxies that look and feel like the real thing.
            Perfect for practicing with the meta before investing in
            expensive cards.
          </p>
          <ul className="mt-3 hidden space-y-1 sm:block sm:space-y-2">
            <li className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="h-1 w-1 rounded-full bg-green-500 sm:h-1.5 sm:w-1.5" />
              <span>450+ DPI print quality</span>
            </li>
            <li className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="h-1 w-1 rounded-full bg-green-500 sm:h-1.5 sm:w-1.5" />
              <span>Professional card sizing</span>
            </li>
            <li className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="h-1 w-1 rounded-full bg-green-500 sm:h-1.5 sm:w-1.5" />
              <span>Test before you invest</span>
            </li>
          </ul>
        </div>
      </motion.div>
    </>
  )
}
