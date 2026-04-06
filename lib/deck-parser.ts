import { getImageUrl } from "./images"
import setCodeMappings from "./set-code-mappings.json"
import type { CardResult } from "./db"

// Set code mapping: Limitless code -> TCGDex code
// We need to reverse this for lookups: TCGDex code -> Limitless/Local code
const TCGDEX_TO_LOCAL: Record<string, string> = {}
for (const [localCode, tcgdxCode] of Object.entries(setCodeMappings)) {
  TCGDEX_TO_LOCAL[tcgdxCode.toLowerCase()] = localCode.toUpperCase()
}

// Valid set codes (both Limitless/local and TCGDex)
const VALID_LOCAL_CODES = new Set(Object.keys(setCodeMappings))

/**
 * Normalize a set code to our local format
 * Handles: Limitless codes (OBF), TCGDex codes (sv03), or local codes
 */
function normalizeSetCode(code: string): string | undefined {
  const upperCode = code.toUpperCase()
  const lowerCode = code.toLowerCase()
  
  // If it's already a valid local code, return as-is
  if (VALID_LOCAL_CODES.has(upperCode)) {
    return upperCode
  }
  
  // If it's a TCGDex code, convert to local
  if (TCGDEX_TO_LOCAL[lowerCode]) {
    return TCGDEX_TO_LOCAL[lowerCode]
  }
  
  return undefined
}

export interface DeckListItem {
  quantity: number
  cardName: string
  setCode?: string
  cardNumber?: string
}

export interface ParsedDeckResult {
  item: DeckListItem
  card: CardResult | null
  error?: string
}

/**
 * Parse a deck list from common formats:
 * - "4 Charmander OBF 26"
 * - "4 Charmander"
 * - "4x Charmander OBF 26"
 * - "4x Charmander"
 * - "Charmander OBF 26" (assumes quantity 1)
 * - "Charmander" (assumes quantity 1)
 * - "Dialga, DP" (name + set with comma, card number looked up)
 *
 * Also handles special characters and variants like:
 * - "3 Charmeleon ex"
 * - "2 Charizard ex OBF 223"
 * - "1 Darkness Energy sm1 D" (energy cards with letter suffixes)
 */
export function parseDeckList(deckText: string): DeckListItem[] {
  const lines = deckText.trim().split("\n")
  const items: DeckListItem[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Skip category headers (Pokemon: 12, Trainer: 15, Energy: 8, etc.)
    if (
      /^(pok[ée]mon|trainer|item|supporter|stadium|tool|energy|pokémon tool)\s*:/i.test(
        trimmed
      )
    ) {
      continue
    }

    // Check for comma format first: "Dialga, DP" or "4 Dialga, DP"
    const commaMatch = trimmed.match(/^(\d+)?(?:x)?\s*(.+?),\s*([A-Za-z0-9]+)$/i)
    if (commaMatch) {
      const quantity = commaMatch[1] ? parseInt(commaMatch[1], 10) : 1
      const cardName = commaMatch[2].trim()
      const rawSetCode = commaMatch[3].toUpperCase()
      const normalizedSetCode = normalizeSetCode(rawSetCode)
      
      if (normalizedSetCode) {
        items.push({
          quantity,
          cardName,
          setCode: normalizedSetCode,
          // No cardNumber - will be looked up by name + set
        })
        continue
      }
    }

    // Try to match: "4 Charmander OBF 26" or "4x Charmander OBF 26"
    // Pattern: quantity [x] name [set number]
    const match = trimmed.match(/^(\d+)(?:x)?\s+(.+)$/i)

    let quantity: number
    let rest: string

    if (match) {
      // Has explicit quantity
      quantity = parseInt(match[1], 10)
      rest = match[2].trim()
    } else {
      // No quantity - assume 1
      quantity = 1
      rest = trimmed
    }

    // Check if there's a set code and card number at the end
    // Pattern: "... OBF 26" or "... OBF026" or "... 026"
    // First try to match with set code validation
    const setNumberMatch = rest.match(
      /^(.*?)\s+([A-Za-z0-9.]+)\s+(\d{1,3}|[A-Z])$/i
    )
    const numberOnlyMatch = rest.match(/^(.*?)\s+(\d{1,3})$/)

    if (setNumberMatch) {
      const rawSetCode = setNumberMatch[2]

      // Normalize the set code to our local format
      const normalizedSetCode = normalizeSetCode(rawSetCode)
      
      if (normalizedSetCode) {
        items.push({
          quantity,
          cardName: setNumberMatch[1].trim(),
          setCode: normalizedSetCode,
          cardNumber: setNumberMatch[3],
        })
      } else {
        // Not a valid set code - treat entire string as card name
        items.push({
          quantity,
          cardName: rest,
        })
      }
    } else if (numberOnlyMatch) {
      items.push({
        quantity,
        cardName: numberOnlyMatch[1].trim(),
        cardNumber: numberOnlyMatch[2],
      })
    } else {
      items.push({
        quantity,
        cardName: rest,
      })
    }
  }

  return items
}

/**
 * Get image URL for a resolved card
 */
export function getCardImageUrl(
  card: CardResult,
  size: 'sm' | 'md' | 'lg' | 'xl' = 'lg'
): string {
  return getImageUrl(card.name, card.set_code, card.local_id, size)
}

/**
 * Format a deck list from parsed items back to text
 */
export function formatDeckList(items: DeckListItem[]): string {
  return items
    .map((item) => {
      let line = `${item.quantity} ${item.cardName}`
      if (item.setCode) {
        line += ` ${item.setCode}`
        if (item.cardNumber) {
          line += ` ${item.cardNumber}`
        }
      }
      return line
    })
    .join("\n")
}

/**
 * Parse structured deck data (from meta/URL imports) using the same logic as manual entry.
 * This ensures consistent set code mapping across all import methods.
 */
export function parseStructuredDeck(
  cards: Array<{
    quantity: number
    name: string
    setCode?: string
    cardNumber?: string
  }>
): DeckListItem[] {
  // Convert to text format and call parseDeckList to ensure consistent set code mapping
  const deckText = cards
    .map((c) => {
      let line = `${c.quantity} ${c.name}`
      if (c.setCode) {
        line += ` ${c.setCode}`
        if (c.cardNumber) {
          line += ` ${c.cardNumber}`
        }
      }
      return line
    })
    .join("\n")
  return parseDeckList(deckText)
}
