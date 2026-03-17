'use client';

import { useState } from 'react';
import { Layers, Eye, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProxyList } from '@/stores/proxy-list';

// Mobile view types
type MobileView = 'deck' | 'preview' | 'settings';

interface MobileLayoutProps {
  deckSection: React.ReactNode;
  previewSection: React.ReactNode;
  settingsSection: React.ReactNode;
}

export function MobileLayout({ deckSection, previewSection, settingsSection }: MobileLayoutProps) {
  const [activeView, setActiveView] = useState<MobileView>('deck');
  const itemCount = useProxyList((state) => state.getTotalCards());

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* Deck View */}
        <div
          className={cn(
            'h-full w-full',
            activeView === 'deck' ? 'block' : 'hidden'
          )}
        >
          {deckSection}
        </div>

        {/* Preview View */}
        <div
          className={cn(
            'h-full w-full',
            activeView === 'preview' ? 'block' : 'hidden'
          )}
        >
          {previewSection}
        </div>

        {/* Settings View */}
        <div
          className={cn(
            'h-full w-full',
            activeView === 'settings' ? 'block' : 'hidden'
          )}
        >
          {settingsSection}
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <nav className="flex-shrink-0 border-t border-slate-800 bg-slate-900/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex h-16 items-center justify-around px-2">
          <TabButton
            view="deck"
            activeView={activeView}
            onClick={setActiveView}
            icon={<Layers className="h-6 w-6" />}
            label="Deck"
            badge={itemCount > 0 ? itemCount : undefined}
          />
          <TabButton
            view="preview"
            activeView={activeView}
            onClick={setActiveView}
            icon={<Eye className="h-6 w-6" />}
            label="Preview"
          />
          <TabButton
            view="settings"
            activeView={activeView}
            onClick={setActiveView}
            icon={<Settings className="h-6 w-6" />}
            label="Settings"
          />
        </div>
      </nav>
    </div>
  );
}

interface TabButtonProps {
  view: MobileView;
  activeView: MobileView;
  onClick: (view: MobileView) => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function TabButton({ view, activeView, onClick, icon, label, badge }: TabButtonProps) {
  const isActive = view === activeView;

  return (
    <button
      onClick={() => onClick(view)}
      className={cn(
        'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[72px] relative',
        isActive
          ? 'text-blue-400 bg-blue-500/10'
          : 'text-slate-500 hover:text-slate-300'
      )}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
      {isActive && (
        <div className="absolute bottom-1 h-1 w-6 rounded-full bg-blue-500" />
      )}
    </button>
  );
}
