"use client"

import { useState, useCallback } from "react"
import {
  Settings2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  Printer,
  Copy,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  FileCode,
  LogOut,
} from "lucide-react"
import { useProxyList } from "@/stores/proxy-list"
import { useAuth } from "@clerk/nextjs"
import { AuthExportButton } from "@/components/auth/export-button"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { HTMLExportModal } from "@/components/proxy/html-export-modal"
import { BleedMethod } from "@/types"
import { generateProxyPDF, downloadPDF, clearImageCache, generatePrintHTML, downloadPrintHTML, batchGenerateBleedImages } from "@/lib/pdf"

// Expandable section component
interface ExpandableSectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  expanded: boolean
  onToggle: () => void
}

function ExpandableSection({
  title,
  icon,
  children,
  expanded,
  onToggle,
}: ExpandableSectionProps) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-4 transition-colors active:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
          <span className="text-base font-medium text-foreground">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

const ALL_SECTIONS = ["layout", "bleed", "quality", "offset", "export"]

export function MobileSettings() {
  const {
    settings,
    updateSettings,
    resetSettings,
    getActiveDeck,
    getTotalCards,
    isGenerating,
    setIsGenerating,
    setGenerationProgress,
  } = useProxyList()
  const items = getActiveDeck()?.items ?? []
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  
  // HTML export with bleed modal state
  const [htmlExportOpen, setHtmlExportOpen] = useState(false)
  const [htmlExportProgress, setHtmlExportProgress] = useState({ current: 0, total: 0 })
  const [isProcessingHtml, setIsProcessingHtml] = useState(false)

  const totalCards = getTotalCards()

  const allExpanded = expandedSections.length === ALL_SECTIONS.length

  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedSections([])
    } else {
      setExpandedSections([...ALL_SECTIONS])
    }
  }, [allExpanded])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    )
  }

  const handleReset = () => {
    resetSettings()
    setShowResetConfirm(false)
  }

  const handleGeneratePDF = async () => {
    if (items.length === 0) return
    setIsGenerating(true)
    setGenerationProgress(null)
    try {
      const pdfBytes = await generateProxyPDF(items, settings, (progress) => {
        setGenerationProgress(progress)
      })
      downloadPDF(pdfBytes, `proxidex-${totalCards}-cards.pdf`)
    } catch (error) {
      console.error("Failed to generate PDF:", error)
    } finally {
      setIsGenerating(false)
      setGenerationProgress(null)
      // Clear image cache to free memory after generation
      clearImageCache()
    }
  }

  const handleGenerateHTML = async (exportType: 'standard' | 'turbo' = 'standard') => {
    if (items.length === 0) return
    
    // For free users with standard export, add per-card artificial delay
    const isStandardExport = exportType === 'standard'
    
    // If no bleed, use fast export
    if (settings.bleed === 0) {
      // For standard export, simulate processing delay per card
      if (isStandardExport) {
        setIsProcessingHtml(true)
        for (let i = 0; i < items.length; i++) {
          // Randomized 1-2 second delay per card
          const cardDelay = 1000 + Math.random() * 1000
          await new Promise(resolve => setTimeout(resolve, cardDelay))
        }
        setIsProcessingHtml(false)
      }
      
      const html = generatePrintHTML(items, settings)
      downloadPrintHTML(html, `proxidex-${totalCards}-cards.html`)
      return
    }
    
    // With bleed - show modal and process in background
    setHtmlExportOpen(true)
    setIsProcessingHtml(true)
    setHtmlExportProgress({ current: 0, total: 0 })
    
    try {
      // Get unique cards count for progress
      const uniqueImages = new Set(items.map(item => item.image).filter(Boolean))
      setHtmlExportProgress({ current: 0, total: uniqueImages.size })
      
      // Batch process all cards with bleed (use JPEG for smaller HTML file size)
      await batchGenerateBleedImages(items, settings, (current, total) => {
        setHtmlExportProgress({ current, total })
      }, 'jpeg')
      
      // Generate and download HTML
      const html = generatePrintHTML(items, settings)
      downloadPrintHTML(html, `proxidex-${totalCards}-cards.html`)
      
    } catch (error) {
      console.error("Failed to generate HTML with bleed:", error)
    } finally {
      setIsProcessingHtml(false)
      // Close modal after a short delay so user sees 100%
      setTimeout(() => {
        setHtmlExportOpen(false)
      }, 1500)
    }
  }

  const handleCopyCardList = async () => {
    if (items.length === 0) return

    const getSetId = (item: (typeof items)[0]): string => {
      if (item.setId) return item.setId
      const imageUrl = item.image
      if (imageUrl) {
        const match = imageUrl.match(/\/en\/[^/]+\/([^/]+)\//)
        if (match) return match[1]
      }
      return ""
    }

    const getCardKey = (item: (typeof items)[0]): string => {
      return `${item.name}|${getSetId(item)}|${item.localId}`
    }

    const mergedLines: string[] = []
    let currentKey: string | null = null
    let currentQuantity = 0
    let currentName = ""
    let currentSetId = ""
    let currentLocalId = ""

    for (const item of items) {
      const key = getCardKey(item)

      if (key === currentKey) {
        currentQuantity += 1
      } else {
        if (currentKey !== null) {
          mergedLines.push(
            `${currentQuantity} ${currentName} ${currentSetId} ${currentLocalId}`
          )
        }
        currentKey = key
        currentQuantity = 1
        currentName = item.name
        currentSetId = getSetId(item)
        currentLocalId = item.localId
      }
    }

    if (currentKey !== null) {
      mergedLines.push(
        `${currentQuantity} ${currentName} ${currentSetId} ${currentLocalId}`
      )
    }

    const cardList = mergedLines.join("\n")

    try {
      await navigator.clipboard.writeText(cardList)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-muted/50 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Settings</h1>
            <p className="text-xs text-muted-foreground">
              Customize your print output
            </p>
          </div>
          <button
            onClick={toggleAll}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={allExpanded ? "Collapse All" : "Expand All"}
          >
            {allExpanded ? (
              <ChevronsDownUp className="h-5 w-5" />
            ) : (
              <ChevronsUpDown className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto">
        {/* Page Layout Section */}
        <ExpandableSection
          title="Page Layout"
          icon={<Settings2 className="h-5 w-5" />}
          expanded={expandedSections.includes("layout")}
          onToggle={() => toggleSection("layout")}
        >
          <div className="space-y-6">
            {/* Page Size */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Page Size</Label>
              <Select
                value={settings.pageSize}
                onValueChange={(value: "letter" | "a4") =>
                  updateSettings({ pageSize: value })
                }
              >
                <SelectTrigger className="h-12 border-border bg-muted text-base text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem
                    value="letter"
                    className="h-12 text-foreground focus:bg-muted"
                  >
                    Letter (8.5&quot; × 11&quot;)
                  </SelectItem>
                  <SelectItem
                    value="a4"
                    className="h-12 text-foreground focus:bg-muted"
                  >
                    A4 (210mm × 297mm)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cards Per Row */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Cards Per Row</Label>
                <span className="text-base font-bold text-primary">
                  {settings.cardsPerRow}
                </span>
              </div>
              <Slider
                value={[settings.cardsPerRow]}
                onValueChange={([value]) =>
                  updateSettings({ cardsPerRow: value })
                }
                min={1}
                max={4}
                step={1}
                className="py-2"
              />
            </div>

            {/* Rows Per Page */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Rows Per Page</Label>
                <span className="text-base font-bold text-primary">
                  {settings.rowsPerPage}
                </span>
              </div>
              <Slider
                value={[settings.rowsPerPage]}
                onValueChange={([value]) =>
                  updateSettings({ rowsPerPage: value })
                }
                min={1}
                max={5}
                step={1}
                className="py-2"
              />
            </div>

            {/* Gap Between Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">
                  Gap Between Cards
                </Label>
                <span className="text-base font-bold text-primary">
                  {settings.gap}mm
                </span>
              </div>
              <Slider
                value={[settings.gap]}
                onValueChange={([value]) => updateSettings({ gap: value })}
                min={0}
                max={10}
                step={0.5}
                className="py-2"
              />
            </div>
          </div>
        </ExpandableSection>

        {/* Bleed & Cut Lines Section */}
        <ExpandableSection
          title="Bleed & Cut Lines"
          icon={
            <div className="h-5 w-5 rounded border-2 border-dashed border-muted-foreground" />
          }
          expanded={expandedSections.includes("bleed")}
          onToggle={() => toggleSection("bleed")}
        >
          <div className="space-y-6">
            {/* Bleed Area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Bleed Area</Label>
                <span className="text-base font-bold text-primary">
                  {settings.bleed}mm
                </span>
              </div>
              <Slider
                value={[settings.bleed]}
                onValueChange={([value]) => updateSettings({ bleed: value })}
                min={0}
                max={5}
                step={0.5}
                className="py-2"
              />
            </div>

            {/* Bleed Method */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Bleed Method</Label>
              <RadioGroup
                value={settings.bleedMethod}
                onValueChange={(value: BleedMethod) =>
                  updateSettings({ bleedMethod: value })
                }
                className="grid grid-cols-1 gap-2"
              >
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                    settings.bleedMethod === "replicate"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/50"
                  )}
                >
                  <RadioGroupItem
                    value="replicate"
                    className="border-muted-foreground"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Replicate
                    </p>
                    <p className="text-xs text-muted-foreground">Stretch edges</p>
                  </div>
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                    settings.bleedMethod === "mirror"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/50"
                  )}
                >
                  <RadioGroupItem value="mirror" className="border-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Mirror</p>
                    <p className="text-xs text-muted-foreground">Reflect edges</p>
                  </div>
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                    settings.bleedMethod === "edge"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/50"
                  )}
                >
                  <RadioGroupItem value="edge" className="border-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Edge</p>
                    <p className="text-xs text-muted-foreground">Solid color</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Cut Lines Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-base text-foreground">
                  Show Cut Lines
                </Label>
                <p className="text-xs text-muted-foreground">
                  Print guides for cutting
                </p>
              </div>
              <Switch
                checked={settings.showCutLines}
                onCheckedChange={(checked) =>
                  updateSettings({ showCutLines: checked })
                }
                className="data-[state=checked]:bg-primary"
              />
            </div>

            {settings.showCutLines && (
              <div className="space-y-6 pt-2">
                {/* Cut Line Color */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Cut line color
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={
                        settings.cutLineColor
                          ? `#${settings.cutLineColor.r.toString(16).padStart(2, "0")}${settings.cutLineColor.g.toString(16).padStart(2, "0")}${settings.cutLineColor.b.toString(16).padStart(2, "0")}`
                          : "#10b981"
                      }
                      onChange={(e) => {
                        const hex = e.target.value
                        const r = parseInt(hex.slice(1, 3), 16)
                        const g = parseInt(hex.slice(3, 5), 16)
                        const b = parseInt(hex.slice(5, 7), 16)
                        updateSettings({ cutLineColor: { r, g, b } })
                      }}
                      className="h-12 w-12 cursor-pointer rounded-lg border border-border bg-transparent"
                    />
                    <span className="text-sm text-muted-foreground">
                      {settings.cutLineColor
                        ? `RGB(${settings.cutLineColor.r}, ${settings.cutLineColor.g}, ${settings.cutLineColor.b})`
                        : "Default (Emerald)"}
                    </span>
                  </div>
                </div>

                {/* Cut Line Width */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Line width</Label>
                    <span className="text-base font-bold text-primary">
                      {settings.cutLineWidth ?? 1.5}px
                    </span>
                  </div>
                  <Slider
                    value={[settings.cutLineWidth ?? 1.5]}
                    onValueChange={([value]) =>
                      updateSettings({ cutLineWidth: value })
                    }
                    min={0.5}
                    max={3}
                    step={0.5}
                    className="py-2"
                  />
                </div>

                {/* Cut Line Length */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">
                      Line length
                    </Label>
                    <span className="text-base font-bold text-primary">
                      {settings.cutLineLength ?? 8}mm
                    </span>
                  </div>
                  <Slider
                    value={[settings.cutLineLength ?? 8]}
                    onValueChange={([value]) =>
                      updateSettings({ cutLineLength: value })
                    }
                    min={0}
                    max={15}
                    step={1}
                    className="py-2"
                  />
                </div>

                {/* Cut Line Position */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Line position
                  </Label>
                  <Select
                    value={settings.cutLinePosition ?? "behind"}
                    onValueChange={(value: "front" | "behind") =>
                      updateSettings({ cutLinePosition: value })
                    }
                  >
                    <SelectTrigger className="h-12 border-border bg-muted text-base text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-card">
                      <SelectItem
                        value="front"
                        className="h-12 text-foreground focus:bg-muted"
                      >
                        In front of cards
                      </SelectItem>
                      <SelectItem
                        value="behind"
                        className="h-12 text-foreground focus:bg-muted"
                      >
                        Behind cards
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </ExpandableSection>

        {/* Image Quality Section */}
        <ExpandableSection
          title="Image Quality"
          icon={
            <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-400 to-purple-500" />
          }
          expanded={expandedSections.includes("quality")}
          onToggle={() => toggleSection("quality")}
        >
          <div className="space-y-4">
            {/* Image Size Selection */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Image Size</Label>
              <Select
                value={settings.imageSize ?? "lg"}
                onValueChange={(value: "sm" | "md" | "lg") =>
                  updateSettings({ imageSize: value })
                }
              >
                <SelectTrigger className="h-12 border-border bg-muted text-base text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem
                    value="sm"
                    className="h-12 text-foreground focus:bg-muted"
                  >
                    Draft (288×400) - Fastest
                  </SelectItem>
                  <SelectItem
                    value="md"
                    className="h-12 text-foreground focus:bg-muted"
                  >
                    Optimized (575×800) - Balanced
                  </SelectItem>
                  <SelectItem
                    value="lg"
                    className="h-12 text-foreground focus:bg-muted"
                  >
                    High Quality (1150×1600)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Draft = fastest, Optimized = balanced, High Quality = best detail
              </p>
            </div>

            {/* Black and White Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-base text-foreground">Black & White</Label>
                <p className="text-xs text-muted-foreground">
                  Saves color ink on draft prints
                </p>
              </div>
              <Switch
                checked={settings.blackAndWhite ?? false}
                onCheckedChange={(checked) =>
                  updateSettings({ blackAndWhite: checked })
                }
                className="data-[state=checked]:bg-primary"
              />
            </div>

            {/* Info box */}
            <div className="flex gap-3 rounded-lg bg-muted/50 p-3">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Draft mode + B&W prints up to 4× faster and saves ink.
                Use for test prints before final output.
              </p>
            </div>
          </div>
        </ExpandableSection>

        {/* Offset Section */}
        <ExpandableSection
          title="Print Offset"
          icon={
            <div className="flex h-5 w-5 items-center justify-center rounded border border-muted-foreground text-[8px] text-muted-foreground">
              +
            </div>
          }
          expanded={expandedSections.includes("offset")}
          onToggle={() => toggleSection("offset")}
        >
          <div className="space-y-6">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                Adjust if your prints are misaligned. Use small values (±5mm)
                for fine-tuning.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">
                  Horizontal Offset
                </Label>
                <span className="text-base font-bold text-primary">
                  {settings.offsetX}mm
                </span>
              </div>
              <Slider
                value={[settings.offsetX]}
                onValueChange={([value]) => updateSettings({ offsetX: value })}
                min={-20}
                max={20}
                step={0.5}
                className="py-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">
                  Vertical Offset
                </Label>
                <span className="text-base font-bold text-primary">
                  {settings.offsetY}mm
                </span>
              </div>
              <Slider
                value={[settings.offsetY]}
                onValueChange={([value]) => updateSettings({ offsetY: value })}
                min={-100}
                max={100}
                step={1}
                className="py-2"
              />
            </div>
          </div>
        </ExpandableSection>

        {/* Export Section */}
        <ExpandableSection
          title="Export"
          icon={<Download className="h-5 w-5" />}
          expanded={expandedSections.includes("export")}
          onToggle={() => toggleSection("export")}
        >
          <div className="space-y-4">
            {/* Copy Card List Button */}
            <Button
              className="h-12 w-full border-border bg-muted text-foreground hover:bg-muted/80"
              variant="outline"
              disabled={items.length === 0}
              onClick={handleCopyCardList}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-5 w-5" />
                  Copy Card List
                </>
              )}
            </Button>

            {/* Export Button with Auth */}
            <AuthExportButton
              onExport={(type) => handleGenerateHTML(type)}
              disabled={items.length === 0}
              isProcessing={isProcessingHtml}
            />

            {/* Download PDF Button */}
            {/* <Button
              className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={items.length === 0 || isGenerating}
              onClick={handleGeneratePDF}
            >
              {isGenerating ? (
                <>
                  <RotateCcw className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-5 w-5" />
                  Download PDF
                </>
              )}
            </Button> */}

            {items.length > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {totalCards} cards ready
              </p>
            )}
          </div>
        </ExpandableSection>

        {/* Reset Section */}
        <div className="p-4 space-y-3">
          <Button
            variant="outline"
            className="h-12 w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setShowResetConfirm(true)}
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Reset All Settings
          </Button>
          
          {/* Logout Button */}
          <LogoutButton />
        </div>

        {/* Bottom padding for safe area */}
        <div className="safe-area-pb h-8" />
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Reset Settings?
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              This will reset all settings to their default values.
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 text-muted-foreground"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 bg-red-600"
                onClick={handleReset}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HTML Export Progress Modal */}
      <HTMLExportModal
        isOpen={htmlExportOpen}
        onClose={() => setHtmlExportOpen(false)}
        current={htmlExportProgress.current}
        total={htmlExportProgress.total}
        isProcessing={isProcessingHtml}
      />
    </div>
  )
}

// Logout Button Component
function LogoutButton() {
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
      className="h-12 w-full border-red-900/50 text-red-400 hover:bg-red-950/50 hover:text-red-300"
      onClick={handleSignOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? (
        <>
          <RotateCcw className="mr-2 h-5 w-5 animate-spin" />
          Signing out...
        </>
      ) : (
        <>
          <LogOut className="mr-2 h-5 w-5" />
          Sign Out
        </>
      )}
    </Button>
  )
}
