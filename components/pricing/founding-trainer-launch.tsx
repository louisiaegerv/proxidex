"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crown, Zap, Trophy, Sparkles, Users, Clock, Check } from "lucide-react"
import { FOUNDING_TRAINER_TIERS, PRICING, getCurrentFoundingTier } from "@/lib/pricing"
import { cn } from "@/lib/utils"

interface FoundingStats {
  alpha: { sold: number; limit: number }
  beta: { sold: number; limit: number }
  gamma: { sold: number; limit: number }
}

export function FoundingTrainerLaunch() {
  const [stats, setStats] = useState<FoundingStats>({
    alpha: { sold: 0, limit: 100 },
    beta: { sold: 0, limit: 150 },
    gamma: { sold: 0, limit: 250 }
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch founding tier stats from API
    fetch("/api/pricing/founding-stats")
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  const currentTier = getCurrentFoundingTier()
  const totalFoundingSpots = 500
  const totalSold = stats.alpha.sold + stats.beta.sold + stats.gamma.sold
  const totalRemaining = totalFoundingSpots - totalSold

  const getTierStatus = (tierName: string) => {
    if (tierName.includes("α") || tierName.includes("Alpha")) {
      if (stats.alpha.sold >= 100) return "sold-out"
      return stats.alpha.sold > 0 ? "active" : "locked"
    }
    if (tierName.includes("β") || tierName.includes("Beta")) {
      if (stats.beta.sold >= 150) return "sold-out"
      if (stats.alpha.sold >= 100) return "active"
      return "locked"
    }
    if (tierName.includes("γ") || tierName.includes("Gamma")) {
      if (stats.gamma.sold >= 250) return "sold-out"
      if (stats.beta.sold >= 150) return "active"
      return "locked"
    }
    return "locked"
  }

  const getProgressPercent = (sold: number, limit: number) => {
    return Math.min(100, (sold / limit) * 100)
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge 
          variant="secondary" 
          className="mb-4 px-4 py-1.5 text-sm bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          Limited Launch Offer
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Become a <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400">
            Founding Trainer
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Join the first 500 trainers and secure lifetime access at founding prices. 
          Your founding number will be displayed forever.
        </p>
      </div>

      {/* Overall Scarcity */}
      <Card className="mb-8 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-amber-500" />
              <div>
                <div className="font-semibold">Total Founding Spots</div>
                <div className="text-sm text-muted-foreground">Only 500 will ever exist</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{totalRemaining}</div>
              <div className="text-sm text-muted-foreground">remaining</div>
            </div>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
              style={{ width: `${getProgressPercent(totalSold, totalFoundingSpots)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{totalSold} claimed</span>
            <span>{totalFoundingSpots} total</span>
          </div>
        </CardContent>
      </Card>

      {/* Founding Tiers */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {FOUNDING_TRAINER_TIERS.map((tier, index) => {
          const status = getTierStatus(tier.name)
          const isSoldOut = status === "sold-out"
          const isLocked = status === "locked"
          const isActive = status === "active"
          
          const tierStats = tier.name.includes("α") ? stats.alpha :
                           tier.name.includes("β") ? stats.beta : stats.gamma
          
          const remaining = tier.limit - tierStats.sold

          return (
            <Card 
              key={tier.name}
              className={cn(
                "relative transition-all duration-300",
                isActive && "border-amber-500 ring-2 ring-amber-500/20 scale-105 z-10",
                isSoldOut && "opacity-60 grayscale",
                isLocked && "opacity-50 grayscale"
              )}
            >
              {/* Status Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                {isActive && (
                  <Badge className="bg-amber-500 text-black font-bold px-3 py-1">
                    <Clock className="w-3 h-3 mr-1" />
                    Currently Open
                  </Badge>
                )}
                {isSoldOut && (
                  <Badge variant="secondary" className="bg-muted px-3 py-1">
                    Sold Out
                  </Badge>
                )}
                {isLocked && (
                  <Badge variant="outline" className="px-3 py-1">
                    Locked
                  </Badge>
                )}
              </div>

              <CardHeader className="text-center pt-8">
                <div className="text-4xl mb-2">{tier.badge}</div>
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription className="text-sm">{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground line-through text-lg">
                      ${PRICING.lifetime.price}
                    </span>
                  </div>
                  <div className="text-sm text-green-500 font-medium">
                    Save ${PRICING.lifetime.price - tier.price}
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{tierStats.sold} claimed</span>
                    <span className={cn(
                      "font-medium",
                      remaining < 20 && "text-red-500"
                    )}>
                      {remaining} left
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        isActive ? "bg-amber-500" : "bg-muted-foreground/30"
                      )}
                      style={{ width: `${getProgressPercent(tierStats.sold, tier.limit)}%` }}
                    />
                  </div>
                </div>

                {/* CTA Button */}
                <Button 
                  className={cn(
                    "w-full font-bold",
                    isActive 
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300"
                      : ""
                  )}
                  disabled={!isActive}
                  size="lg"
                >
                  {isActive ? "Claim Your Spot" : isSoldOut ? "Sold Out" : "Locked"}
                </Button>

                {/* Urgency for active tier */}
                {isActive && remaining < 20 && (
                  <p className="text-center text-sm text-red-500 font-medium">
                    Only {remaining} spots left!
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Regular Pricing (shown for comparison) */}
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <Crown className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <CardTitle>Season Pass</CardTitle>
            <CardDescription>Annual access</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold mb-2">${PRICING.annual.price}/yr</div>
            <p className="text-sm text-muted-foreground mb-4">
              Gym Leader tier. Unlimited exports for one season.
            </p>
            <Button variant="outline" className="w-full">
              Choose Annual
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <CardTitle>Lifetime</CardTitle>
            <CardDescription>Pay once, own forever</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold mb-2">${PRICING.lifetime.price}</div>
            <p className="text-sm text-muted-foreground mb-4">
              Champion tier. Unlimited forever + all updates.
            </p>
            <Button variant="outline" className="w-full">
              Choose Lifetime
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Benefits */}
      <div className="mt-16 max-w-2xl mx-auto">
        <h3 className="text-center text-xl font-semibold mb-6">All Pro Tiers Include</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: Trophy, text: "Cloud deck sync across devices" },
            { icon: Crown, text: "Unlimited decks" },
            { icon: Sparkles, text: "High quality exports" },
            { icon: Zap, text: "All future updates included" },
          ].map((benefit, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <benefit.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm">{benefit.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Small badge for showing current tier status in navbar/settings
export function FoundingTrainerBadge({ 
  tier, 
  foundingNumber 
}: { 
  tier: string
  foundingNumber?: number | null 
}) {
  if (!tier.startsWith('founding_') || !foundingNumber) return null

  const greekLetter = tier === 'founding_alpha' ? 'α' : 
                      tier === 'founding_beta' ? 'β' : 'γ'

  return (
    <Badge 
      variant="secondary" 
      className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold"
    >
      <Trophy className="w-3 h-3 mr-1" />
      #{foundingNumber}
    </Badge>
  )
}

// User profile display with founding number
export function UserTierDisplay({
  tier,
  foundingNumber
}: {
  tier: string
  foundingNumber?: number | null
}) {
  const displayName = foundingNumber
    ? `Founding Trainer ${tier === 'founding_alpha' ? 'α' : tier === 'founding_beta' ? 'β' : 'γ'} #${foundingNumber}`
    : tier === 'lifetime' ? 'Champion'
    : tier === 'annual' ? 'Gym Leader'
    : 'Trainer'

  const Icon = foundingNumber ? Trophy : tier === 'lifetime' ? Crown : tier === 'annual' ? Zap : Users

  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-amber-500" />
      <span className="font-medium">{displayName}</span>
      {foundingNumber && (
        <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">
          Founding Member
        </Badge>
      )}
    </div>
  )
}
