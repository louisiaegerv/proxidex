/**
 * Limitless TCG API Integration
 *
 * Fetches meta deck data from Limitless TCG tournament platform.
 * Note: This uses the public API/endpoints that Limitless exposes.
 */

import setCodeMappings from "./set-code-mappings.json"

// Set code mapping from Limitless to TCGDex format
// e.g., "TWM" -> "sv06" (Twilight Masquerade)
const LIMITLESS_TO_TCGDEX: Record<string, string> = setCodeMappings

export interface LimitlessDeck {
  id: number
  name: string
  count: number
  share: number // percentage as decimal (0.02 = 2%)
  score: string // e.g., "253 - 290 - 7" (wins - losses - ties)
  winRate: number // percentage as decimal (0.46 = 46%)
  sprites?: string[] // Pokemon sprite image URLs
}

export interface LimitlessDeckDetail extends LimitlessDeck {
  cards: LimitlessDeckCard[]
  image?: string // Main deck card image URL
}

export interface LimitlessDeckCard {
  quantity: number
  name: string
  setCode?: string
  cardNumber?: string
}

// Cache for deck lists to avoid repeated requests
let deckCache: LimitlessDeck[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Clear the deck cache to force a fresh fetch
 */
export function clearDeckCache() {
  deckCache = null
  cacheTimestamp = 0
}

/**
 * Parse deck ID and variant from various Limitless URL formats:
 * - https://limitlesstcg.com/decks/284/cards
 * - https://limitlesstcg.com/decks/284/cards?variant=5
 * - https://limitlesstcg.com/decks/284
 * - https://play.limitlesstcg.com/decks/284
 */
export function parseDeckUrl(url: string): { deckId: number; variant?: number } | null {
  const patterns = [
    /limitlesstcg\.com\/decks\/(\d+)/,
    /play\.limitlesstcg\.com\/decks\/(\d+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      const deckId = parseInt(match[1], 10)
      
      // Check for variant query parameter
      const variantMatch = url.match(/[?&]variant=(\d+)/)
      const variant = variantMatch ? parseInt(variantMatch[1], 10) : undefined
      
      return { deckId, variant }
    }
  }

  return null
}

/**
 * Fetch top meta decks from Limitless TCG
 * Uses the server-side API route to avoid CORS issues
 */
export async function fetchMetaDecks(
  game: "pocket" | "tcg" = "tcg",
  limit: number = 50
): Promise<LimitlessDeck[]> {
  // Check cache
  if (deckCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return deckCache.slice(0, limit)
  }

  try {
    // Use the server-side API route to avoid CORS
    const url = `/api/limitless?endpoint=decks&game=${game}`

    console.log(`[Limitless] Fetching meta decks from: ${url}`)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const data = await response.json()

    if (!data.html) {
      throw new Error("No HTML data received")
    }

    const decks = parseDecksFromHTML(data.html)

    // Cache results
    deckCache = decks
    cacheTimestamp = Date.now()

    return decks.slice(0, limit)
  } catch (error) {
    console.error("Error fetching meta decks:", error)
    // Return cached data if available, even if expired
    if (deckCache) {
      return deckCache.slice(0, limit)
    }
    throw error
  }
}

/**
 * Parse deck data from Limitless HTML
 * This extracts the deck information from the page content
 */
function parseDecksFromHTML(html: string): LimitlessDeck[] {
  const decks: LimitlessDeck[] = []

  // Parse from HTML table - looking for the data-table structure
  // Format from limitlesstcg.com/decks:
  // <tr>
  //   <td>1</td>
  //   <td><img class="pokemon" src="https://r2.limitlesstcg.net/pokemon/gen9/dragapult.png" alt="dragapult"></td>
  //   <td><a href="/decks/284">Dragapult <span class="annotation">ex</span></a></td>
  //   <td>331</td>
  //   <td>18.01%</td>
  // </tr>

  // Find all table rows that contain deck data
  // Capture the sprite column (second td) and extract image URLs
  const rowRegex =
    /<tr[^>]*>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>.*?<a[^>]*href="\/decks\/(\d+)"[^>]*>(.*?)<\/a>.*?<\/td>\s*<td[^>]*>([\d,]+)<\/td>\s*<td[^>]*>([\d.]+)%?<\/td>\s*<\/tr>/gi

  let match
  while ((match = rowRegex.exec(html)) !== null) {
    const rank = parseInt(match[1], 10)
    const spritesHtml = match[2]
    const deckId = parseInt(match[3], 10)
    const nameHtml = match[4]
    const points = parseInt(match[5].replace(/,/g, ""), 10)
    const sharePercent = parseFloat(match[6])

    // Extract clean name from HTML (remove span tags)
    const cleanName = decodeHtmlEntities(
      nameHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )

    // Extract sprite URLs from the sprites column
    // HTML format: <img class="pokemon" src="https://r2.limitlesstcg.net/pokemon/gen9/dragapult.png" alt="dragapult">
    const sprites: string[] = []

    // Try matching class before src (actual format from Limitless)
    const spriteRegex = /<img[^>]*class="[^"]*pokemon[^"]*"[^>]*src="([^"]+)"/gi
    let spriteMatch
    while ((spriteMatch = spriteRegex.exec(spritesHtml)) !== null) {
      sprites.push(spriteMatch[1])
    }

    decks.push({
      id: deckId,
      name: cleanName,
      count: points, // Using points as count
      share: sharePercent / 100,
      score: "0 - 0 - 0", // Not available in this view
      winRate: 0, // Not available in this view
      sprites: sprites.length > 0 ? sprites : undefined,
    })
  }

  console.log(
    `[Limitless Parser] Found ${decks.length} decks via table parsing`
  )

  // Fallback: Look for deck links if table parsing fails
  if (decks.length === 0) {
    const linkRegex = /\/decks\/(\d+)"[^>]*>([^<]+)/gi
    while ((match = linkRegex.exec(html)) !== null) {
      const id = parseInt(match[1], 10)
      const name = decodeHtmlEntities(match[2].trim())

      // Avoid duplicates
      if (!decks.find((d) => d.id === id)) {
        decks.push({
          id,
          name,
          count: 0,
          share: 0,
          score: "0 - 0 - 0",
          winRate: 0,
        })
      }
    }
    console.log(
      `[Limitless Parser] Found ${decks.length} decks via link fallback`
    )
  }

  return decks
}

/**
 * Fetch detailed deck information including card list
 * Uses the server-side API route to avoid CORS issues
 * Supports variant parameter for deck variations
 */
export async function fetchDeckDetail(
  deckId: number,
  variant?: number
): Promise<LimitlessDeckDetail | null> {
  try {
    // Build URL with variant if provided
    let endpoint = `decks/${deckId}`
    if (variant !== undefined) {
      endpoint += `?variant=${variant}`
    }
    
    // Use the server-side API route
    const response = await fetch(`/api/limitless?endpoint=${encodeURIComponent(endpoint)}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const data = await response.json()
    const html = data.html

    if (!html) {
      throw new Error("No data received")
    }

    const cards = parseCardsFromHTML(html)

    if (cards.length > 0) {
      return {
        id: deckId,
        name: extractDeckName(html) || `Deck ${deckId}`,
        count: cards.length,
        share: 0,
        score: "0 - 0 - 0",
        winRate: 0,
        cards,
        image: extractDeckImage(html),
      }
    }

    return null
  } catch (error) {
    console.error("Error fetching deck detail:", error)
    return null
  }
}

/**
 * Parse card list from deck page HTML
 * Parses the .decklist-cards structure from Limitless TCG
 */
function parseCardsFromHTML(html: string): LimitlessDeckCard[] {
  const cards: LimitlessDeckCard[] = []

  // Look for decklist-card elements with the structure:
  // <div class="decklist-card" data-set="TWM" data-number="128" data-lang="en">
  //   <a class="card-link" href="/cards/TWM/128">
  //     <span class="card-count">4.00</span>
  //     <span class="card-name">Dreepy</span>
  //   </a>
  //   ...
  // </div>

  // Method 1: Parse using data attributes (most reliable)
  const cardDivRegex =
    /<div[^>]*class="decklist-card"[^>]*data-set="([^"]*)"[^>]*data-number="([^"]*)"[^>]*>/gi
  let match

  while ((match = cardDivRegex.exec(html)) !== null) {
    const setCode = match[1]
    const cardNumber = match[2]

    // Find the card name and count within this card div
    // Look ahead in the HTML from this position
    const cardSection = html.slice(match.index, match.index + 500)

    const countMatch = cardSection.match(
      /<span[^>]*class="card-count"[^>]*>([\d.]+)<\/span>/
    )
    const nameMatch = cardSection.match(
      /<span[^>]*class="card-name"[^>]*>([^<]+)<\/span>/
    )

    if (nameMatch) {
      const quantity = countMatch ? Math.ceil(parseFloat(countMatch[1])) : 1
      const name = decodeHtmlEntities(nameMatch[1].trim())

      cards.push({
        quantity,
        name,
        setCode: setCode || undefined,
        cardNumber: cardNumber || undefined,
      })
    }
  }

  // Method 2: If no cards found with data attributes, try href parsing
  if (cards.length === 0) {
    const cardLinkRegex =
      /<a[^>]*class="card-link"[^>]*href="\/cards\/([^\/]+)\/([^"]+)"[^>]*>.*?<span[^>]*class="card-count"[^>]*>([\d.]+)<\/span>.*?<span[^>]*class="card-name"[^>]*>([^<]+)<\/span>/gi

    while ((match = cardLinkRegex.exec(html)) !== null) {
      const setCode = match[1]
      const cardNumber = match[2]
      const quantity = Math.ceil(parseFloat(match[3]))
      const name = decodeHtmlEntities(match[4].trim())

      cards.push({
        quantity,
        name,
        setCode: setCode || undefined,
        cardNumber: cardNumber || undefined,
      })
    }
  }

  return cards
}

/**
 * Parse card text like "Charmander OBF 26" into components
 */
function parseCardText(text: string): {
  name: string
  setCode?: string
  cardNumber?: string
} {
  // Pattern: "Card Name SET 123"
  const setNumberMatch = text.match(/^(.+?)\s+([A-Z0-9]{2,6})\s*(\d{1,3})$/i)

  if (setNumberMatch) {
    return {
      name: setNumberMatch[1].trim(),
      setCode: setNumberMatch[2].toUpperCase(),
      cardNumber: setNumberMatch[3],
    }
  }

  return { name: text }
}

/**
 * Extract deck name from HTML
 * Decodes HTML entities like &#039; to '
 */
function extractDeckName(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    const decoded = decodeHtmlEntities(titleMatch[1])
    return decoded.replace(" - Limitless TCG", "").trim()
  }

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) {
    return decodeHtmlEntities(h1Match[1]).trim()
  }

  return null
}

/**
 * Extract deck image from HTML
 * Looks for .deck-info .picture .card img
 * Uses src (smaller/XS size) since we're displaying thumbnails
 */
function extractDeckImage(html: string): string | undefined {
  // Look for the main deck card image in .deck-info .picture
  // Pattern: <div class="picture">...<img class="card xs shadow" src="..." data-src="...">
  // We use src (XS size) since we're displaying small thumbnails
  const pictureMatch = html.match(
    /<div[^>]*class="[^"]*picture[^"]*"[^>]*>[\s\S]*?<img[^>]*class="[^"]*card[^"]*"[^>]*src="([^"]+)"[^>]*>/i
  )

  if (pictureMatch) {
    return pictureMatch[1]
  }

  return undefined
}

/**
 * Decode HTML entities (named and numeric)
 * Handles entities like &amp;, &lt;, &#039;, &#x27;, etc.
 */
function decodeHtmlEntities(text: string): string {
  // Named entities
  const namedEntities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&#x27;": "'",
    "&#x2F;": "/",
    "&#x60;": "`",
    "&#61;": "=",
  }

  // Replace named entities
  let decoded = text.replace(
    /&[^;]+;/g,
    (entity) => namedEntities[entity] || entity
  )

  // Replace decimal numeric entities: &#039; -> '
  decoded = decoded.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10))
  )

  // Replace hexadecimal numeric entities: &#x27; -> '
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  )

  return decoded
}

/**
 * Convert Limitless deck cards to deck list format for the parser
 * Maps Limitless set codes to TCGDex set codes
 */
export function convertToDeckList(cards: LimitlessDeckCard[]): string {
  return cards
    .map((card) => {
      let line = `1 ${card.name}`
      if (card.setCode) {
        // Map Limitless set code to TCGDex set code
        const tcgDexSetCode = LIMITLESS_TO_TCGDEX[card.setCode] || card.setCode
        line += ` ${tcgDexSetCode}`
        if (card.cardNumber) {
          line += ` ${card.cardNumber}`
        }
      }
      return line
    })
    .join("\n")
}
