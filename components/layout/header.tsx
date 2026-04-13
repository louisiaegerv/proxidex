"use client"

import { useState, useEffect } from "react"
import { useAuth, useUser, SignOutButton } from "@clerk/nextjs"
import { Download, Crown, Settings, LogOut, CreditCard, ChevronDown } from "lucide-react"
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
  const [remainingExports, setRemainingExports] = useState<number | null>(null)
  
  // Use subscription from context
  const isPro = subscription?.isPro ?? false

  // Fetch remaining exports when signed in (only on mount and window focus)
  useEffect(() => {
    if (isSignedIn && !isPro) {
      fetchRemainingExports()
      
      // Refresh on window focus only (not interval polling)
      const onFocus = () => fetchRemainingExports()
      window.addEventListener('focus', onFocus)
      
      return () => {
        window.removeEventListener('focus', onFocus)
      }
    }
  }, [isSignedIn, isPro])

  const fetchRemainingExports = async () => {
    try {
      const response = await fetch("/api/exports/remaining")
      if (response.ok) {
        const data = await response.json()
        setRemainingExports(data.remaining)
      }
    } catch (error) {
      console.error("Failed to fetch remaining exports:", error)
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3">
        <img 
          src="/logo.webp" 
          alt="Proxidex" 
          className="h-12 w-12 rounded-lg"
        />
        <h1 className="text-xl font-bold text-foreground">PROXI<span className='font-thin tracking-wide'>DEX</span></h1>
      </Link>

      {/* Right side: Export Counter + User Menu */}
      <div className="flex items-center gap-3">
        {/* Storage Notice Badge for Free Users */}
        {!isPro && <StorageNoticeBadge />}

        {/* Export Counter (only when signed in) */}
        {isSignedIn && remainingExports !== null && (
          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {remainingExports === Infinity ? (
                <span className="flex items-center gap-1 text-amber-400">
                  <Crown className="h-3 w-3" />
                  Pro
                </span>
              ) : (
                <>
                  <span className={remainingExports === 0 ? "text-amber-400" : "text-foreground"}>
                    {remainingExports}
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground">1</span>
                </>
              )}
            </span>
          </div>
        )}

        {/* User Dropdown Menu (replaces both settings icon and Clerk UserButton) */}
        {isSignedIn && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center rounded-full p-1 transition-colors ${
                isPro 
                  ? "bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 ring-1 ring-amber-500/50" 
                  : "bg-muted hover:bg-muted/80"
              }`}>
                {/* Avatar with Pro styling */}
                <div className="relative">
                  {user.imageUrl ? (
                    <img 
                      src={user.imageUrl} 
                      alt={user.fullName || "User"} 
                      className={`rounded-full ${isPro ? "h-8 w-8 ring-2 ring-amber-400/50" : "h-7 w-7"}`}
                    />
                  ) : (
                    <div className={`flex items-center justify-center rounded-full bg-muted-foreground/30 text-xs font-medium text-foreground ${
                      isPro ? "h-8 w-8 ring-2 ring-amber-400/50" : "h-7 w-7"
                    }`}>
                      {user.firstName?.[0] || user.username?.[0] || "U"}
                    </div>
                  )}
                  
                  {/* Pro Crown Badge */}
                  {isPro && (
                    <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-lg shadow-amber-500/30">
                      <Crown className="h-2.5 w-2.5 text-white" fill="currentColor" />
                    </div>
                  )}
                </div>
                
                {/* Pro Label */}
                {isPro && (
                  <span className="ml-1.5 text-xs font-semibold text-amber-400">Pro</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-border bg-popover">
              {/* User info header */}
              <div className="flex items-center gap-3 px-3 py-2">
                {user.imageUrl ? (
                  <img 
                    src={user.imageUrl} 
                    alt={user.fullName || "User"} 
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                    {user.firstName?.[0] || user.username?.[0] || "U"}
                  </div>
                )}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {user.fullName || user.username}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
              </div>
              
              <DropdownMenuSeparator className="bg-border" />
              
              {/* Menu items */}
              <Link href="/account">
                <DropdownMenuItem className="cursor-pointer text-muted-foreground focus:bg-muted focus:text-foreground">
                  <Settings className="mr-2 h-4 w-4" />
                  Account & Billing
                </DropdownMenuItem>
              </Link>
              
              {!isPro && (
                <Link href="/upgrade">
                  <DropdownMenuItem className="cursor-pointer text-muted-foreground focus:bg-muted focus:text-foreground">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Upgrade to Pro
                  </DropdownMenuItem>
                </Link>
              )}
              
              <DropdownMenuSeparator className="bg-border" />
              
              <SignOutButton redirectUrl="/">
                <DropdownMenuItem className="cursor-pointer text-muted-foreground focus:bg-muted focus:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </SignOutButton>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
