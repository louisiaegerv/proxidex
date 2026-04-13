'use client';

import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import Image from 'next/image';
import { useRef, useEffect, useState } from 'react';
import type { HeroCard } from '@/lib/hero-cards';
import { cn } from '@/lib/utils';
import { RainbowButton } from '../ui/rainbow-button';
import { HexagonBackground } from '../animate-ui/components/backgrounds/hexagon';

interface HeroParallaxProps {
  cards: HeroCard[];
}

const LEFT_POSITIONS = [
  { top: '12%', left: '8%', rotate: -25, scale: 0.88, depth: 120 },
  { top: '32%', left: '20%', rotate: 18, scale: 1.0, depth: 180 },
  { top: '58%', left: '5%', rotate: -12, scale: 0.85, depth: 100 },
  { top: '78%', left: '18%', rotate: 22, scale: 0.95, depth: 140 },
];

const RIGHT_POSITIONS = [
  { top: '8%', right: '12%', rotate: 20, scale: 0.9, depth: 160 },
  { top: '28%', right: '5%', rotate: -15, scale: 1.0, depth: 200 },
  { top: '52%', right: '18%', rotate: 12, scale: 0.88, depth: 120 },
  { top: '72%', right: '8%', rotate: -20, scale: 0.92, depth: 150 },
];

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function HeroParallax({ cards }: HeroParallaxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const [selectedCards, setSelectedCards] = useState<HeroCard[]>(() => cards.slice(0, 8));
  const [effectMap, setEffectMap] = useState<Record<number, 'prismatic' | 'stardust' | null>>(() => ({
    0: null, 1: null, 2: null, 3: null,
    4: null, 5: null, 6: null, 7: null,
  }));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSelectedCards(shuffleArray(cards).slice(0, 8));
    const left = shuffleArray([0, 1, 2, 3]);
    const right = shuffleArray([4, 5, 6, 7]);
    setEffectMap({
      [left[0]]: 'prismatic',
      [left[1]]: 'stardust',
      [left[2]]: null,
      [left[3]]: null,
      [right[0]]: 'prismatic',
      [right[1]]: 'stardust',
      [right[2]]: null,
      [right[3]]: null,
    });
    setIsReady(true);
  }, [cards]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    mouseX.set((e.clientX - centerX) / (rect.width / 2));
    mouseY.set((e.clientY - centerY) / (rect.height / 2));
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const leftCards = selectedCards.slice(0, 4);
  const rightCards = selectedCards.slice(4, 8);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen flex items-center justify-center md:mb-20"
      style={{ perspective: '1000px' }}
    >
      <HexagonBackground className="absolute inset-0 flex items-center justify-center rounded-xl" />
      <style>{`
        @keyframes prismatic-sweep {
          0% { background-position: 0 0; }
          100% { background-position: 200% 200%; }
        }
        @keyframes prismatic-sheen {
          0% { background-position: 0 0; }
          100% { background-position: 100% 100%; }
        }
      `}</style>

      {/* Background accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-lg blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-lg blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Left Cards */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[50%] pointer-events-none hidden lg:block transition-opacity duration-500", isReady ? "opacity-100" : "opacity-0")}>
        <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
          {leftCards.map((card, i) => (
            <ParallaxCard
              key={`left-${i}-${card.id}`}
              card={card}
              position={LEFT_POSITIONS[i]}
              mouseX={smoothX}
              mouseY={smoothY}
              index={i}
              effect={effectMap[i]}
            />
          ))}
        </div>
      </div>

      {/* Center Content - The Hook */}
      <div className="relative z-20 text-center px-4 max-w-3xl mx-auto">

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-6xl font-bold mb-6 tracking-tight leading-tight"
        >
          <span className="text-foreground capitalize">Your next favorite deck is <br/><span className='text-primary'>one print away.</span></span>
        </motion.h1>

        {/* Subheadline - The Value Prop */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.0 }}
          className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto"
        >
          Stop watching from the sidelines. Import a deck from the current meta with one click and be shuffling up in minutes.
        </motion.p>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 4.0 }}
          className="mb-6"
        >
          <a
            href="https://app.proxidex.com"
            className="inline-flex items-center font-bold transition-all hover:scale-105"
          >
            <RainbowButton className='text-white dark:text-black text-lg' size={'lg'}>
              Print Your Unbeatable Deck
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </RainbowButton>
          </a>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 5.0 }}
          className="flex flex-col items-center justify-center gap-6 text-sm font-bold md:tracking-wide capitalize"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            One-click LimitlessTCG import
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Bleed Edge Extension
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            450+ DPI quality
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Free forever
          </span>
        </motion.div>
      </div>

      {/* Right Cards */}
      <div className={cn("absolute right-0 top-0 bottom-0 w-[50%] pointer-events-none hidden lg:block transition-opacity duration-500", isReady ? "opacity-100" : "opacity-0")}>
        <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
          {rightCards.map((card, i) => (
            <ParallaxCard
              key={`right-${i}-${card.id}`}
              card={card}
              position={RIGHT_POSITIONS[i]}
              mouseX={smoothX}
              mouseY={smoothY}
              index={i + 4}
              effect={effectMap[i + 4]}
            />
          ))}
        </div>
      </div>

      {/* Mobile fallback - 1 card in each corner */}
      <div className="absolute inset-0 pointer-events-none lg:hidden opacity-60">
        {selectedCards.slice(0, 4).map((card, i) => {
          const corners = [
            { top: '5%', left: '4%', rotate: -15 },
            { bottom: '5%', left: '4%', rotate: 12 },
            { top: '5%', right: '4%', rotate: 15 },
            { bottom: '5%', right: '4%', rotate: -12 },
          ];
          const pos = corners[i];
          const { rotate, ...style } = pos as { rotate: number; top?: string; left?: string; right?: string; bottom?: string };
          return (
            <div
              key={`mobile-${card.id}`}
              className="absolute"
              style={{
                ...style,
                transform: `rotate(${rotate}deg)`,
              }}
            >
              <Image
                src={card.imageUrl}
                alt={card.name}
                width={110}
                height={154}
                className="rounded-lg shadow-xl"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ParallaxCardProps {
  card: HeroCard;
  position: {
    top: string;
    left?: string;
    right?: string;
    rotate: number;
    scale: number;
    depth: number;
  };
  mouseX: ReturnType<typeof useSpring>;
  mouseY: ReturnType<typeof useSpring>;
  index: number;
  effect?: 'prismatic' | 'stardust' | null;
}

function ParallaxCard({ card, position, mouseX, mouseY, index, effect }: ParallaxCardProps) {
  const moveX = useTransform(mouseX, [-1, 1], [-position.depth / 3, position.depth / 3]);
  const moveY = useTransform(mouseY, [-1, 1], [-position.depth / 4, position.depth / 4]);
  const rotateX = useTransform(mouseY, [-1, 1], [3, -3]);
  const rotateY = useTransform(mouseX, [-1, 1], [-3, 3]);

  const side = position.left !== undefined ? 'left' : 'right';

  return (
    <motion.div
      className="absolute"
      style={{
        top: position.top,
        [side]: position[side],
        x: moveX,
        y: moveY,
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        zIndex: position.depth,
      }}
      initial={{ opacity: 0, y: 80, rotate: position.rotate - 15, scale: position.scale * 0.9 }}
      animate={{ opacity: 1, y: 0, rotate: position.rotate, scale: position.scale }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      <div
        className="relative rounded-xl overflow-hidden shadow-2xl"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', transform: `translateZ(${position.depth}px)` }}
      >
        <Image
          src={card.imageUrl}
          alt={card.name}
          width={220}
          height={308}
          className="block"
          priority={index < 4}
        />
        {effect === 'prismatic' && <PrismaticOverlay />}
        {effect === 'stardust' && <StardustCanvas width={220} height={308} />}
      </div>
    </motion.div>
  );
}

function PrismaticOverlay() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-xl"
        style={{
          background: `repeating-linear-gradient(
            120deg,
            hsl(0, 100%, 65%) 0%,
            hsl(40, 100%, 65%) 5%,
            hsl(80, 100%, 65%) 10%,
            hsl(140, 100%, 65%) 16%,
            hsl(195, 100%, 65%) 22%,
            hsl(250, 100%, 65%) 28%,
            hsl(300, 100%, 65%) 34%,
            hsl(350, 100%, 65%) 40%,
            hsl(0, 100%, 65%) 46%
          )`,
          backgroundSize: '280% 280%',
          mixBlendMode: 'screen',
          opacity: 0.42,
          animation: 'prismatic-sweep 3.8s linear infinite',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-xl"
        style={{
          background: `linear-gradient(
            132deg,
            transparent 10%,
            rgba(255,255,255,.30) 47%,
            rgba(255,255,255,.06) 56%,
            transparent 92%
          )`,
          backgroundSize: '260% 260%',
          mixBlendMode: 'overlay',
          animation: 'prismatic-sheen 2.4s ease-in-out infinite alternate',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-xl"
        style={{
          mixBlendMode: 'overlay',
          background: `
            repeating-linear-gradient(0deg, rgba(255,255,255,.045) 0, rgba(255,255,255,.045) 1px, transparent 1px, transparent 5px),
            repeating-linear-gradient(90deg, rgba(255,255,255,.045) 0, rgba(255,255,255,.045) 1px, transparent 1px, transparent 5px)
          `,
        }}
      />
    </>
  );
}

function StardustCanvas({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const context = ctx;

    const W = width;
    const H = height;
    const pts = Array.from({ length: 160 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.9 + 0.35,
      h: Math.random() * 360,
      s: Math.random() * 1.9 + 0.7,
      p: Math.random() * Math.PI * 2,
      star: Math.random() < 0.28,
    }));

    function drawStar(x: number, y: number, r: number) {
      context.beginPath();
      context.moveTo(x, y - r * 3);
      context.lineTo(x + r * 0.42, y - r * 0.42);
      context.lineTo(x + r * 3, y);
      context.lineTo(x + r * 0.42, y + r * 0.42);
      context.lineTo(x, y + r * 3);
      context.lineTo(x - r * 0.42, y + r * 0.42);
      context.lineTo(x - r * 3, y);
      context.lineTo(x - r * 0.42, y - r * 0.42);
      context.closePath();
      context.fill();
    }

    let rafId: number;
    function tick(ts: number) {
      context.clearRect(0, 0, W, H);
      const t = ts / 1000;

      pts.forEach((p) => {
        const alpha = (Math.sin(t * p.s + p.p) + 1) / 2;
        if (alpha < 0.04) return;

        const hue = (p.h + t * 22) % 360;
        context.globalAlpha = alpha * 0.92;
        context.fillStyle = `hsl(${hue}, 100%, 88%)`;

        if (p.star) {
          drawStar(p.x, p.y, p.r);
        } else {
          context.beginPath();
          context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          context.fill();
        }

        context.globalAlpha = alpha * 0.12;
        context.beginPath();
        context.arc(p.x, p.y, p.r * 3.8, 0, Math.PI * 2);
        context.fill();
      });

      context.globalAlpha = 1;
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0 z-10 rounded-xl"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
