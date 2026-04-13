/**
 * Proxidex Pricing Configuration
 * 
 * Themed pricing tiers inspired by trainer journey progression
 */

// Base pricing
export const PRICING = {
  // Annual Season Pass
  annual: {
    price: 19,
    label: "Season Pass",
    description: "Unlimited proxies for the entire season",
    savings: "Save 60% vs monthly",
    themeName: "Gym Leader",
    themeColor: "#3b82f6" // Blue
  },
  
  // Lifetime - Best value
  lifetime: {
    price: 49,
    label: "Lifetime",
    description: "Never pay again. All future updates included.",
    savings: "Best value for dedicated players",
    themeName: "Champion",
    themeColor: "#f59e0b" // Gold
  }
} as const

// Launch scarcity tiers - "Founding Trainer" program
export const FOUNDING_TRAINER_TIERS = [
  {
    name: "Founding Trainer α (Alpha)",
    limit: 100,
    price: 29, // Lifetime at ~40% off
    description: "The first 100 believers. Lifetime access at a founding price.",
    badge: "🏆",
    available: true
  },
  {
    name: "Founding Trainer β (Beta)", 
    limit: 250,
    price: 35, // Lifetime at ~29% off
    description: "Early supporters get lifetime access at a special price.",
    badge: "🥈",
    available: false // Opens when α fills
  },
  {
    name: "Founding Trainer γ (Gamma)",
    limit: 500, 
    price: 39, // Lifetime at ~20% off
    description: "Join the founding community before we go to regular pricing.",
    badge: "🥉",
    available: false // Opens when β fills
  }
] as const

// Regular pricing after founding tiers
export const REGULAR_PRICING = {
  annual: 19,
  lifetime: 49
}

// Tier types for database
export type SubscriptionType = 
  | "free"
  | "annual"           // Season Pass - yearly subscription
  | "lifetime"         // Champion tier - one time
  | "founding_alpha"   // First 100
  | "founding_beta"    // Next 150 (101-250)
  | "founding_gamma"   // Next 250 (251-500)

// All tiers that get Pro benefits
export const PRO_TIERS: SubscriptionType[] = [
  "annual",
  "lifetime", 
  "founding_alpha",
  "founding_beta",
  "founding_gamma"
]

// Check if a tier is Pro-equivalent
export function isProTier(tier: string): boolean {
  return PRO_TIERS.includes(tier as SubscriptionType)
}

// Get display name for tier
export function getTierDisplayName(tier: SubscriptionType): string {
  const names: Record<SubscriptionType, string> = {
    free: "Trainer",
    annual: "Gym Leader",
    lifetime: "Champion",
    founding_alpha: "Founding Trainer α",
    founding_beta: "Founding Trainer β", 
    founding_gamma: "Founding Trainer γ"
  }
  return names[tier] || "Trainer"
}

// Get current available founding tier
export function getCurrentFoundingTier(): typeof FOUNDING_TRAINER_TIERS[number] | null {
  return FOUNDING_TRAINER_TIERS.find(t => t.available) || null
}

// Calculate founding tier stats (would come from DB in real implementation)
export interface FoundingTierStats {
  tier: string
  sold: number
  limit: number
  remaining: number
  price: number
}

// Get founding tier display with number (e.g., "Founding Trainer Alpha #29")
export function getFoundingDisplayName(tier: SubscriptionType, foundingNumber?: number | null): string {
  if (!tier.startsWith('founding_') || !foundingNumber) {
    return getTierDisplayName(tier)
  }
  
  const tierNames: Record<string, string> = {
    founding_alpha: 'Founding Trainer α',
    founding_beta: 'Founding Trainer β',
    founding_gamma: 'Founding Trainer γ'
  }
  
  const greekLetter = tier === 'founding_alpha' ? 'α' : 
                      tier === 'founding_beta' ? 'β' : 'γ'
  
  return `${tierNames[tier]} #${foundingNumber}`
}

// Get the next available founding number for a tier
export async function getNextFoundingNumber(
  db: { execute: Function },
  tier: 'founding_alpha' | 'founding_beta' | 'founding_gamma'
): Promise<number | null> {
  const result = await db.execute({
    sql: `
      SELECT COALESCE(MAX(founding_number), 0) + 1 as next_number
      FROM subscriptions
      WHERE tier = ?
    `,
    args: [tier]
  })
  
  const nextNumber = Number(result.rows[0]?.next_number || 1)
  const tierLimit = FOUNDING_TRAINER_TIERS.find(t => 
    t.name.toLowerCase().replace(/ /g, '_').includes(tier.replace('founding_', ''))
  )?.limit || 0
  
  if (nextNumber > tierLimit) {
    return null // Tier is full
  }
  
  return nextNumber
}
