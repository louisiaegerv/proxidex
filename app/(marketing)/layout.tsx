// Marketing layout - clean layout without app shell
import { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Header with theme toggle */}
      <header className="fixed top-0 right-0 z-50 p-4">
        <ThemeToggle />
      </header>
      
      {children}
      
      {/* Simple Footer */}
      <footer className=" border-t border-border py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-foreground font-bold text-lg mb-4">Proxidex</h3>
              <p className="text-muted-foreground text-sm">
                Free Pokémon TCG proxy generator. Create professional proxies for playtesting and casual games.
              </p>
            </div>
            <div>
              <h4 className="text-foreground font-semibold mb-4">Browse</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://app.proxidex.com" className="hover:text-foreground transition-colors">Deck Builder</a></li>
                <li><a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-foreground font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/guides/how-to-print" className="hover:text-foreground transition-colors">How to Print</a></li>
                <li><a href="/supplies" className="hover:text-foreground transition-colors">Recommended Supplies</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-foreground font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><span className="text-muted-foreground/60">Not affiliated with Nintendo or The Pokémon Company</span></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Proxidex. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
