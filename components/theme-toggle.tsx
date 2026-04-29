"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { Sun, Moon, Laptop, Palette, Sparkles } from "lucide-react"


const colorThemes = [
  { name: "emerald", label: "Emerald", color: "#10b981" },
  { name: "blue", label: "Blue", color: "#3b82f6" },
  { name: "purple", label: "Purple", color: "#8b5cf6" },
  { name: "pink", label: "Pink", color: "#ec4899" },
  { name: "red", label: "Red", color: "#dc2626" },
  { name: "orange", label: "Orange", color: "#f97316" }, 
  { name: "yellow", label: "Yellow", color: "#eab308" }, 
]

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [colorTheme, setColorTheme] = React.useState("blue")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    // Get saved color theme from localStorage or data attribute
    const savedColor = document.documentElement.getAttribute("data-theme") || "blue"
    setColorTheme(savedColor)
  }, [])

  const handleColorChange = (color: string) => {
    setColorTheme(color)
    document.documentElement.setAttribute("data-theme", color)
    localStorage.setItem("color-theme", color)
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="opacity-0">
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Sparkles className="h-5 w-5" />
          
          {/* {resolvedTheme === "dark" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )} */}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {theme === "light" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {theme === "dark" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Laptop className="mr-2 h-4 w-4" />
          System
          {theme === "system" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            Color Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40">
            {colorThemes.map((t) => (
              <DropdownMenuItem
                key={t.name}
                onClick={() => handleColorChange(t.name)}
                className="flex items-center gap-2"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                {t.label}
                {colorTheme === t.name && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
