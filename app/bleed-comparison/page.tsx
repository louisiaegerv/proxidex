'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Download, Printer, Upload, Sparkles, Copy, FlipHorizontal, StretchHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardWithBleed } from '@/components/card-with-bleed';
import { PrintSheet } from '@/components/print-sheet';
import type { BleedMethod } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Sample card images for demonstration
const SAMPLE_CARDS = [
  {
    id: 'sample-1',
    cardId: 'sample-1',
    name: 'Charizard ex',
    image: 'https://assets.tcgdex.net/en/sv/sv03/125',
    setName: 'Obsidian Flames',
    setId: 'sv03',
    localId: '125',
    quantity: 1,
    variant: 'normal' as const,
  },
  {
    id: 'sample-2',
    cardId: 'sample-2',
    name: 'Pikachu',
    image: 'https://assets.tcgdex.net/en/sv/sv01/042',
    setName: 'Scarlet & Violet',
    setId: 'sv01',
    localId: '042',
    quantity: 1,
    variant: 'normal' as const,
  },
  {
    id: 'sample-3',
    cardId: 'sample-3',
    name: 'Mew ex',
    image: 'https://assets.tcgdex.net/en/sv/sv04/053',
    setName: 'Paldean Fates',
    setId: 'sv04',
    localId: '053',
    quantity: 1,
    variant: 'normal' as const,
  },
];

interface BleedResult {
  method: BleedMethod;
  imageUrl: string;
  isLoading: boolean;
  error?: string;
}

export default function BleedComparisonPage() {
  const [selectedCard, setSelectedCard] = useState(SAMPLE_CARDS[0]);
  const [bleedMm, setBleedMm] = useState(5);
  const [activeTab, setActiveTab] = useState<'single' | 'grid'>('single');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<{ r: number; g: number; b: number } | undefined>(undefined);
  const [suggestedColor, setSuggestedColor] = useState<{ r: number; g: number; b: number } | undefined>(undefined);
  const [bleedResults, setBleedResults] = useState<Record<BleedMethod, BleedResult>>({
    replicate: { method: 'replicate', imageUrl: '', isLoading: false },
    mirror: { method: 'mirror', imageUrl: '', isLoading: false },
    edge: { method: 'edge', imageUrl: '', isLoading: false },
  });
  
  // Processed image with corners extended (mandatory preprocessing)
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isProcessingCorners, setIsProcessingCorners] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const rawImageUrl = uploadedImage || `${selectedCard.image}/high.png`;
  // Use corner-processed image if available, otherwise fall back to raw
  const currentImageUrl = processedImageUrl || rawImageUrl;

  // Process corners when raw image changes (mandatory preprocessing)
  useEffect(() => {
    const processCorners = async () => {
      // Skip if it's already a data URL (already processed)
      if (rawImageUrl.startsWith('data:')) {
        setProcessedImageUrl(rawImageUrl);
        return;
      }
      
      setIsProcessingCorners(true);
      try {
        const response = await fetch('/api/process-corners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: rawImageUrl }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setProcessedImageUrl(data.image);
        } else {
          // Fallback to raw image if processing fails
          setProcessedImageUrl(null);
        }
      } catch (err) {
        console.error('Failed to process corners:', err);
        setProcessedImageUrl(null);
      } finally {
        setIsProcessingCorners(false);
      }
    };
    
    processCorners();
  }, [rawImageUrl]);

  // Fetch suggested color when image changes
  useEffect(() => {
    const fetchSuggestedColor = async () => {
      try {
        const response = await fetch(`/api/generate-bleed?imageUrl=${encodeURIComponent(rawImageUrl)}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestedColor(data.color);
          if (!selectedColor) {
            setSelectedColor(data.color);
          }
        }
      } catch (err) {
        console.error('Failed to fetch suggested color:', err);
      }
    };
    fetchSuggestedColor();
  }, [rawImageUrl, selectedColor]);

  const generateBleedForMethod = useCallback(async (method: BleedMethod) => {
    setBleedResults((prev) => ({
      ...prev,
      [method]: { ...prev[method], isLoading: true, error: undefined },
    }));

    try {
      const body: { imageUrl: string; method: BleedMethod; bleedMm: number; colorR?: number; colorG?: number; colorB?: number } = {
        imageUrl: currentImageUrl,
        method,
        bleedMm,
      };
      
      // Include selected color for replicate method
      if (method === 'replicate' && selectedColor) {
        body.colorR = selectedColor.r;
        body.colorG = selectedColor.g;
        body.colorB = selectedColor.b;
      }

      const response = await fetch('/api/generate-bleed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate bleed');
      }

      const data = await response.json();
      setBleedResults((prev) => ({
        ...prev,
        [method]: { ...prev[method], imageUrl: data.image, isLoading: false },
      }));
    } catch (err) {
      console.error(`Error generating ${method} bleed:`, err);
      setBleedResults((prev) => ({
        ...prev,
        [method]: {
          ...prev[method],
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to generate',
        },
      }));
    }
  }, [currentImageUrl, bleedMm, selectedColor]);

  const generateAllBleeds = useCallback(async () => {
    await Promise.all([
      generateBleedForMethod('replicate'),
      generateBleedForMethod('mirror'),
      generateBleedForMethod('edge'),
    ]);
  }, [generateBleedForMethod]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadPNG = async (method: BleedMethod) => {
    const result = bleedResults[method];
    if (!result.imageUrl) return;

    const link = document.createElement('a');
    link.href = result.imageUrl;
    link.download = `card-bleed-${method}-${bleedMm}mm.png`;
    link.click();
  };

  const downloadPDF = async () => {
    if (!printRef.current) return;

    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'letter');
    const pageWidth = 216;
    const pageHeight = 279;

    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.save(`print-sheet-${bleedMm}mm-bleed.pdf`);
  };

  const methodConfig = {
    replicate: {
      label: 'Solid Color',
      icon: Copy,
      description: 'Extends canvas with selected border color',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    mirror: {
      label: 'Mirror',
      icon: FlipHorizontal,
      description: 'Mirrors edge pixels outward',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    edge: {
      label: 'Edge Stretch',
      icon: StretchHorizontal,
      description: 'Stretches the 1px outermost border outward',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-100">Card Bleed Comparison</h1>
          <p className="text-slate-400">
            Compare different canvas extension methods for print bleed areas
          </p>
          <p className="text-xs text-slate-500">
            Note: All images automatically have their transparent corners pre-processed before bleed methods are applied
          </p>
        </div>

        {/* Controls */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {/* Card Selection */}
            <div className="space-y-3">
              <Label className="text-slate-300">Card</Label>
              <div className="flex gap-2">
                <select
                  value={selectedCard.id}
                  onChange={(e) => {
                    const card = SAMPLE_CARDS.find((c) => c.id === e.target.value);
                    if (card) {
                      setSelectedCard(card);
                      setUploadedImage(null);
                    }
                  }}
                  className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  disabled={!!uploadedImage}
                >
                  {SAMPLE_CARDS.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
                <label className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4" />
                    </span>
                  </Button>
                </label>
              </div>
              {uploadedImage && (
                <p className="text-xs text-emerald-400">Custom image uploaded</p>
              )}
              {isProcessingCorners && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  Processing corners...
                </p>
              )}
            </div>

            {/* Bleed Width Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Bleed Width</Label>
                <span className="text-sm text-slate-500">{bleedMm}mm</span>
              </div>
              <Slider
                value={[bleedMm]}
                onValueChange={([value]) => setBleedMm(value)}
                min={0}
                max={5}
                step={0.5}
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0mm</span>
                <span>2.5mm</span>
                <span>5mm</span>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                onClick={generateAllBleeds}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate All Methods
              </Button>
            </div>

            {/* Color Picker (for Replicate) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Bleed Color</Label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={selectedColor ? 
                    `#${selectedColor.r.toString(16).padStart(2, '0')}${selectedColor.g.toString(16).padStart(2, '0')}${selectedColor.b.toString(16).padStart(2, '0')}` 
                    : '#000000'}
                  onChange={(e) => {
                    const hex = e.target.value;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    setSelectedColor({ r, g, b });
                  }}
                  className="h-10 w-10 rounded border border-slate-600 bg-transparent cursor-pointer"
                />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">
                    {selectedColor 
                      ? `RGB(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`
                      : 'Loading...'}
                  </p>
                  {suggestedColor && (
                    <button
                      onClick={() => setSelectedColor(suggestedColor)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 mt-1"
                    >
                      Reset to suggested (auto-detected)
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500">For Solid Color method (5px border sample)</p>
            </div>

            {/* Download Buttons */}
            <div className="flex items-end gap-2">
              <Button
                onClick={downloadPDF}
                variant="outline"
                className="flex-1 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                disabled={!Object.values(bleedResults).some((r) => r.imageUrl)}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print PDF
              </Button>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'single' | 'grid')}>
          <TabsList className="border-slate-800 bg-slate-900">
            <TabsTrigger
              value="single"
              className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
            >
              Single Card Comparison
            </TabsTrigger>
            <TabsTrigger
              value="grid"
              className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
            >
              Print Grid Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Single Card Comparison View */}
        {activeTab === 'single' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {(Object.keys(methodConfig) as BleedMethod[]).map((method) => {
              const config = methodConfig[method];
              const result = bleedResults[method];
              const Icon = config.icon;

              return (
                <div
                  key={method}
                  className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden"
                >
                  {/* Method Header */}
                  <div className={`flex items-center gap-3 border-b border-slate-800 p-4 ${config.bgColor}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <div>
                      <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
                      <p className="text-xs text-slate-400">{config.description}</p>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="p-6">
                    <div className="flex justify-center">
                      {result.isLoading ? (
                        <div className="flex h-64 w-48 items-center justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500" />
                        </div>
                      ) : result.error ? (
                        <div className="flex h-64 w-48 items-center justify-center rounded-lg bg-red-900/20 p-4">
                          <p className="text-center text-sm text-red-400">{result.error}</p>
                        </div>
                      ) : result.imageUrl ? (
                        <div className="relative">
                          <CardWithBleed
                            imageUrl={currentImageUrl}
                            name={selectedCard.name}
                            bleedMm={bleedMm}
                            method={method}
                            showTrimLines={true}
                            bleedImageUrl={result.imageUrl}
                            bleedColor={method === 'replicate' ? selectedColor : undefined}
                          />
                        </div>
                      ) : (
                        <div className="flex h-64 w-48 items-center justify-center rounded-lg border-2 border-dashed border-slate-700">
                          <p className="text-sm text-slate-500">Click Generate to preview</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer with specs */}
                  <div className="border-t border-slate-800 bg-slate-900/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        <p>Card: 63×88mm</p>
                        <p>Canvas: {63 + bleedMm * 2}×{88 + bleedMm * 2}mm</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                        onClick={() => downloadPNG(method)}
                        disabled={!result.imageUrl}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        PNG
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Print Grid View */}
        {activeTab === 'grid' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-200">Print Grid Preview</h3>
              <p className="mb-4 text-sm text-slate-400">
                Shows how cards would be arranged on a print sheet with {bleedMm}mm bleed.
                Red dotted lines indicate trim lines (63mm×88mm boundaries).
              </p>
              
              <div className="flex justify-center overflow-auto py-4" ref={printRef}>
                <PrintSheet
                  cards={SAMPLE_CARDS}
                  cardsPerRow={3}
                  rowsPerPage={3}
                  bleedMm={bleedMm}
                  gapMm={bleedMm * 2} // Gap equals bleed on both sides
                  bleedMethod="replicate"
                  showCutLines={true}
                  showTrimLines={true}
                  pageSize="letter"
                  bleedImages={{
                    'sample-1': bleedResults.replicate.imageUrl,
                    'sample-2': bleedResults.replicate.imageUrl,
                    'sample-3': bleedResults.replicate.imageUrl,
                  }}
                  maxPreviewWidth={700}
                />
              </div>
            </div>

            {/* Comparison Grid - All Methods */}
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-200">Side-by-Side Grid Comparison</h3>
              <div className="grid gap-6 lg:grid-cols-3">
                {(Object.keys(methodConfig) as BleedMethod[]).map((method) => {
                  const config = methodConfig[method];
                  const Icon = config.icon;

                  return (
                    <div key={method} className="space-y-3">
                      <div className={`flex items-center gap-2 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <div className="flex justify-center rounded-lg border border-slate-800 bg-slate-950 p-4">
                        <PrintSheet
                          cards={[selectedCard]}
                          cardsPerRow={1}
                          rowsPerPage={1}
                          bleedMm={bleedMm}
                          gapMm={0}
                          bleedMethod={method}
                          showCutLines={true}
                          showTrimLines={true}
                          pageSize="letter"
                          bleedImages={{
                            [selectedCard.cardId]: bleedResults[method].imageUrl,
                          }}
                          maxPreviewWidth={200}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Technical Details */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-200">Technical Details</h3>
          <div className="grid gap-4 text-sm text-slate-400 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium text-slate-300">Solid Color Method</h4>
              <p>
                Samples the outer 5px border of the image to suggest a color, but allows you to
                pick any color using the color picker. Uses Sharp&apos;s <code>extend</code> with 
                the selected color as the background.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-slate-300">Mirror Method</h4>
              <p>
                Extracts edge strips from each side, flips them horizontally/vertically,
                and composites them onto a new canvas. Corners are handled by flipping both axes.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-slate-300">Edge Stretch Method</h4>
              <p>
                Extracts the 1px outermost border and stretches it outward using nearest-neighbor
                interpolation (pixel repetition). This creates clean, sharp edges identical to
                canvas drawImage scaling. Corners are filled by stretching the corner pixel.
              </p>
            </div>
          </div>
          
          <div className="mt-6 border-t border-slate-800 pt-4">
            <h4 className="mb-2 font-medium text-slate-300">Canvas Extension Strategy</h4>
            <pre className="overflow-x-auto rounded bg-slate-950 p-4 text-xs text-slate-400">
{`// Grid cell is the trim size (63mm × 88mm)
// Canvas extends bleed amount on each side
<div className="relative w-[63mm] h-[88mm]">
  <canvas 
    className="absolute -top-[bleedMm]mm -left-[bleedMm]mm"
    style={{ width: '${63 + bleedMm * 2}mm', height: '${88 + bleedMm * 2}mm' }}
  />
  {/* Trim lines drawn at canvas edges */}
</div>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
