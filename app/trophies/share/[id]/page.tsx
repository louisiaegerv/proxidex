import Image from "next/image"
import Link from "next/link"
import { Trophy, ArrowRight } from "lucide-react"
import { getTrophyById, ALL_TROPHIES, RARITY_CONFIG } from "@/lib/trophies"

interface Props {
  params: Promise<{ id: string }>
}

export function generateStaticParams() {
  return ALL_TROPHIES.map((t) => ({ id: t.id }))
}

export default async function TrophySharePage({ params }: Props) {
  const { id } = await params
  const trophy = getTrophyById(id)

  if (!trophy) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100">
            Trophy not found
          </h1>
          <Link
            href="/trophies"
            className="mt-4 inline-flex items-center gap-2 text-amber-400 hover:text-amber-300"
          >
            View Trophy Case <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  const config = RARITY_CONFIG[trophy.rarity]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-yellow-400">
            <Trophy className="h-4 w-4 text-black" />
          </div>
          <span className="text-sm font-bold text-slate-300">Proxidex</span>
        </div>

        {/* Trophy Card */}
        <div className="relative overflow-hidden rounded-2xl border-2 bg-slate-900/80 p-6">
          {/* Background glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(ellipse at center top, ${config.glowColor} 0%, transparent 60%)`,
            }}
          />

          <div className="relative">
            {/* Trophy Image */}
            <div className="relative mx-auto aspect-[63/88] w-56 overflow-hidden rounded-xl">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background: `radial-gradient(ellipse at center, ${config.glowColor} 0%, transparent 70%)`,
                }}
              />
              <Image
                src={trophy.image}
                alt={trophy.name}
                fill
                className="object-contain"
                sizes="224px"
                priority
              />

              {/* Rarity badge */}
              <div
                className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                style={{
                  background: `${config.color}30`,
                  color: config.color,
                  border: `1px solid ${config.color}50`,
                }}
              >
                {config.label}
              </div>
            </div>

            {/* Info */}
            <div className="mt-5 text-center">
              <h1 className="text-xl font-bold text-slate-100">
                {trophy.name}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                {trophy.description}
              </p>
            </div>

            {/* CTA */}
            <Link
              href="/trophies"
              className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90"
            >
              View in Trophy Case
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Collect trophies by using Proxidex
        </p>
      </div>
    </div>
  )
}
