"use client"

import { useAuth, useUser, SignOutButton } from "@clerk/nextjs"
import { Crown, Settings, LogOut, CreditCard, ChevronDown } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StorageNoticeBadge } from "@/components/storage/storage-notice"
import { useSubscription } from "@/components/subscription-provider"

export function Header() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { subscription } = useSubscription()

  const isPro = subscription?.isPro ?? false

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3">
        <img src="/logo.webp" alt="Proxidex" className="h-12 w-12 rounded-lg" />
        <h1 className="text-xl font-bold text-foreground">
          PROXI<span className="font-thin tracking-wide">DEX</span>
        </h1>
      </Link>

      {/* Right side: Storage Notice + User Menu */}
      <div className="flex items-center gap-3">
        {/* Storage Notice Badge for Free Users */}
        {!isPro && <StorageNoticeBadge />}

        {/* User Dropdown Menu (signed in) or Sign In button (guest) */}
        {isSignedIn && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center rounded-full p-1 transition-colors ${
                  isPro
                    ? "bg-gradient-to-r from-amber-500/20 to-amber-600/20 ring-1 ring-amber-500/50 hover:from-amber-500/30 hover:to-amber-600/30"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                <img
                  src={user.imageUrl}
                  alt={user.fullName || "User"}
                  className="h-8 w-8 rounded-full"
                />
                <ChevronDown className="mx-1 h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/account" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Account
                </Link>
              </DropdownMenuItem>

              {!isPro && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/pricing"
                    className="cursor-pointer text-amber-500"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade
                  </Link>
                </DropdownMenuItem>
              )}

              {isPro && (
                <DropdownMenuItem asChild>
                  <Link href="/account" className="cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <SignOutButton>
                  <button className="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-accent">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </button>
                </SignOutButton>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  )
}
