"use client"

import { ArrowLeft, Trophy } from "lucide-react"
import Link from "next/link"
import { TrophyCase, TrophyProvider } from "@/components/trophies/trophy-case"

export function TrophiesPageClient() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/account"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/50 bg-slate-900/60 text-slate-400 transition-colors hover:text-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400">
              <Trophy className="h-5 w-5 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Trophy Case</h1>
              <p className="text-sm text-slate-400">
                Collect trophies by using Proxidex
              </p>
            </div>
          </div>
        </div>

        <TrophyProvider>
          <TrophyCase />
        </TrophyProvider>
      </div>
    </div>
  )
}
