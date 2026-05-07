"use client"

import { TrophyCase, TrophyProvider } from "@/components/trophies/trophy-case"

export function TrophiesPageClient() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl">
        <TrophyProvider>
          <TrophyCase />
        </TrophyProvider>
      </div>
    </div>
  )
}
