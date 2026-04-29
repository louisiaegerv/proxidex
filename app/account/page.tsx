"use client"

import { useUser, useClerk } from "@clerk/nextjs"
import {
  Crown,
  CreditCard,
  Calendar,
  Shield,
  Sparkles,
  Check,
  ArrowLeft,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Link from "next/link"
import { VIPStatusCard } from "@/components/pricing/user-tier-badge"
import { useSubscription } from "@/components/subscription-provider"
import {
  TrophySummary,
  TrophyProvider,
} from "@/components/trophies/trophy-case"
import type { SubscriptionType } from "@/lib/pricing"

export default function AccountPage() {
  const { user, isLoaded } = useUser()
  const { openUserProfile, signOut } = useClerk()
  const { subscription, isLoading: isSubLoading } = useSubscription()

  const isPro = subscription?.isPro ?? false
  const tier = (subscription?.tier as SubscriptionType) || "free"
  const isLoading = isSubLoading

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
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
            className="flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
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

        {/* Trophy Case Summary */}
        <Link href="/trophies" className="block">
          <TrophyProvider>
            <TrophySummary />
          </TrophyProvider>
        </Link>

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
                Upgrade for premium features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-slate-800/50 p-4">
                <p className="text-sm text-slate-400">
                  You&apos;re on the{" "}
                  <strong className="text-slate-200">Free</strong> plan.
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-green-500" />
                    Unlimited exports
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-green-500" />
                    Fast export speed
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-slate-500" />
                    60 cards per deck
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />2 deck slots
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-500" />
                    Session-only storage
                  </li>
                </ul>
              </div>
              <Link href="/pricing">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 font-bold text-black hover:from-amber-400 hover:to-yellow-300">
                  <Crown className="mr-2 h-4 w-4" />
                  View Pricing Plans
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Pro Features Card */}
        {isPro && (
          <Card className="border-amber-500/30 bg-slate-900/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Pro Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-purple-600/20 p-6 backdrop-blur-sm">
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-amber-500/0 via-amber-400/10 to-amber-500/0" />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">
                        Unlimited Everything
                      </p>
                      <p className="text-sm text-amber-200/80">
                        {tier === "lifetime"
                          ? "Champion Access"
                          : tier === "annual"
                            ? "Season Pass Access"
                            : "Founding Member Access"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-3xl font-bold text-transparent">
                      &infin;
                    </span>
                  </div>
                </div>

                <div className="relative mt-4 space-y-1 text-xs text-amber-300/70">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5" />
                    <span>Unlimited decks &bull; Unlimited cards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5" />
                    <span>High quality exports &bull; Cloud sync</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5" />
                    <span>Priority support &bull; All future updates</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => openUserProfile()}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Manage Subscription
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Sign Out */}
        <Card className="border-slate-700/50 bg-slate-900/60 backdrop-blur-xl">
          <CardContent className="p-4">
            <Button
              variant="ghost"
              className="w-full text-slate-400 hover:bg-red-500/10 hover:text-red-400"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
