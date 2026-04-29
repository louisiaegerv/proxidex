import { HeroParallax } from "@/components/landing/HeroParallax"
import { HERO_CARDS } from "@/lib/hero-cards"
import MarketingLayout from "@/app/(marketing)/layout"
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars"
import { cn } from "@/lib/utils"
import { HexagonBackground } from "@/components/animate-ui/components/backgrounds/hexagon"

export const dynamic = "force-static"

export default function LandingPage() {
  return (
    <MarketingLayout>
      <main>
        <HeroParallax cards={HERO_CARDS} />
      </main>
    </MarketingLayout>
  )
}
