"use client"

import { useEffect } from "react"
import type { TrophyDefinition } from "@/lib/trophies"

interface Props {
  trophy: TrophyDefinition | undefined
}

export default function TrophyShareRedirect({ trophy }: Props) {
  useEffect(() => {
    // Small delay so crawlers can read metadata before redirect
    const timer = setTimeout(() => {
      window.location.href = "/trophies"
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-8">
      <div className="text-center">
        {trophy ? (
          <>
            <h1 className="text-2xl font-bold text-slate-100">{trophy.name}</h1>
            <p className="mt-2 text-slate-400">{trophy.description}</p>
            <p className="mt-4 text-sm text-slate-500">
              Redirecting to Trophy Case...
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-100">
              Trophy not found
            </h1>
            <p className="mt-4 text-sm text-slate-500">
              Redirecting to Trophy Case...
            </p>
          </>
        )}
      </div>
    </div>
  )
}
