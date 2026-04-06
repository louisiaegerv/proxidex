"use client"

import { Loader2, FileCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface HTMLExportModalProps {
  isOpen: boolean
  onClose: () => void
  current: number
  total: number
  isProcessing: boolean
}

export function HTMLExportModal({
  isOpen,
  onClose,
  current,
  total,
  isProcessing,
}: HTMLExportModalProps) {
  const progress = total > 0 ? (current / total) * 100 : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="max-w-md border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-emerald-400" />
            Exporting HTML with Bleed
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isProcessing ? (
            <>
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              </div>

              <div className="text-center">
                <p className="text-sm text-slate-300">
                  Processing card {current} of {total}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Generating bleed borders...
                </p>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="text-xs text-center text-slate-500">
                {Math.round(progress)}% complete
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-emerald-400">Export complete!</p>
              <p className="text-xs text-slate-500 mt-1">
                HTML file has been downloaded
              </p>
            </div>
          )}
        </div>

        {!isProcessing && (
          <Button
            onClick={onClose}
            className="w-full bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            Close
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
