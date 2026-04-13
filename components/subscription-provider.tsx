"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useAuth } from "@clerk/nextjs"

interface SubscriptionData {
  tier: string
  status: string
  startedAt: string | null
  expiresAt: string | null
  foundingNumber: number | null
  isPro: boolean
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSubscription = async () => {
    if (!isSignedIn) {
      setSubscription(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/user/subscription")
      if (!response.ok) throw new Error("Failed to fetch subscription")
      
      const data = await response.json()
      
      setSubscription({
        tier: data.tier,
        status: data.status,
        startedAt: data.startedAt,
        expiresAt: data.expiresAt,
        foundingNumber: data.foundingNumber,
        isPro: data.tier !== "free" && data.status === "active"
      })
    } catch (err) {
      setError(err as Error)
      setSubscription(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscription()
  }, [isSignedIn])

  return (
    <SubscriptionContext.Provider value={{ 
      subscription, 
      isLoading, 
      error,
      refetch: fetchSubscription 
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider")
  }
  return context
}
