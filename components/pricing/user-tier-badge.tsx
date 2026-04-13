"use client"

import { Trophy, Crown, Zap, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SubscriptionType } from "@/lib/pricing"

interface UserTierBadgeProps {
  tier: SubscriptionType
  foundingNumber?: number | null
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function UserTierBadge({ 
  tier, 
  foundingNumber,
  showLabel = true,
  size = "md",
  className 
}: UserTierBadgeProps) {
  // Free tier - don't show anything special
  if (tier === "free") {
    return null
  }

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1"
  }

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  }

  // Founding Trainer tiers
  if (tier.startsWith("founding_")) {
    const greekLetter = tier === "founding_alpha" ? "α" : 
                        tier === "founding_beta" ? "β" : "γ"
    
    return (
      <Badge 
        className={cn(
          "bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold border-0",
          sizeClasses[size],
          className
        )}
      >
        <Trophy className={cn("mr-1", iconSizes[size])} />
        {showLabel && (
          <span>Founding Trainer {greekLetter}</span>
        )}
        {foundingNumber && (
          <span className="ml-1 opacity-80">#{foundingNumber}</span>
        )}
      </Badge>
    )
  }

  // Annual - Gym Leader
  if (tier === "annual") {
    return (
      <Badge 
        className={cn(
          "bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold border-0",
          sizeClasses[size],
          className
        )}
      >
        <Zap className={cn("mr-1", iconSizes[size])} />
        {showLabel && "Gym Leader"}
      </Badge>
    )
  }

  // Lifetime - Champion
  if (tier === "lifetime") {
    return (
      <Badge 
        className={cn(
          "bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold border-0",
          sizeClasses[size],
          className
        )}
      >
        <Crown className={cn("mr-1", iconSizes[size])} />
        {showLabel && "Champion"}
      </Badge>
    )
  }

  return null
}

// Particle component for the founding member card
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-amber-400/60 rounded-full animate-float"
          style={{
            left: `${10 + (i * 7)}%`,
            bottom: '0%',
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${3 + (i % 3)}s`,
          }}
        />
      ))}
      {/* Larger glowing orbs */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`orb-${i}`}
          className="absolute rounded-full animate-float-slow blur-sm"
          style={{
            width: `${8 + (i * 4)}px`,
            height: `${8 + (i * 4)}px`,
            left: `${15 + (i * 12)}%`,
            bottom: '10%',
            background: `radial-gradient(circle, rgba(251,191,36,${0.4 + (i * 0.1)}) 0%, transparent 70%)`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${4 + (i % 2)}s`,
          }}
        />
      ))}
    </div>
  )
}

// VIP Card for account page or profile
interface VIPStatusCardProps {
  tier: SubscriptionType
  foundingNumber?: number | null
  email?: string
}

export function VIPStatusCard({ tier, foundingNumber, email }: VIPStatusCardProps) {
  if (tier === "free") {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <div className="font-medium text-slate-200">Free Tier</div>
            <div className="text-sm text-slate-400">Upgrade for unlimited access</div>
          </div>
        </div>
      </div>
    )
  }

  const isFounding = tier.startsWith("founding_")
  const isLifetime = tier === "lifetime"
  const isAnnual = tier === "annual"
  
  const greekLetter = tier === "founding_alpha" ? "α" : 
                      tier === "founding_beta" ? "β" : 
                      tier === "founding_gamma" ? "γ" : null

  // Color schemes for different tiers
  const colors = isFounding 
    ? {
        border: "border-amber-500/40",
        bg: "from-amber-500/20 via-amber-600/10 to-yellow-500/20",
        glow: "shadow-amber-500/30",
        iconBg: "from-amber-400 to-yellow-500",
        text: "text-amber-200",
        accent: "text-amber-400",
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/50",
      }
    : isLifetime
    ? {
        border: "border-purple-500/40",
        bg: "from-purple-500/20 via-purple-600/10 to-pink-500/20",
        glow: "shadow-purple-500/30",
        iconBg: "from-purple-400 to-pink-500",
        text: "text-purple-200",
        accent: "text-purple-400",
        badge: "bg-purple-500/20 text-purple-300 border-purple-500/50",
      }
    : {
        border: "border-blue-500/40",
        bg: "from-blue-500/20 via-blue-600/10 to-cyan-500/20",
        glow: "shadow-blue-500/30",
        iconBg: "from-blue-400 to-cyan-500",
        text: "text-blue-200",
        accent: "text-blue-400",
        badge: "bg-blue-500/20 text-blue-300 border-blue-500/50",
      }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border backdrop-blur-xl",
      "bg-gradient-to-br",
      colors.bg,
      colors.border,
      "shadow-2xl",
      colors.glow,
      "p-6 md:p-8"
    )}>
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
      
      {/* Animated gradient border glow */}
      <div className={cn(
        "absolute -inset-px rounded-xl opacity-50 blur-sm animate-pulse",
        isFounding ? "bg-gradient-to-r from-amber-500/50 via-yellow-500/50 to-amber-500/50" :
        isLifetime ? "bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-purple-500/50" :
        "bg-gradient-to-r from-blue-500/50 via-cyan-500/50 to-blue-500/50"
      )} />
      
      {/* Particles for founding members */}
      {isFounding && <Particles />}
      
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-700" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start gap-4 md:gap-6">
          {/* Avatar/Badge with glow */}
          <div className={cn(
            "relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-3xl md:text-4xl font-bold shrink-0",
            "bg-gradient-to-br",
            colors.iconBg,
            "shadow-2xl",
            colors.glow,
            "ring-4 ring-white/10"
          )}>
            {/* Inner glow */}
            <div className={cn(
              "absolute inset-0 rounded-full blur-md opacity-60",
              isFounding ? "bg-amber-400" : isLifetime ? "bg-purple-400" : "bg-blue-400"
            )} />
            
            {/* Icon */}
            <div className="relative z-10 text-white drop-shadow-lg">
              {isFounding ? (
                <Trophy className="w-10 h-10 md:w-12 md:h-12" />
              ) : isLifetime ? (
                <Crown className="w-10 h-10 md:w-12 md:h-12" />
              ) : (
                <Zap className="w-10 h-10 md:w-12 md:h-12" />
              )}
            </div>

            {/* Orbiting sparkles for founding */}
            {isFounding && (
              <>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full animate-ping" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-amber-300 rounded-full animate-pulse" />
              </>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Founding Number - Big and Bold */}
            {isFounding && foundingNumber && (
              <div className={cn(
                "text-5xl md:text-6xl font-black mb-2 tracking-tighter",
                "bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent",
                "drop-shadow-lg"
              )}>
                #{foundingNumber}
              </div>
            )}
            
            <h3 className={cn(
              "text-2xl md:text-3xl font-bold",
              colors.text
            )}>
              {isFounding ? (
                <>Founding Trainer <span className="text-3xl">{greekLetter}</span></>
              ) : isLifetime ? (
                "Champion"
              ) : (
                "Gym Leader"
              )}
            </h3>
            
            <p className={cn(
              "mt-2 text-sm md:text-base",
              colors.accent
            )}>
              {isFounding 
                ? `One of the first ${tier === "founding_alpha" ? "100" : tier === "founding_beta" ? "250" : "500"} supporters`
                : isLifetime 
                ? "Lifetime access - unlimited forever"
                : "Annual Season Pass - unlimited for the season"
              }
            </p>

            {email && (
              <p className="text-sm text-slate-400 mt-2">{email}</p>
            )}

            {/* Perks */}
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-white/5 border-white/20 text-slate-200 backdrop-blur-sm">
                Unlimited Exports
              </Badge>
              <Badge variant="outline" className="bg-white/5 border-white/20 text-slate-200 backdrop-blur-sm">
                Turbo Speed
              </Badge>
              <Badge variant="outline" className="bg-white/5 border-white/20 text-slate-200 backdrop-blur-sm">
                Cloud Sync
              </Badge>
              {isFounding && (
                <Badge className={cn("backdrop-blur-sm", colors.badge)}>
                  <Sparkles className="w-3 h-3 mr-1" />
                  VIP Founder
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Special message for founding members */}
        {isFounding && (
          <div className="mt-6 pt-5 border-t border-amber-500/20">
            <p className={cn(
              "text-sm md:text-base italic text-center",
              "text-amber-200/90"
            )}>
              &ldquo;Thank you for being one of our earliest supporters. Your founding number 
              <span className="font-bold text-amber-300"> #{foundingNumber}</span> is yours forever.&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Corner decorations for founding */}
      {isFounding && (
        <>
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl" />
        </>
      )}
    </div>
  )
}
