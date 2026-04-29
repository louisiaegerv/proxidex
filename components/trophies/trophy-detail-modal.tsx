"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RARITY_CONFIG, type TrophyDefinition } from "@/lib/trophies"
import { cn } from "@/lib/utils"
import { Link2, Twitter, Check, Calendar, Lock, Trophy } from "lucide-react"
import { useState } from "react"

interface TrophyDetailModalProps {
  trophy: TrophyDefinition | null
  isUnlocked: boolean
  unlockedAt: string | null
  progress: number
  progressTarget: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getShareText(trophy: TrophyDefinition, isUnlocked: boolean): string {
  if (isUnlocked) {
    return `I just unlocked the "${trophy.name}" trophy on Proxidex! ${trophy.description}`
  }
  return `I'm working toward unlocking the "${trophy.name}" trophy on Proxidex. ${trophy.description}`
}

function getShareUrl(trophyId: string): string {
  return `https://app.proxidex.com/trophies/share/${trophyId}`
}

export function TrophyDetailModal({
  trophy,
  isUnlocked,
  unlockedAt,
  progress,
  progressTarget,
  open,
  onOpenChange,
}: TrophyDetailModalProps) {
  const [copied, setCopied] = useState(false)

  if (!trophy) return null

  const config = RARITY_CONFIG[trophy.rarity]
  const shareText = getShareText(trophy, isUnlocked)
  const shareUrl = getShareUrl(trophy.id)
  const fullShareMessage = `${shareText}\n\n${shareUrl}`

  const twitterIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullShareMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silently fail
    }
  }

  const unlockedDate = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden border-slate-700/50 bg-slate-900 p-0 text-slate-100 sm:max-w-lg">
        <div className="relative">
          {/* Background glow */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(ellipse at center top, ${config.glowColor} 0%, transparent 60%)`,
            }}
          />

          <div className="relative p-6">
            <DialogHeader className="gap-4">
              {/* Large Trophy Image */}
              <div className="relative mx-auto aspect-[63/88] w-72 overflow-hidden rounded-xl sm:w-80">
                {isUnlocked ? (
                  <>
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: `radial-gradient(ellipse at center, ${config.glowColor} 0%, transparent 70%)`,
                      }}
                    />
                    <Image
                      src={trophy.image}
                      alt={trophy.name}
                      fill
                      className="object-contain"
                      sizes="320px"
                      priority
                    />
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-slate-800/50">
                    <div className="relative flex h-3/4 w-3/4 items-center justify-center opacity-20">
                      <Image
                        src={trophy.image}
                        alt="?"
                        fill
                        className="object-contain grayscale"
                        sizes="320px"
                      />
                      <div className="absolute inset-0 bg-slate-950/70" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="h-10 w-10 text-slate-600" />
                    </div>
                  </div>
                )}

                {/* Rarity badge */}
                <div
                  className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                  style={{
                    background: `${config.color}30`,
                    color: config.color,
                    border: `1px solid ${config.color}50`,
                  }}
                >
                  {config.label}
                </div>
              </div>

              <div className="text-center">
                <DialogTitle className="text-xl font-bold text-slate-100">
                  {trophy.name}
                </DialogTitle>

                {/* Unlock date */}
                {isUnlocked && unlockedDate && (
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Unlocked {unlockedDate}</span>
                  </div>
                )}

                {!isUnlocked && (
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Locked</span>
                  </div>
                )}
              </div>

              <DialogDescription className="text-center text-sm text-slate-400">
                {trophy.description}
              </DialogDescription>
            </DialogHeader>

            {/* Progress or condition */}
            <div className="mt-4">
              {!isUnlocked ? (
                <div className="rounded-lg bg-slate-800/50 p-3">
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">
                      How to unlock:{" "}
                    </span>
                    {trophy.condition}
                  </p>
                  {progress > 0 && progress < progressTarget && (
                    <div className="mt-2">
                      <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                        <span>Progress</span>
                        <span>
                          {progress} / {progressTarget}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all"
                          style={{
                            width: `${Math.min(100, (progress / progressTarget) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-500/10 py-2.5 text-xs font-medium text-amber-400">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>Trophy Unlocked</span>
                </div>
              )}
            </div>

            {/* Share buttons */}
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex-1 gap-2 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-slate-100",
                  copied && "border-green-700/50 text-green-400"
                )}
                onClick={handleCopyLink}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5" />
                    Copy Link
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                onClick={() => window.open(twitterIntentUrl, "_blank")}
              >
                <Twitter className="h-3.5 w-3.5" />
                Share on X
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
