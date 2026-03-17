'use client';

import { useState, useCallback } from 'react';
import { FileText, Trophy, Link, Plus, Trash2, Loader2 } from 'lucide-react';
import { parseDeckList, resolveDeckCards } from '@/lib/deck-parser';
import { useProxyList } from '@/stores/proxy-list';
import { getProcessedCardImage } from '@/lib/tcgdex';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { MetaDeckSelector } from '@/components/deck/meta-deck-selector';
import { DeckUrlImport } from '@/components/deck/deck-url-import';

export function MobileDeckSection() {
  const [activeTab, setActiveTab] = useState('decklist');
  const [deckText, setDeckText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearDeckListToo, setClearDeckListToo] = useState(false);
  const [lastImportedSource, setLastImportedSource] = useState('');

  const addItem = useProxyList((state) => state.addItem);
  const clearList = useProxyList((state) => state.clearList);
  const items = useProxyList((state) => state.items);
  const totalCards = useProxyList((state) => state.getTotalCards)();

  const handleProcessDeck = async () => {
    if (!deckText.trim()) return;

    setIsProcessing(true);
    setParseErrors([]);
    setProcessingStatus('Parsing deck list...');

    const parsedItems = parseDeckList(deckText);

    if (parsedItems.length === 0) {
      setParseErrors(['No valid cards found in deck list']);
      setIsProcessing(false);
      return;
    }

    setProcessingStatus(`Found ${parsedItems.length} unique cards, searching...`);

    const results = await resolveDeckCards(parsedItems);

    const errors: string[] = [];
    let addedCount = 0;

    for (const result of results) {
      if (result.card) {
        setProcessingStatus(`Processing ${result.card.name}...`);

        const processedImage = await getProcessedCardImage(
          result.card.image,
          'high'
        );

        addItem(
          {
            cardId: result.card.id,
            name: result.card.name,
            image: processedImage,
            originalImage: result.card.image,
            setName: result.card.set?.name || 'Unknown',
            setId: result.card.set?.id || '',
            localId: result.card.localId,
          },
          result.item.quantity
        );

        addedCount += result.item.quantity;
      } else {
        errors.push(`${result.item.cardName}: ${result.error || 'Not found'}`);
      }
    }

    setParseErrors(errors);
    setProcessingStatus(`Added ${addedCount} cards`);
    setIsProcessing(false);

    setTimeout(() => setProcessingStatus(''), 3000);
  };

  const handleClearClick = () => {
    if (items.length === 0 && !deckText.trim()) return;
    setClearDeckListToo(false);
    setShowClearDialog(true);
  };

  const handleClearConfirm = () => {
    clearList();
    if (clearDeckListToo) {
      setDeckText('');
      setParseErrors([]);
      setProcessingStatus('');
      setLastImportedSource('');
    }
    setShowClearDialog(false);
  };

  const handlePopulateText = useCallback((text: string, source: string) => {
    setDeckText(text);
    setLastImportedSource(source);
    setParseErrors([]);
    setProcessingStatus('');
    setActiveTab('decklist');
  }, []);

  const sampleDeck = `4 Charmander OBF 26
3 Charmeleon OBF 27
3 Charizard ex OBF 125
4 Arcanine ex OBF 224
2 Bidoof CRZ 111
2 Bibarel CRZ 112
2 Pidgey MEW 16
2 Pidgeotto MEW 17
2 Pidgeot ex OBF 164
4 Ultra Ball SVI 196
4 Rare Candy SVI 191
3 Boss's Orders PAL 172
3 Iono PAL 185
4 Nest Ball SVI 181`;

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/50 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-100">Deck</h1>
            <p className="text-xs text-slate-500">
              {items.length > 0 ? `${totalCards} cards in preview` : 'Add cards to get started'}
            </p>
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearClick}
              className="h-8 text-red-400 hover:bg-red-950/30 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-slate-800 px-4 pt-2">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 h-10">
            <TabsTrigger
              value="decklist"
              className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
            >
              <FileText className="h-4 w-4 mr-1" />
              List
            </TabsTrigger>
            <TabsTrigger
              value="meta"
              className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
            >
              <Trophy className="h-4 w-4 mr-1" />
              Meta
            </TabsTrigger>
            <TabsTrigger
              value="url"
              className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
            >
              <Link className="h-4 w-4 mr-1" />
              URL
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-hidden">
          {/* Deck List Tab - Simple textarea like desktop */}
          <TabsContent value="decklist" className="mt-0 h-full flex flex-col">
            <div className="flex-1 p-4 overflow-auto">
              <Textarea
                value={deckText}
                onChange={(e) => setDeckText(e.target.value)}
                placeholder={`Enter cards manually or import from Meta Decks / URL...

Examples:
4 Charmander OBF 26
3 Charizard ex OBF 125
Boss's Orders PAL 172  (defaults to 1)
Mew ex`}
                className="h-full min-h-[300px] resize-none border-slate-700 bg-slate-900/50 font-mono text-sm text-slate-100 placeholder:text-slate-600"
                disabled={isProcessing}
              />
            </div>

            {/* Status & Errors */}
            {(processingStatus || parseErrors.length > 0) && (
              <div className="px-4 pb-2 space-y-2">
                {processingStatus && (
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm',
                      isProcessing
                        ? 'bg-blue-900/30 text-blue-400'
                        : 'bg-green-900/30 text-green-400'
                    )}
                  >
                    {isProcessing && (
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    )}
                    {processingStatus}
                  </div>
                )}
                {parseErrors.length > 0 && (
                  <div className="max-h-32 overflow-auto rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400">
                    <div className="mb-1 font-semibold">Issues:</div>
                    {parseErrors.map((err, i) => (
                      <div key={i} className="truncate">{err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex-shrink-0 border-t border-slate-800 p-4 space-y-3 bg-slate-900/50">
              <Button
                className="w-full h-12 bg-blue-600 text-white hover:bg-blue-500 text-base"
                onClick={handleProcessDeck}
                disabled={isProcessing || !deckText.trim()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Add to Proxy List
                  </>
                )}
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 border-slate-700 text-slate-400"
                  onClick={() => {
                    setDeckText(sampleDeck);
                    setLastImportedSource('Sample');
                  }}
                  disabled={isProcessing}
                >
                  Load Sample
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Meta Decks Tab */}
          <TabsContent value="meta" className="mt-0 h-full">
            <MetaDeckSelector onPopulateText={handlePopulateText} />
          </TabsContent>

          {/* Import URL Tab */}
          <TabsContent value="url" className="mt-0 h-full">
            <DeckUrlImport onPopulateText={handlePopulateText} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Clear Cards</DialogTitle>
            <DialogDescription className="text-slate-400">
              Choose what you want to clear.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <button
              type="button"
              onClick={() => setClearDeckListToo(!clearDeckListToo)}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
                clearDeckListToo
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-slate-800 bg-slate-900/50'
              )}
            >
              <div>
                <p className="text-sm font-medium text-slate-200">Also clear deck text</p>
                <p className="text-xs text-slate-500">
                  {deckText.trim() ? 'Your imported/pasted deck text' : 'Text area is empty'}
                </p>
              </div>
              <div
                className={cn(
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border',
                  clearDeckListToo
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-slate-600 bg-slate-800'
                )}
              >
                {clearDeckListToo && <span className="text-xs text-green-400">✓</span>}
              </div>
            </button>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowClearDialog(false)}
              className="flex-1 text-slate-400"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearConfirm}
              className="flex-1 bg-red-600"
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
