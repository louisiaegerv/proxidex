"use client"

import { Cloud, CloudCheck, CloudOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SyncIndicatorProps {
  status: "idle" | "syncing" | "synced" | "error"
  className?: string
}

export function SyncIndicator({ status, className }: SyncIndicatorProps) {
  const icons = {
    idle: Cloud,
    syncing: Loader2,
    synced: CloudCheck,
    error: CloudOff
  }
  
  const labels = {
    idle: "",
    syncing: "Syncing...",
    synced: "Saved to cloud",
    error: "Sync failed"
  }
  
  const colors = {
    idle: "text-slate-500",
    syncing: "text-blue-400",
    synced: "text-emerald-400",
    error: "text-red-400"
  }
  
  const Icon = icons[status]
  
  // Don't show anything in idle state (cleaner UI)
  if (status === "idle") return null
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs transition-all duration-300",
      colors[status],
      className
    )}>
      <Icon className={cn("h-3.5 w-3.5", status === "syncing" && "animate-spin")} />
      <span>{labels[status]}</span>
    </div>
  )
}

// Compact version for header
export function SyncStatusDot({ status }: { status: "idle" | "syncing" | "synced" | "error" }) {
  if (status === "idle") return null
  
  const colors = {
    syncing: "bg-blue-500 animate-pulse",
    synced: "bg-emerald-500",
    error: "bg-red-500"
  }
  
  return (
    <span 
      className={cn("h-2 w-2 rounded-full", colors[status])}
      title={status === "syncing" ? "Syncing..." : status === "synced" ? "Saved" : "Error"}
    />
  )
}
