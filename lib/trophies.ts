/**
 * Proxidex Trophy Case Definitions
 *
 * Metal Pokemon cards as collectible trophies that users unlock through:
 * 1. Tier purchases (Founding Trainer, Champion, Gym Leader)
 * 2. One-off achievements
 * 3. Tiered progression tracks (Deck Builder, Searcher, Exporter, Importer, Logins)
 */

import { TROPHY_MEDIA } from "./trophy-media"

export type TrophyRarity = "common" | "uncommon" | "rare" | "holo" | "legendary"
export type TrophyCategory = "tier" | "achievement"
export type TrophyTrack = "deck_builder" | "searcher" | "exporter" | "importer" | "logins"

export interface TrophyDefinition {
  id: string
  name: string
  description: string
  category: TrophyCategory
  rarity: TrophyRarity
  image: string
  condition: string
  // For tier trophies: which subscription tier unlocks it
  tier?: string
  // For achievement trophies: how many actions needed
  target?: number
  // For tiered track trophies: which track they belong to
  track?: TrophyTrack
  // Optional video URLs (thumbnail = 360p, detail = 720p)
  video?: {
    thumbnail: string
    detail: string
  }
}

// ============================================================================
// TIER TROPHIES (Unlocked by purchasing a subscription)
// ============================================================================

export const TIER_TROPHIES: TrophyDefinition[] = [
  {
    id: "founding_alpha",
    name: "Founding Trainer Alpha",
    description:
      "One of the first 100 believers. A gold commemorative trophy for early supporters.",
    category: "tier",
    rarity: "legendary",
    image: TROPHY_MEDIA.Pikachu1.image,
    condition: "Purchase Founding Trainer Alpha tier",
    tier: "founding_alpha",
    video: TROPHY_MEDIA.Pikachu1.video,
  },
  {
    id: "founding_beta",
    name: "Founding Trainer Beta",
    description:
      "One of the first 250 supporters. A silver commemorative trophy.",
    category: "tier",
    rarity: "legendary",
    image: TROPHY_MEDIA.Lugia.image,
    condition: "Purchase Founding Trainer Beta tier",
    tier: "founding_beta",
    video: TROPHY_MEDIA.Lugia.video,
  },
  {
    id: "founding_gamma",
    name: "Founding Trainer Gamma",
    description:
      "One of the first 500 supporters. A bronze commemorative trophy.",
    category: "tier",
    rarity: "legendary",
    image: TROPHY_MEDIA.Charizard.image,
    condition: "Purchase Founding Trainer Gamma tier",
    tier: "founding_gamma",
    video: TROPHY_MEDIA.Charizard.video,
  },
  {
    id: "champion",
    name: "Champion",
    description:
      "Lifetime access to Proxidex. A purple-gold trophy for true Champions.",
    category: "tier",
    rarity: "holo",
    image: TROPHY_MEDIA.Rayquaza.image,
    condition: "Purchase Champion (Lifetime) tier",
    tier: "lifetime",
    video: TROPHY_MEDIA.Rayquaza.video,
  },
  {
    id: "gym_leader",
    name: "Gym Leader",
    description:
      "Annual Season Pass holder. A blue-silver trophy for dedicated Gym Leaders.",
    category: "tier",
    rarity: "holo",
    image: TROPHY_MEDIA.Tyranitar.image,
    condition: "Purchase Gym Leader (Annual) tier",
    tier: "annual",
    video: TROPHY_MEDIA.Tyranitar.video,
  },
]

// ============================================================================
// TIER CASCADE: Higher subscription tiers unlock lower tier trophies
// ============================================================================

export const TIER_CASCADE_MAP: Record<string, string[]> = {
  founding_alpha: ["founding_alpha", "founding_beta", "founding_gamma", "lifetime", "annual"],
  founding_beta:  ["founding_beta", "founding_gamma", "lifetime", "annual"],
  founding_gamma: ["founding_gamma", "lifetime", "annual"],
  lifetime:       ["lifetime", "annual"],
  annual:         ["annual"],
}

// ============================================================================
// ONE-OFF ACHIEVEMENTS (No tiered progression)
// ============================================================================

export const ONE_OFF_TROPHIES: TrophyDefinition[] = [
  {
    id: "first_visit",
    name: "Jewel Hoarder",
    description:
      "Sableye spotted your curiosity. You discovered the Trophy Case and claimed your first jewel.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Sableye.image,
    condition: "Open the Trophy Case for the first time",
    target: 1,
    video: TROPHY_MEDIA.Sableye.video,
  },
  {
    id: "print_master",
    name: "Genetic Code",
    description:
      "Mewtwo pushed your printer to its absolute limits. Every setting has been tested.",
    category: "achievement",
    rarity: "rare",
    image: TROPHY_MEDIA.Mewtwo.image,
    condition: "Try all print settings",
    target: 1,
    video: TROPHY_MEDIA.Mewtwo.video,
  },
  {
    id: "master_collector",
    name: "Alpha & Omega",
    description:
      "Arceus recognizes your dedication. Every trophy in existence now bows before you.",
    category: "achievement",
    rarity: "legendary",
    image: TROPHY_MEDIA.Arceus2.image,
    condition: "Unlock all other trophies",
    target: 1,
  },
  {
    id: "night_owl",
    name: "Night Watcher",
    description:
      "Umbreon glows in the dark. The night belongs to dedicated trainers.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Umbreon.image,
    condition: "Use app after 9pm",
    target: 1,
    video: TROPHY_MEDIA.Umbreon.video,
  },
  {
    id: "early_bird",
    name: "Dawn Chaser",
    description:
      "Espeon greets the sunrise. Early trainers catch the best cards.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Espeon.image,
    condition: "Use app before 8am",
    target: 1,
    video: TROPHY_MEDIA.Espeon.video,
  },
  {
    id: "social_butterfly",
    name: "Socialite",
    description:
      "Pikachu spreads joy. Your trophy sparkles across social media.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Pikachu2.image,
    condition: "Share a trophy on X",
    target: 1,
    video: TROPHY_MEDIA.Pikachu2.video,
  },
  {
    id: "comeback_kid",
    name: "Resilience",
    description:
      "Machamp never stays down. Welcome back, champion.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Machamp.image,
    condition: "Return after 7+ days away",
    target: 1,
    video: TROPHY_MEDIA.Machamp.video,
  },
]

// ============================================================================
// TIERED PROGRESSION TRACKS
// ============================================================================

export const TIERED_TRACKS: TrophyDefinition[] = [
  // ─── Deck Builder Track ───
  {
    id: "deck_builder_t1",
    name: "Seedling",
    description:
      "Bulbasaur planted the seed. Your first deck takes root in Proxidex.",
    category: "achievement",
    rarity: "common",
    image: TROPHY_MEDIA.Bulbasaur.image,
    condition: "Create 1 deck",
    target: 1,
    track: "deck_builder",
    video: TROPHY_MEDIA.Bulbasaur.video,
  },
  {
    id: "deck_builder_t2",
    name: "Ember",
    description:
      "Charmander's flame sparks inspiration. Five decks now burn with creative fire.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Charmander.image,
    condition: "Create 5 decks",
    target: 5,
    track: "deck_builder",
    video: TROPHY_MEDIA.Charmander.video,
  },
  {
    id: "deck_builder_t3",
    name: "Wildfire",
    description:
      "Entei's sacred flame spreads. Twenty-five decks blaze across your collection.",
    category: "achievement",
    rarity: "rare",
    image: TROPHY_MEDIA.Entei.image,
    condition: "Create 25 decks",
    target: 25,
    track: "deck_builder",
    video: TROPHY_MEDIA.Entei.video,
  },
  {
    id: "deck_builder_t4",
    name: "Genesis",
    description:
      "Arceus sculpts life itself. Fifty decks — a world of your own creation.",
    category: "achievement",
    rarity: "holo",
    image: TROPHY_MEDIA.Arceus.image,
    condition: "Create 50 decks",
    target: 50,
    track: "deck_builder",
  },

  // ─── Searcher Track ───
  {
    id: "searcher_t1",
    name: "Curious Glance",
    description:
      "Clefairy notices something interesting. Your first search begins the journey.",
    category: "achievement",
    rarity: "common",
    image: TROPHY_MEDIA.Clefairy.image,
    condition: "Search 1 time",
    target: 1,
    track: "searcher",
    video: TROPHY_MEDIA.Clefairy.video,
  },
  {
    id: "searcher_t2",
    name: "Moonlit Path",
    description:
      "Under moonlight, Eevee guides you deeper. Ten searches and counting.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Eevee.image,
    condition: "Search 10 times",
    target: 10,
    track: "searcher",
    video: TROPHY_MEDIA.Eevee.video,
  },
  {
    id: "searcher_t3",
    name: "Mind Reader",
    description:
      "Alakazam's spoons tremble. Twenty-five searches — the cards cannot hide.",
    category: "achievement",
    rarity: "rare",
    image: TROPHY_MEDIA.Alakazam.image,
    condition: "Search 25 times",
    target: 25,
    track: "searcher",
    video: TROPHY_MEDIA.Alakazam.video,
  },
  {
    id: "searcher_t4",
    name: "Omniscient",
    description:
      "Mew contains the DNA of all knowledge. One hundred searches — nothing remains hidden.",
    category: "achievement",
    rarity: "holo",
    image: TROPHY_MEDIA.Mew.image,
    condition: "Search 100 times",
    target: 100,
    track: "searcher",
    video: TROPHY_MEDIA.Mew.video,
  },

  // ─── Exporter Track ───
  {
    id: "exporter_t1",
    name: "First Drop",
    description:
      "Squirtle sends out the first wave. Your print file hits the paper.",
    category: "achievement",
    rarity: "common",
    image: TROPHY_MEDIA.Squirtle.image,
    condition: "Export 1 print file",
    target: 1,
    track: "exporter",
    video: TROPHY_MEDIA.Squirtle.video,
  },
  {
    id: "exporter_t2",
    name: "Rip Current",
    description:
      "Starmie's core pulses faster. Five print files flow from your hands.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Starmie.image,
    condition: "Export 5 print files",
    target: 5,
    track: "exporter",
    video: TROPHY_MEDIA.Starmie.video,
  },
  {
    id: "exporter_t3",
    name: "Hydro Cannon",
    description:
      "Blastoise unleashes its Hydro cannons. Twenty-five files printed with perfect precision.",
    category: "achievement",
    rarity: "rare",
    image: TROPHY_MEDIA.Blastoise.image,
    condition: "Export 25 print files",
    target: 25,
    track: "exporter",
    video: TROPHY_MEDIA.Blastoise.video,
  },
  {
    id: "exporter_t4",
    name: "Primordial Sea",
    description:
      "Kyogre expands the ocean. One hundred exports — the sea itself yields to your will.",
    category: "achievement",
    rarity: "holo",
    image: TROPHY_MEDIA.Kyogre.image,
    condition: "Export 100 print files",
    target: 100,
    track: "exporter",
    video: TROPHY_MEDIA.Kyogre.video,
  },

  // ─── Importer Track ───
  {
    id: "importer_t1",
    name: "Mimic",
    description:
      "Ditto transforms to match. Your first imported deck takes shape.",
    category: "achievement",
    rarity: "common",
    image: TROPHY_MEDIA.Ditto.image,
    condition: "Import 1 deck from Limitless TCG",
    target: 1,
    track: "importer",
    video: TROPHY_MEDIA.Ditto.video,
  },
  {
    id: "importer_t2",
    name: "Shadow Clone",
    description:
      "Gengar slips through the shadows. Five meta decks now mirror your skill.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Gengar.image,
    condition: "Import 5 decks from Limitless TCG",
    target: 5,
    track: "importer",
    video: TROPHY_MEDIA.Gengar.video,
  },
  {
    id: "importer_t3",
    name: "Distortion",
    description:
      "Giratina twists dimensions. Ten decks pulled from the Distortion World.",
    category: "achievement",
    rarity: "rare",
    image: TROPHY_MEDIA.Giratina.image,
    condition: "Import 10 decks from Limitless TCG",
    target: 10,
    track: "importer",
    video: TROPHY_MEDIA.Giratina.video,
  },
  {
    id: "importer_t4",
    name: "North Wind",
    description:
      "Suicune purifies what it touches. 25 imports — perfection across realities.",
    category: "achievement",
    rarity: "holo",
    image: TROPHY_MEDIA.Suicune.image,
    condition: "Import 25 decks from Limitless TCG",
    target: 25,
    track: "importer",
    video: TROPHY_MEDIA.Suicune.video,
  },

  // ─── Total Logins Track ───
  {
    id: "logins_t1",
    name: "Loyal Companion",
    description:
      "Arcanine's loyalty knows no bounds. Three visits to Proxidex.",
    category: "achievement",
    rarity: "common",
    image: TROPHY_MEDIA.Arcanine.image,
    condition: "Log in 3 times",
    target: 3,
    track: "logins",
    video: TROPHY_MEDIA.Arcanine.video,
  },
  {
    id: "logins_t2",
    name: "Devoted Friend",
    description:
      "Flareon's flame warms steadily. Ten logins — a true bond forms.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Flareon.image,
    condition: "Log in 10 times",
    target: 10,
    track: "logins",
    video: TROPHY_MEDIA.Flareon.video,
  },
  {
    id: "logins_t3",
    name: "Roaring Thunder",
    description:
      "Raikou's storm rages on. Thirty logins — the sky itself notices you.",
    category: "achievement",
    rarity: "rare",
    image: TROPHY_MEDIA.Raikou.image,
    condition: "Log in 30 times",
    target: 30,
    track: "logins",
    video: TROPHY_MEDIA.Raikou.video,
  },
  {
    id: "logins_t4",
    name: "Continent Shaper",
    description:
      "Groudon reshapes the earth. One hundred logins — you are the foundation.",
    category: "achievement",
    rarity: "holo",
    image: TROPHY_MEDIA.Groudon.image,
    condition: "Log in 100 times",
    target: 100,
    track: "logins",
    video: TROPHY_MEDIA.Groudon.video,
  },
]

// ============================================================================
// Combined
// ============================================================================

export const ACHIEVEMENT_TROPHIES: TrophyDefinition[] = [
  ...ONE_OFF_TROPHIES,
  ...TIERED_TRACKS,
]

export const ALL_TROPHIES: TrophyDefinition[] = [
  ...TIER_TROPHIES,
  ...ACHIEVEMENT_TROPHIES,
]

export const TROPHY_MAP = new Map(ALL_TROPHIES.map((t) => [t.id, t]))

// Map action names to their corresponding tracks
export const ACTION_TO_TRACK: Record<string, TrophyTrack> = {
  deck_created: "deck_builder",
  search_performed: "searcher",
  export_completed: "exporter",
  import_completed: "importer",
  login_count: "logins",
}

export function getTrophyById(id: string): TrophyDefinition | undefined {
  return TROPHY_MAP.get(id)
}

export function getTierTrophyForSubscription(
  tier: string
): TrophyDefinition | undefined {
  return TIER_TROPHIES.find((t) => t.tier === tier)
}

export function getAllTrophyIds(): string[] {
  return ALL_TROPHIES.map((t) => t.id)
}

export function getAchievementTrophyIds(): string[] {
  return ACHIEVEMENT_TROPHIES.map((t) => t.id)
}

export function getTierTrophyIds(): string[] {
  return TIER_TROPHIES.map((t) => t.id)
}

export function getOneOffTrophyIds(): string[] {
  return ONE_OFF_TROPHIES.map((t) => t.id)
}

export function getTieredTrackIds(track?: TrophyTrack): string[] {
  if (track) {
    return TIERED_TRACKS.filter((t) => t.track === track).map((t) => t.id)
  }
  return TIERED_TRACKS.map((t) => t.id)
}

export function getTrophiesByTrack(track: TrophyTrack): TrophyDefinition[] {
  return TIERED_TRACKS.filter((t) => t.track === track)
}

export function getTracks(): TrophyTrack[] {
  return ["deck_builder", "searcher", "exporter", "importer", "logins"]
}

export function getTrackLabel(track: TrophyTrack): string {
  const labels: Record<TrophyTrack, string> = {
    deck_builder: "Deck Builder",
    searcher: "Searcher",
    exporter: "Exporter",
    importer: "Importer",
    logins: "Logins",
  }
  return labels[track]
}

// Rarity visual config (colors, particles, etc.)
export const RARITY_CONFIG: Record<
  TrophyRarity,
  {
    label: string
    color: string
    glowColor: string
    borderColor: string
    particleCount: number
  }
> = {
  common: {
    label: "Common",
    color: "#94a3b8",
    glowColor: "rgba(148, 163, 184, 0.3)",
    borderColor: "border-slate-500/30",
    particleCount: 0,
  },
  uncommon: {
    label: "Uncommon",
    color: "#22c55e",
    glowColor: "rgba(34, 197, 94, 0.3)",
    borderColor: "border-green-500/30",
    particleCount: 2,
  },
  rare: {
    label: "Rare",
    color: "#3b82f6",
    glowColor: "rgba(59, 130, 246, 0.4)",
    borderColor: "border-blue-500/30",
    particleCount: 4,
  },
  holo: {
    label: "Holo Rare",
    color: "#a855f7",
    glowColor: "rgba(168, 85, 247, 0.5)",
    borderColor: "border-purple-500/40",
    particleCount: 6,
  },
  legendary: {
    label: "Legendary",
    color: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.6)",
    borderColor: "border-amber-500/50",
    particleCount: 8,
  },
}
