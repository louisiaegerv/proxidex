/**
 * Subscription utilities for checking user tier
 * 
 * Supports:
 * - Free tier (Trainer)
 * - Annual Season Pass (Gym Leader) - $19/yr
 * - Lifetime Champion - $49 one-time
 * - Founding Trainer tiers (α, β, γ) - Limited launch pricing
 */

import { getClient } from "@/lib/db"
import { SubscriptionType, isProTier, getTierDisplayName, getFoundingDisplayName } from "./pricing"

export type { SubscriptionType }
export { isProTier, getTierDisplayName }

export interface SubscriptionInfo {
  tier: SubscriptionType
  status: string
  isPro: boolean
  displayName: string
  foundingNumber?: number | null
  expiresAt?: Date | null
}

/**
 * Check if a user has Pro subscription
 * Returns subscription info including tier and isPro flag
 */
export async function checkSubscription(userId: string): Promise<SubscriptionInfo> {
  try {
    const db = getClient()
    
    const result = await db.execute({
      sql: `
        SELECT tier, status, expires_at, founding_number
        FROM subscriptions
        WHERE user_id = ?
      `,
      args: [userId]
    })
    
    if (result.rows.length === 0) {
      // No subscription found - free tier
      return {
        tier: "free",
        status: "active",
        isPro: false,
        displayName: getTierDisplayName("free"),
        foundingNumber: null
      }
    }
    
    const row = result.rows[0]
    const tier = String(row.tier).toLowerCase() as SubscriptionType
    const status = String(row.status)
    const expiresAt = row.expires_at ? new Date(String(row.expires_at)) : null
    const foundingNumber = row.founding_number ? Number(row.founding_number) : null
    
    // Check if subscription is active
    let isActive = status === "active"
    
    // For annual subscriptions, check expiration
    if (tier === "annual" && expiresAt) {
      isActive = isActive && expiresAt > new Date()
    }
    
    // Lifetime and founding tiers never expire
    const isPro = isProTier(tier) && isActive
    
    return {
      tier,
      status: isActive ? "active" : "expired",
      isPro,
      displayName: getFoundingDisplayName(tier, foundingNumber ?? undefined),
      foundingNumber,
      expiresAt: tier === "annual" ? expiresAt : null
    }
  } catch (error) {
    console.error("Failed to check subscription:", error)
    // Default to free on error (fail safe)
    return {
      tier: "free",
      status: "error",
      isPro: false,
      displayName: getTierDisplayName("free"),
      foundingNumber: null
    }
  }
}

/**
 * Check if user has Pro access
 * Convenience function that returns boolean only
 */
export async function isProUser(userId: string): Promise<boolean> {
  const subscription = await checkSubscription(userId)
  return subscription.isPro
}

/**
 * Get user's tier for display purposes
 */
export async function getUserTier(userId: string): Promise<SubscriptionType> {
  const subscription = await checkSubscription(userId)
  return subscription.tier
}
