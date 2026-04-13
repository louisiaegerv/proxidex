import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { SubscriptionProvider } from "@/components/subscription-provider";
import { ThemeProvider } from "@/components/theme-provider"
import { SparklesCore } from "../components/ui/sparkles";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proxidex - Free Pokémon Card Proxy Generator",
  description: "Search, browse, and create free proxies of any Pokémon card. 20,000+ cards available. Perfect for playtesting and casual games.",
  keywords: ["pokemon proxy", "pokemon tcg", "card proxy", "deck testing", "pokemon cards"],
  openGraph: {
    title: "Proxidex - Free Pokémon Card Proxy Generator",
    description: "Create professional-quality Pokémon card proxies for free",
    type: "website",
  },
};

// Viewport configuration for mobile safe areas
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#020617',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en"
      suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
        >
          <div className="relative z-10 min-h-screen">
            <SubscriptionProvider>
              <ThemeProvider>{children}</ThemeProvider>
            </SubscriptionProvider>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
