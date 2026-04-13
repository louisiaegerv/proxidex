// Types for landing page components

export interface LandingCard {
  id: string;
  name: string;
  imageUrl: string;
  imageUrlLg?: string;
  set: string;
  setName: string;
  rarity: string;
  supertype: string;
  number: string;
  hp?: string;
  types?: string[];
  abilities?: unknown[];
  attacks?: unknown[];
  weaknesses?: unknown[];
}

export interface SetInfo {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  releaseDate: string;
  images: {
    symbol: string;
    logo: string;
  };
}

export interface CardPosition {
  top: string;
  left?: string;
  right?: string;
  rotate: number;
  scale: number;
  depth: number;
  zIndex: number;
}

export type PokemonType = 
  | 'Fire' 
  | 'Water' 
  | 'Grass' 
  | 'Lightning' 
  | 'Psychic' 
  | 'Fighting' 
  | 'Darkness' 
  | 'Metal' 
  | 'Fairy' 
  | 'Dragon' 
  | 'Colorless';
