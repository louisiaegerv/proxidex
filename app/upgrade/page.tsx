"use client"

import { useState, useEffect } from "react"
import { Check, Crown, Trophy, Zap, Sparkles, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { PRICING, FOUNDING_TRAINER_TIERS } from "@/lib/pricing"
import { cn } from "@/lib/utils"

const freeFeatures = [
  "2 deck slots",
  "2 daily exports + 5 welcome bonus exports",
  "Standard export speed",
  "3 bonus Turbo exports",
  "Session-only storage",
]

const proFeatures = [
  "Unlimited decks",
  "Unlimited exports",
  "Turbo speed always on",
  "Persistent storage + cloud sync",
  "Priority support",
  "All future updates",
]

// Particle component for founding tier cards
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-amber-400/60 rounded-full animate-float"
          style={{
            left: `${15 + (i * 10)}%`,
            bottom: '0%',
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${3 + (i % 3)}s`,
          }}
        />
      ))}
      {[...Array(4)].map((_, i) => (
        <div
          key={`orb-${i}`}
          className="absolute rounded-full animate-float-slow blur-sm"
          style={{
            width: `${6 + (i * 3)}px`,
            height: `${6 + (i * 3)}px`,
            left: `${20 + (i * 15)}%`,
            bottom: '10%',
            background: `radial-gradient(circle, rgba(251,191,36,${0.3 + (i * 0.1)}) 0%, transparent 70%)`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${4 + (i % 2)}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function UpgradePage() {
  const [foundingStats, setFoundingStats] = useState({
    alpha: { sold: 0, limit: 100 },
    beta: { sold: 0, limit: 150 },
    gamma: { sold: 0, limit: 250 },
  })

  useEffect(() => {
    fetch("/api/pricing/founding-stats")
      .then(res => res.json())
      .then(setFoundingStats)
      .catch(console.error)
  }, [])

  const totalSold = foundingStats.alpha.sold + foundingStats.beta.sold + foundingStats.gamma.sold
  const totalRemaining = 500 - totalSold

  const getTierStatus = (tierName: string) => {
    if (tierName.includes("α") || tierName.includes("Alpha")) {
      if (foundingStats.alpha.sold >= 100) return "sold-out"
      return foundingStats.alpha.sold > 0 ? "active" : "locked"
    }
    if (tierName.includes("β") || tierName.includes("Beta")) {
      if (foundingStats.beta.sold >= 150) return "sold-out"
      if (foundingStats.alpha.sold >= 100) return "active"
      return "locked"
    }
    if (tierName.includes("γ") || tierName.includes("Gamma")) {
      if (foundingStats.gamma.sold >= 250) return "sold-out"
      if (foundingStats.beta.sold >= 150) return "active"
      return "locked"
    }
    return "locked"
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Link 
            href="/"
            className="absolute left-0 top-0 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Back
          </Link>
          
          <Badge 
            variant="secondary" 
            className="mb-4 px-4 py-1.5 text-sm bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Limited Launch Pricing
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-slate-100">
            Choose Your <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-400 via-yellow-500 to-amber-400">
              Trainer Tier
            </span>
          </h1>
          <p className="mt-2 text-slate-400 max-w-xl mx-auto">
            Join the first 500 founding trainers and secure <strong className="text-slate-200">lifetime Champion access</strong> at exclusive launch prices. 
            Your founding number will be displayed forever.
          </p>
        </div>

        {/* Overall Scarcity - Glassmorphism */}
        <Card className="mb-8 border-amber-500/30 bg-slate-900/60 backdrop-blur-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-amber-500" />
                <div>
                  <div className="font-semibold text-slate-100">Founding Trainer Spots</div>
                  <div className="text-sm text-slate-400">Only 500 will ever exist</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-amber-400">{totalRemaining}</div>
                <div className="text-sm text-slate-400">remaining</div>
              </div>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${(totalSold / 500) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Founding Tiers - With Glassmorphism & Particles */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {FOUNDING_TRAINER_TIERS.map((tier, index) => {
            const stats = tier.name.includes("α") ? foundingStats.alpha :
                         tier.name.includes("β") ? foundingStats.beta : foundingStats.gamma
            const sold = stats.sold
            const remaining = stats.limit - sold
            const status = getTierStatus(tier.name)
            const isActive = status === "active"
            const isSoldOut = status === "sold-out"

            return (
              <div key={tier.name} className="relative pt-3">
                {/* Status Badge - Outside the card so it's not cut off */}
                <div className={cn("absolute left-1/2 -translate-x-1/2 z-20",
                  isActive ? "-top-2.5" : "top-0"
                )}>
                  {isActive && (
                    <Badge className="bg-amber-500 text-black font-bold px-3 py-1">
                      <Clock className="w-3 h-3 mr-1" />
                      Currently Open
                    </Badge>
                  )}
                  {isSoldOut && (
                    <Badge variant="secondary" className="bg-slate-800">Sold Out</Badge>
                  )}
                  {!isActive && !isSoldOut && (
                    <Badge variant="outline" className="border-slate-600 text-slate-400">Locked</Badge>
                  )}
                </div>

                <Card 
                  className={cn(
                    "relative overflow-hidden transition-all duration-300",
                    isActive && "border-amber-500/50 ring-2 ring-amber-500/30 scale-105 z-10",
                    isSoldOut && "opacity-50 grayscale",
                    !isActive && !isSoldOut && "opacity-70 grayscale",
                    "bg-slate-900/60 backdrop-blur-xl border-slate-700/50"
                  )}
                >
                  {/* Particles container with overflow-hidden */}
                  {isActive && (
                    <div className="absolute inset-0 overflow-hidden">
                      <Particles />
                    </div>
                  )}
                  
                  {/* Glow effect for active */}
                  {isActive && (
                    <div className="absolute -inset-px bg-linear-to-r from-amber-500/30 via-yellow-500/30 to-amber-500/30 rounded-lg blur-sm animate-pulse" />
                  )}

                  <CardHeader className="text-center pt-8 relative z-10">
                  <div className="text-4xl mb-2">{tier.badge}</div>
                  <h2 className="text-xl font-semibold text-slate-100">{tier.name}</h2>
                  <CardDescription className="text-slate-400">{tier.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 relative z-10">
                  {/* Price */}
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold text-slate-100">${tier.price}</span>
                      <span className="text-slate-500 line-through">${PRICING.lifetime.price}</span>
                    </div>
                    <div className="text-sm text-green-400">
                      Save ${PRICING.lifetime.price - tier.price}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{sold} claimed</span>
                      <span className={cn(remaining < 20 && "text-red-400 font-medium")}>
                        {remaining} left
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          isActive ? "bg-linear-to-r from-amber-500 to-yellow-400" : "bg-slate-600"
                        )}
                        style={{ width: `${(sold / stats.limit) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-700/50 text-sm text-amber-400">
                    <Crown className="h-4 w-4" />
                    <span>Includes all Champion features</span>
                  </div>

                  {/* CTA */}
                  <Button 
                    className={cn(
                      "w-full font-bold relative z-20",
                      isActive 
                        ? "bg-linear-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300"
                        : ""
                    )}
                    disabled={!isActive}
                    size="lg"
                  >
                    {isActive ? "Claim Your Spot" : isSoldOut ? "Sold Out" : "Locked"}
                  </Button>
                </CardContent>
              </Card>
            </div>
            )
          })}
        </div>

        {/* Regular Pricing - Glassmorphism */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
          {/* Annual */}
          <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-700/50">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-slate-100">Gym Leader</h2>
              </div>
              <p className="text-sm text-slate-400">Season Pass</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-100">${PRICING.annual.price}</span>
                <span className="text-slate-500">/year</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">~$1.58/month</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {proFeatures.slice(0, 4).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-blue-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-800">
                Choose Annual
              </Button>
            </CardContent>
          </Card>

          {/* Lifetime */}
          <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-700/50">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-amber-400" />
                <h2 className="text-xl font-semibold text-slate-100">Champion</h2>
              </div>
              <p className="text-sm text-slate-400">Lifetime</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-100">${PRICING.lifetime.price}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Pay once, own forever</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-amber-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-800">
                Choose Lifetime
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Free Comparison */}
        <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-700/30 max-w-md mx-auto">
          <CardHeader className="text-center">
            <h2 className="text-lg font-semibold text-slate-100">Free</h2>
            <div className="text-3xl font-bold text-slate-100">$0</div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-slate-400">
                  <Check className="h-4 w-4 text-slate-600" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/">
              <Button variant="ghost" className="w-full text-slate-400 hover:text-slate-200">
                Continue with Free
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h3 className="text-center text-lg font-semibold text-slate-100 mb-6">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-900/60 backdrop-blur-xl border border-slate-700/30 p-4">
              <h4 className="font-medium text-slate-100">What&apos;s a Founding Trainer?</h4>
              <p className="mt-1 text-sm text-slate-400">
                The first 500 users to support Proxidex get <strong className="text-slate-200">lifetime Champion access</strong> at exclusive prices. 
                Your founding number (e.g., #29) is displayed forever on your profile.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 backdrop-blur-xl border border-slate-700/30 p-4">
              <h4 className="font-medium text-slate-100">What do Founding Trainers get?</h4>
              <p className="mt-1 text-sm text-slate-400">
                Founding Trainers receive <strong className="text-slate-200">all Champion tier benefits</strong>: unlimited decks, 
                unlimited exports, turbo speed, persistent cloud storage, priority support, and all future updates. 
                Plus a special Founding Trainer badge with your unique number!
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 backdrop-blur-xl border border-slate-700/30 p-4">
              <h4 className="font-medium text-slate-100">What happens when founding tiers sell out?</h4>
              <p className="mt-1 text-sm text-slate-400">
                Each tier unlocks when the previous sells out. Once all 500 spots are gone, 
                only Annual ($19/yr) and Lifetime ($49) options remain.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 backdrop-blur-xl border border-slate-700/30 p-4">
              <h4 className="font-medium text-slate-100">Can I upgrade later?</h4>
              <p className="mt-1 text-sm text-slate-400">
                Yes! You can upgrade from Free to any tier at any time. Founding spots are 
                limited, so "catch 'em" while you still can!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
