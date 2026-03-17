'use client';

import { Settings2, RotateCcw } from 'lucide-react';
import { useProxyList } from '@/stores/proxy-list';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function PrintSettings() {
  const { settings, updateSettings, resetSettings } = useProxyList();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Print Settings
        </Button>
      </SheetTrigger>
      <SheetContent className="border-slate-800 bg-slate-900">
        <SheetHeader>
          <SheetTitle className="text-slate-100">Print Settings</SheetTitle>
          <SheetDescription className="text-slate-500">
            Customize your PDF output settings
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Page Size */}
          <div className="space-y-2">
            <Label className="text-slate-300">Page Size</Label>
            <Select
              value={settings.pageSize}
              onValueChange={(value: 'letter' | 'a4') =>
                updateSettings({ pageSize: value })
              }
            >
              <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900">
                <SelectItem
                  value="letter"
                  className="text-slate-100 focus:bg-slate-800"
                >
                  Letter (8.5" × 11")
                </SelectItem>
                <SelectItem
                  value="a4"
                  className="text-slate-100 focus:bg-slate-800"
                >
                  A4 (210mm × 297mm)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cards Per Row */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Cards Per Row</Label>
              <span className="text-sm text-slate-500">
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
            />
          </div>

          {/* Rows Per Page */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Rows Per Page</Label>
              <span className="text-sm text-slate-500">
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
            />
          </div>

          {/* Gap Between Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Gap Between Cards</Label>
              <span className="text-sm text-slate-500">{settings.gap}mm</span>
            </div>
            <Slider
              value={[settings.gap]}
              onValueChange={([value]) => updateSettings({ gap: value })}
              min={0}
              max={10}
              step={0.5}
            />
          </div>

          {/* Bleed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Bleed Area</Label>
              <span className="text-sm text-slate-500">
                {settings.bleed}mm
              </span>
            </div>
            <Slider
              value={[settings.bleed]}
              onValueChange={([value]) => updateSettings({ bleed: value })}
              min={0}
              max={5}
              step={0.5}
            />
            <p className="text-xs text-slate-500">
              Extra border area for clean cutting
            </p>
          </div>

          {/* Cut Lines */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-slate-300">Show Cut Lines</Label>
              <p className="text-xs text-slate-500">
                Print guides for easy cutting
              </p>
            </div>
            <Switch
              checked={settings.showCutLines}
              onCheckedChange={(checked) =>
                updateSettings({ showCutLines: checked })
              }
            />
          </div>

          {/* Image Quality */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-slate-300">High Quality Images</Label>
              <p className="text-xs text-slate-500">
                Better quality but larger file size
              </p>
            </div>
            <Switch
              checked={settings.imageQuality === 'high'}
              onCheckedChange={(checked) =>
                updateSettings({ imageQuality: checked ? 'high' : 'low' })
              }
            />
          </div>

          {/* Reset Button */}
          <Button
            variant="outline"
            className="w-full border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            onClick={resetSettings}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
