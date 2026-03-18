'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { useProxyList } from '@/stores/proxy-list';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BleedMethod } from '@/types';
import { generateProxyPDF, downloadPDF } from '@/lib/pdf';

// Expandable section component
interface ExpandableSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function ExpandableSection({ title, icon, children, expanded, onToggle }: ExpandableSectionProps) {
  return (
    <div className="border-b border-slate-800 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-4 active:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
            {icon}
          </div>
          <span className="text-base font-medium text-slate-200">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-slate-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-500" />
        )}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

const ALL_SECTIONS = ['layout', 'bleed', 'quality', 'offset', 'export'];

export function MobileSettings() {
  const { settings, updateSettings, resetSettings, items, getTotalCards } = useProxyList();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['layout']);

  const totalCards = getTotalCards();

  const allExpanded = expandedSections.length === ALL_SECTIONS.length;

  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedSections([]);
    } else {
      setExpandedSections([...ALL_SECTIONS]);
    }
  }, [allExpanded]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleReset = () => {
    resetSettings();
    setShowResetConfirm(false);
  };

  const handleGeneratePDF = async () => {
    if (items.length === 0) return;
    setIsGenerating(true);
    try {
      const pdfBytes = await generateProxyPDF(items, settings);
      downloadPDF(pdfBytes, `proxymon-${totalCards}-cards.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCardList = async () => {
    if (items.length === 0) return;
    
    const getSetId = (item: typeof items[0]): string => {
      if (item.setId) return item.setId;
      const imageUrl = item.originalImage || item.image;
      if (imageUrl) {
        const match = imageUrl.match(/\/en\/[^/]+\/([^/]+)\//);
        if (match) return match[1];
      }
      return "";
    };
    
    const getCardKey = (item: typeof items[0]): string => {
      return `${item.name}|${getSetId(item)}|${item.localId}`;
    };
    
    const mergedLines: string[] = [];
    let currentKey: string | null = null;
    let currentQuantity = 0;
    let currentName = "";
    let currentSetId = "";
    let currentLocalId = "";
    
    for (const item of items) {
      const key = getCardKey(item);
      
      if (key === currentKey) {
        currentQuantity += item.quantity;
      } else {
        if (currentKey !== null) {
          mergedLines.push(`${currentQuantity} ${currentName} ${currentSetId} ${currentLocalId}`);
        }
        currentKey = key;
        currentQuantity = item.quantity;
        currentName = item.name;
        currentSetId = getSetId(item);
        currentLocalId = item.localId;
      }
    }
    
    if (currentKey !== null) {
      mergedLines.push(`${currentQuantity} ${currentName} ${currentSetId} ${currentLocalId}`);
    }
    
    const cardList = mergedLines.join("\n");
    
    try {
      await navigator.clipboard.writeText(cardList);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/50 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-100">Settings</h1>
            <p className="text-xs text-slate-500">Customize your print output</p>
          </div>
          <button
            onClick={toggleAll}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
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
          expanded={expandedSections.includes('layout')}
          onToggle={() => toggleSection('layout')}
        >
          <div className="space-y-6">
            {/* Page Size */}
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Page Size</Label>
              <Select
                value={settings.pageSize}
                onValueChange={(value: 'letter' | 'a4') =>
                  updateSettings({ pageSize: value })
                }
              >
                <SelectTrigger className="h-12 border-slate-700 bg-slate-800 text-slate-100 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900">
                  <SelectItem
                    value="letter"
                    className="text-slate-100 focus:bg-slate-800 h-12"
                  >
                    Letter (8.5" × 11")
                  </SelectItem>
                  <SelectItem
                    value="a4"
                    className="text-slate-100 focus:bg-slate-800 h-12"
                  >
                    A4 (210mm × 297mm)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cards Per Row */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-300">Cards Per Row</Label>
                <span className="text-base font-bold text-blue-400">{settings.cardsPerRow}</span>
              </div>
              <Slider
                value={[settings.cardsPerRow]}
                onValueChange={([value]) => updateSettings({ cardsPerRow: value })}
                min={1}
                max={4}
                step={1}
                className="py-2"
              />
            </div>

            {/* Rows Per Page */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-300">Rows Per Page</Label>
                <span className="text-base font-bold text-blue-400">{settings.rowsPerPage}</span>
              </div>
              <Slider
                value={[settings.rowsPerPage]}
                onValueChange={([value]) => updateSettings({ rowsPerPage: value })}
                min={1}
                max={5}
                step={1}
                className="py-2"
              />
            </div>

            {/* Gap Between Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-300">Gap Between Cards</Label>
                <span className="text-base font-bold text-blue-400">{settings.gap}mm</span>
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
          icon={<div className="h-5 w-5 border-2 border-dashed border-slate-400 rounded" />}
          expanded={expandedSections.includes('bleed')}
          onToggle={() => toggleSection('bleed')}
        >
          <div className="space-y-6">
            {/* Bleed Area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-300">Bleed Area</Label>
                <span className="text-base font-bold text-blue-400">{settings.bleed}mm</span>
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
              <Label className="text-sm text-slate-300">Bleed Method</Label>
              <RadioGroup
                value={settings.bleedMethod}
                onValueChange={(value: BleedMethod) => updateSettings({ bleedMethod: value })}
                className="grid grid-cols-1 gap-2"
              >
                <label className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  settings.bleedMethod === 'replicate'
                    ? "border-blue-600 bg-blue-600/10"
                    : "border-slate-700 bg-slate-800/50"
                )}>
                  <RadioGroupItem value="replicate" className="border-slate-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">Replicate</p>
                    <p className="text-xs text-slate-500">Stretch edges</p>
                  </div>
                </label>
                <label className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  settings.bleedMethod === 'mirror'
                    ? "border-blue-600 bg-blue-600/10"
                    : "border-slate-700 bg-slate-800/50"
                )}>
                  <RadioGroupItem value="mirror" className="border-slate-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">Mirror</p>
                    <p className="text-xs text-slate-500">Reflect edges</p>
                  </div>
                </label>
                <label className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  settings.bleedMethod === 'edge'
                    ? "border-blue-600 bg-blue-600/10"
                    : "border-slate-700 bg-slate-800/50"
                )}>
                  <RadioGroupItem value="edge" className="border-slate-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">Edge</p>
                    <p className="text-xs text-slate-500">Solid color</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Cut Lines Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-base text-slate-200">Show Cut Lines</Label>
                <p className="text-xs text-slate-500">Print guides for cutting</p>
              </div>
              <Switch
                checked={settings.showCutLines}
                onCheckedChange={(checked) =>
                  updateSettings({ showCutLines: checked })
                }
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </div>
        </ExpandableSection>

        {/* Image Quality Section */}
        <ExpandableSection
          title="Image Quality"
          icon={<div className="h-5 w-5 rounded bg-gradient-to-br from-blue-400 to-purple-500" />}
          expanded={expandedSections.includes('quality')}
          onToggle={() => toggleSection('quality')}
        >
          <div className="space-y-4">
            {/* High Quality Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-base text-slate-200">High Quality</Label>
                <p className="text-xs text-slate-500">Better quality, larger file</p>
              </div>
              <Switch
                checked={settings.imageQuality === 'high'}
                onCheckedChange={(checked) =>
                  updateSettings({ imageQuality: checked ? 'high' : 'low' })
                }
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            {/* Info box */}
            <div className="rounded-lg bg-slate-800/50 p-3 flex gap-3">
              <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">
                High quality uses 300 DPI images for crisp printing. 
                Low quality uses 150 DPI for faster downloads.
              </p>
            </div>
          </div>
        </ExpandableSection>

        {/* Offset Section */}
        <ExpandableSection
          title="Print Offset"
          icon={<div className="h-5 w-5 border border-slate-400 rounded flex items-center justify-center text-[8px] text-slate-400">+</div>}
          expanded={expandedSections.includes('offset')}
          onToggle={() => toggleSection('offset')}
        >
          <div className="space-y-6">
            <div className="rounded-lg bg-slate-800/50 p-3">
              <p className="text-xs text-slate-400">
                Adjust if your prints are misaligned. Use small values (±5mm) for fine-tuning.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-300">Horizontal Offset</Label>
                <span className="text-base font-bold text-blue-400">{settings.offsetX}mm</span>
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
                <Label className="text-sm text-slate-300">Vertical Offset</Label>
                <span className="text-base font-bold text-blue-400">{settings.offsetY}mm</span>
              </div>
              <Slider
                value={[settings.offsetY]}
                onValueChange={([value]) => updateSettings({ offsetY: value })}
                min={-20}
                max={20}
                step={0.5}
                className="py-2"
              />
            </div>
          </div>
        </ExpandableSection>

        {/* Export Section */}
        <ExpandableSection
          title="Export"
          icon={<Download className="h-5 w-5" />}
          expanded={expandedSections.includes('export')}
          onToggle={() => toggleSection('export')}
        >
          <div className="space-y-4">
            {/* Copy Card List Button */}
            <Button
              className="w-full h-12 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
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

            {/* Download PDF Button */}
            <Button
              className="w-full h-12 bg-blue-600 text-white hover:bg-blue-500"
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
            </Button>

            {items.length > 0 && (
              <p className="text-center text-xs text-slate-500">
                {totalCards} cards ready
              </p>
            )}
          </div>
        </ExpandableSection>

        {/* Reset Section */}
        <div className="p-4">
          <Button
            variant="outline"
            className="w-full h-12 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            onClick={() => setShowResetConfirm(true)}
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Reset All Settings
          </Button>
        </div>

        {/* Bottom padding for safe area */}
        <div className="h-8 safe-area-pb" />
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Reset Settings?</h3>
            <p className="text-sm text-slate-400 mb-4">
              This will reset all settings to their default values.
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 text-slate-400"
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
    </div>
  );
}
