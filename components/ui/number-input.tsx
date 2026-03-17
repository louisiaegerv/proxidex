"use client"

import * as React from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  className?: string
}

export function NumberInput({
  value,
  onChange,
  min = -200,
  max = 200,
  step = 0.5,
  unit = "mm",
  className,
}: NumberInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === "" || val === "-") {
      return
    }
    const num = parseFloat(val)
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)))
    }
  }

  const increment = () => {
    const newValue = Math.min(max, value + step)
    onChange(newValue)
  }

  const decrement = () => {
    const newValue = Math.max(min, value - step)
    onChange(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault()
      increment()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      decrement()
    }
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        step={step}
        className={cn(
          "flex h-9 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-1 pr-16 text-sm text-slate-100 shadow-sm transition-colors",
          "placeholder:text-slate-500",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-600",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        )}
      />
      <div className="absolute right-0 top-0 h-full flex flex-col border-l border-slate-700">
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          className="flex-1 px-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-tr-md transition-colors"
          tabIndex={-1}
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="flex-1 px-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-br-md transition-colors border-t border-slate-700"
          tabIndex={-1}
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      <span className="absolute right-10 text-xs text-slate-500 pointer-events-none">
        {unit}
      </span>
    </div>
  )
}
