import { HeroParallax } from "@/components/landing/HeroParallax";
import { HERO_CARDS } from "@/lib/hero-cards";
import MarketingLayout from "@/app/(marketing)/layout";
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars";
import { cn } from "@/lib/utils";
import { HexagonBackground } from '@/components/animate-ui/components/backgrounds/hexagon';


export const dynamic = "force-static";

export default function LandingPage() {
  return (
    <MarketingLayout>
      <main className="min-h-screen">
        

        {/* <StarsBackground
          // starColor={resolvedTheme === 'dark' ? '#FFF' : '#000'}
          className={cn('absolute inset-0 flex items-center justify-center rounded-xl', 
            // 'dark:bg-[radial-gradient(ellipse_at_bottom,_#262626_0%,_#000_100%)] bg-[radial-gradient(ellipse_at_bottom,_#f5f5f5_0%,_#fff_100%)]',
          )}/> */}
        <HeroParallax cards={HERO_CARDS} />
      </main>
    </MarketingLayout>
  );
}
