'use client';

import { useState } from 'react';
import { Layers, Eye, Settings, Crown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProxyList } from '@/stores/proxy-list';
import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { StorageNotice } from '@/components/storage/storage-notice';
import { useSubscription } from '@/components/subscription-provider';

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
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const { subscription } = useSubscription();
  
  // Use subscription from context
  const isPro = subscription?.isPro ?? false;

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Fixed Header - with safe area padding for status bar */}
      <header className="shrink-0 border-b border-border bg-card/95 backdrop-blur-lg">
        <div 
          className="flex h-14 items-center justify-between px-4"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          {/* Logo with image */}
          <Link href="/" className="flex items-center gap-3">
            <img 
              src="/logo.webp" 
              alt="Proxidex" 
              className="h-12 w-12 rounded-lg"
              onError={(e) => {
                // Fallback to letter if image fails
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <h1 className="text-xl font-bold text-foreground">PROXI<span className='font-thin tracking-wide'>DEX</span></h1>
          </Link>
          
          {/* User Avatar / Sign In */}
          {isSignedIn && user ? (
            <Link 
              href="/account"
              className={`flex items-center rounded-full p-1 pr-2 transition-colors ${
                isPro 
                  ? "bg-gradient-to-r from-amber-500/20 to-amber-600/20 ring-1 ring-amber-500/50" 
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {/* Avatar with Pro badge */}
              <div className="relative">
                {user.imageUrl ? (
                  <img 
                    src={user.imageUrl} 
                    alt={user.fullName || "User"} 
                    className={`rounded-full ${isPro ? "h-8 w-8 ring-2 ring-amber-400/50" : "h-7 w-7"}`}
                  />
                ) : (
                  <div className={`flex items-center justify-center rounded-full bg-muted-foreground/30 text-xs font-medium text-foreground ${
                    isPro ? "h-8 w-8 ring-2 ring-amber-400/50" : "h-7 w-7"
                  }`}>
                    {user.firstName?.[0] || user.username?.[0] || "U"}
                  </div>
                )}
                
                {/* Pro Crown Badge */}
                {isPro && (
                  <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-lg shadow-amber-500/30">
                    <Crown className="h-2.5 w-2.5 text-white" fill="currentColor" />
                  </div>
                )}
              </div>
              
              {/* Pro Label */}
              {isPro && (
                <span className="ml-1.5 text-xs font-semibold text-amber-400">Pro</span>
              )}
            </Link>
          ) : (
            <Link 
              href="/auth/signin"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Storage Notice for Mobile */}
      <StorageNotice variant="inline" />

      {/* Scrollable Content Area - takes remaining space */}
      <main className="flex-1 overflow-hidden relative">
        {/* Deck View */}
        <div
          className={cn(
            'absolute inset-0 overflow-auto',
            activeView === 'deck' ? 'visible' : 'invisible pointer-events-none'
          )}
        >
          {deckSection}
        </div>

        {/* Preview View */}
        <div
          className={cn(
            'absolute inset-0 overflow-auto',
            activeView === 'preview' ? 'visible' : 'invisible pointer-events-none'
          )}
        >
          {previewSection}
        </div>

        {/* Settings View */}
        <div
          className={cn(
            'absolute inset-0 overflow-auto',
            activeView === 'settings' ? 'visible' : 'invisible pointer-events-none'
          )}
        >
          {settingsSection}
        </div>
      </main>

      {/* Fixed Bottom Tab Bar - with safe area padding for home indicator */}
      <nav 
        className="shrink-0 border-t border-border bg-card/95 backdrop-blur-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
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
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
      {isActive && (
        <div className="absolute bottom-1 h-1 w-6 rounded-full bg-primary" />
      )}
    </button>
  );
}
