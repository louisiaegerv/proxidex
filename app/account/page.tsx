"use client"

import { useState, useEffect } from "react"
import { useUser, useClerk, useAuth } from "@clerk/nextjs"
import { Crown, Download, CreditCard, Mail, Calendar, Shield, User, Sparkles, Check, ArrowLeft, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { VIPStatusCard } from "@/components/pricing/user-tier-badge"
import { useSubscription } from "@/components/subscription-provider"
import type { SubscriptionType } from "@/lib/pricing"

export default function AccountPage() {
  const { user, isLoaded } = useUser()
  const { openUserProfile } = useClerk()
  const { subscription, isLoading: isSubLoading } = useSubscription()
  const [exportsToday, setExportsToday] = useState<number | null>(null)
  const [isLoadingExports, setIsLoadingExports] = useState(true)
  
  // Fetch exports separately (not in context - user-specific data)
  useEffect(() => {
    const fetchExports = async () => {
      try {
        const response = await fetch("/api/exports/remaining")
        if (response.ok) {
          const data = await response.json()
          setExportsToday(data.dailyUsed)
        }
      } catch (error) {
        console.error("Failed to fetch exports:", error)
      } finally {
        setIsLoadingExports(false)
      }
    }
    
    fetchExports()
  }, [])

  const isPro = subscription?.isPro ?? false
  const tier = (subscription?.tier as SubscriptionType) || "free"
  const isLoading = isSubLoading || isLoadingExports

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">Account</h1>
          <Link 
            href="/"
            className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to app
          </Link>
        </div>

        {/* VIP Status Card (for Pro users) */}
        {isPro && subscription && (
          <VIPStatusCard 
            tier={tier}
            foundingNumber={subscription.foundingNumber}
            email={user?.primaryEmailAddress?.emailAddress || undefined}
          />
        )}

        {/* Profile Card - Glassmorphism */}
        <Card className="border-slate-700/50 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-slate-100">Profile</CardTitle>
            <CardDescription className="text-slate-400">
              Your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {user?.imageUrl && (
                <img 
                  src={user.imageUrl} 
                  alt="Profile" 
                  className="h-16 w-16 rounded-full ring-2 ring-slate-700/50"
                />
              )}
              <div>
                <p className="font-medium text-slate-100">
                  {user?.fullName || user?.username}
                </p>
                <p className="text-sm text-slate-400">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Free Tier Upgrade Card - Glassmorphism */}
        {!isPro && (
          <Card className="border-slate-700/50 bg-slate-900/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-slate-100">Subscription</CardTitle>
              <CardDescription className="text-slate-400">
                Upgrade for unlimited access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-slate-800/50 p-4">
                <p className="text-sm text-slate-400">
                  You&apos;re on the <strong className="text-slate-200">Free</strong> plan with limited exports.
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  <li className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-slate-500" />
                    2 exports per day
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-slate-500" />
                    5 welcome bonus exports
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-slate-500" />
                    3 bonus turbo exports
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    2 deck slots
                  </li>
                </ul>
              </div>
              <Link href="/upgrade">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 font-bold">
                  <Crown className="mr-2 h-4 w-4" />
                  View Pricing Plans
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Usage Stats - Glassmorphism with glow for Pro */}
        <Card className={isPro 
          ? "border-amber-500/30 bg-slate-900/60 backdrop-blur-xl" 
          : "border-slate-700/50 bg-slate-900/60 backdrop-blur-xl"
        }>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              {isPro && <Sparkles className="h-4 w-4 text-amber-400" />}
              Usage Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isPro ? (
              /* PRO USERS - Premium Design with glassmorphism */
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-purple-600/20 p-6 border border-amber-500/30 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-400/10 to-amber-500/0 animate-pulse" />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">Unlimited Exports</p>
                      <p className="text-sm text-amber-200/80">
                        {tier === "lifetime" ? "Champion Access" : 
                         tier === "annual" ? "Season Pass Access" : 
                         "Founding Member Access"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                      ∞
                    </span>
                  </div>
                </div>
                
                <div className="relative mt-4 flex items-center gap-2 text-xs text-amber-300/70">
                  <Check className="h-3.5 w-3.5" />
                  <span>No daily limits • Export as much as you need</span>
                </div>
              </div>
            ) : (
              /* FREE USERS - Standard Design */
              <>
                <div className={`flex items-center justify-between rounded-lg p-4 ${
                  exportsToday && exportsToday >= 2
                    ? "bg-amber-500/10 border border-amber-500/20" 
                    : "bg-slate-800/50"
                }`}>
                  <div className="flex items-center gap-3">
                    <Download className={`h-5 w-5 ${
                      exportsToday && exportsToday >= 2 ? "text-amber-400" : "text-slate-400"
                    }`} />
                    <span className="text-slate-300">Daily Exports Used</span>
                  </div>
                  <span className={exportsToday && exportsToday >= 2 ? "text-amber-400 font-medium" : "text-slate-100 font-medium"}>
                    {exportsToday ?? 0} / 2
                  </span>
                </div>
                {(exportsToday ?? 0) >= 2 && (
                  <p className="mt-2 text-xs text-amber-400">
                    Daily limit reached. Welcome credits or turbo trials still available, or upgrade to Pro for unlimited.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Billing Management - Glassmorphism */}
        {isPro && tier === "annual" && (
          <Card className="border-slate-700/50 bg-slate-900/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-slate-100">Billing</CardTitle>
              <CardDescription className="text-slate-400">
                Manage your subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription?.expiresAt && (
                <div className="rounded-lg bg-slate-800/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Renews on</span>
                    <span className="font-medium text-slate-100">
                      {new Date(subscription.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
                onClick={() => alert("Stripe portal coming soon!")}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Manage Billing
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Authentication - Glassmorphism */}
        <Card className="border-slate-700/50 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-slate-100">Authentication</CardTitle>
            <CardDescription className="text-slate-400">
              Manage your login methods and security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <User className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">Google Account</p>
                <p className="text-xs text-slate-500">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                Connected
              </span>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
              onClick={() => openUserProfile()}
            >
              <Shield className="mr-2 h-4 w-4" />
              Manage Account Security
            </Button>
          </CardContent>
        </Card>

        {/* Support - Glassmorphism */}
        <Card className="border-slate-700/50 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-slate-100">Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
              onClick={() => window.open('mailto:support@proxidex.com', '_blank')}
            >
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <SignOutButton />
      </div>
    </div>
  )
}

// Sign Out Button Component
function SignOutButton() {
  const { isSignedIn, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (!isSignedIn) return null

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error("Failed to sign out:", error)
      setIsSigningOut(false)
    }
  }

  return (
    <Button
      variant="outline"
      className="w-full h-12 border-red-900/50 text-red-400 hover:bg-red-950/50 hover:text-red-300"
      onClick={handleSignOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
          Signing out...
        </>
      ) : (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </>
      )}
    </Button>
  )
}
