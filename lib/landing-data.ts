import { getClient } from './db';
import { getCardImageUrl } from './images';
import { unstable_cache } from 'next/cache';

export interface LandingCard {
  id: string;
  name: string;
  imageUrl: string;
  set: string;
  setName: string;
  rarity: string;
  supertype: string;
  number: string;
}

// Cache the random card IDs at build time - don't query DB on every request
const HERO_CARD_IDS = [
  'base1-4',    // Charizard
  'base1-15',   // Venusaur  
  'base1-20',   // Blastoise
  'base1-58',   // Pikachu
  'base2-3',    // Mewtwo
  'neo1-9',     // Lugia
  'ex3-101',    // Rayquaza
  'xy1-42',     // Umbreon
];

// Get specific cards by ID (much cheaper than ORDER BY RANDOM)
async function getCardsByIds(ids: string[]): Promise<LandingCard[]> {
  try {
    const client = getClient();
    
    // Query specific cards - only reads 8 rows
    const placeholders = ids.map(() => '?').join(',');
    const query = `
      SELECT 
        c.id,
        c.name,
        c.set_code as "set",
        c.set_name as "setName",
        c.local_id as "number",
        c.folder_name as "folderName",
        'Pokémon' as supertype
      FROM cards c
      WHERE c.id IN (${placeholders})
    `;

    const result = await client.execute({ sql: query, args: ids });
    
    return result.rows.map(row => {
      const card = {
        id: String(row.id),
        name: String(row.name),
        set_code: String(row.set),
        local_id: String(row.number),
        folder_name: String(row.folderName),
      };
      
      return {
        id: card.id,
        name: card.name,
        set: card.set_code,
        setName: String(row.setName),
        number: card.local_id,
        rarity: 'normal',
        supertype: String(row.supertype),
        imageUrl: getCardImageUrl(card, 'md'),
      };
    }) as LandingCard[];
  } catch (error) {
    console.error('Error fetching cards by ID:', error);
    return [];
  }
}

// Get random cards using a cheap method
// Pick random IDs from a pre-selected pool instead of ORDER BY RANDOM()
async function getRandomCardsCheap(limit = 8): Promise<LandingCard[]> {
  try {
    const client = getClient();
    
    // Get a random sample by using rowid range query (very fast)
    // This is much cheaper than ORDER BY RANDOM()
    const query = `
      SELECT 
        c.id,
        c.name,
        c.set_code as "set",
        c.set_name as "setName",
        c.local_id as "number",
        c.folder_name as "folderName",
        'Pokémon' as supertype
      FROM cards c
      WHERE c.rowid >= (ABS(RANDOM()) % (SELECT MAX(rowid) FROM cards)) + 1
      LIMIT ?
    `;

    const result = await client.execute({ sql: query, args: [limit] });
    
    return result.rows.map(row => {
      const card = {
        id: String(row.id),
        name: String(row.name),
        set_code: String(row.set),
        local_id: String(row.number),
        folder_name: String(row.folderName),
      };
      
      return {
        id: card.id,
        name: card.name,
        set: card.set_code,
        setName: String(row.setName),
        number: card.local_id,
        rarity: 'normal',
        supertype: String(row.supertype),
        imageUrl: getCardImageUrl(card, 'md'),
      };
    }) as LandingCard[];
  } catch (error) {
    console.error('Error fetching random cards:', error);
    return [];
  }
}

// Cached version - only runs once per day
export const getRandomCards = unstable_cache(
  getRandomCardsCheap,
  ['hero-cards'],
  { revalidate: 86400 } // 24 hours instead of 1 hour
);
