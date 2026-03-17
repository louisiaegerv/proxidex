import TCGdex, { Query } from "@tcgdex/sdk"

// Initialize TCGdex client with English language
export const tcgdex = new TCGdex("en")

// Helper function to get full image URL from TCGdex base URL
// TCGdex returns base URL like: https://assets.tcgdex.net/en/swsh/swsh3/136
// We need to append /high.png or /low.webp
//
// Also handles data URLs and absolute URLs (returns them as-is)
export function getFullImageUrl(
  baseUrl: string | undefined,
  quality: "low" | "high" = "high",
  extension: "png" | "webp" = "png"
): string | undefined {
  if (!baseUrl) return undefined

  // If it's already a data URL or absolute URL with extension, return as-is
  if (baseUrl.startsWith("data:")) {
    return baseUrl
  }

  // If it already ends with an image extension, it's likely a full URL
  if (baseUrl.match(/\.(png|webp|jpg|jpeg)(\?.*)?$/i)) {
    return baseUrl
  }

  // Otherwise, append quality and extension (TCGdex format)
  return `${baseUrl}/${quality}.${extension}`
}

// Helper function to search cards with filters
export async function searchCards(
  query: string,
  options?: {
    setId?: string
    type?: string
    rarity?: string
  }
) {
  try {
    let cards = []

    // Build query to filter server-side
    const queryBuilder = Query.create()

    // If set is specified, filter by set
    if (options?.setId && options.setId !== "all") {
      queryBuilder.equal("set.id", options.setId)
    }

    // Filter by name using 'like' for partial matching
    if (query) {
      queryBuilder.like("name", query)
    }

    console.log(`[TCGdex API] Searching cards with query: "${query}"`)
    cards = await tcgdex.card.list(queryBuilder)

    // Sort to prioritize exact matches first, then starts with, then contains
    if (query && cards) {
      const lowerQuery = query.toLowerCase()
      cards = cards.sort((a, b) => {
        // Handle cases where name might not be present
        const aName = (a.name || "").toLowerCase()
        const bName = (b.name || "").toLowerCase()
        const aExact = aName === lowerQuery
        const bExact = bName === lowerQuery
        const aStartsWith = aName.startsWith(lowerQuery)
        const bStartsWith = bName.startsWith(lowerQuery)

        // Exact matches come first
        if (aExact && !bExact) return -1
        if (bExact && !aExact) return 1

        // Then starts with
        if (aStartsWith && !bStartsWith) return -1
        if (bStartsWith && !aStartsWith) return 1

        // Otherwise maintain original order (stable sort)
        return 0
      })
    }

    return cards || []
  } catch (error) {
    console.error("Error searching cards:", error)
    return []
  }
}

// Fetch all sets
export async function getSets() {
  try {
    console.log("[TCGdex API] Fetching all sets")
    const sets = await tcgdex.set.list()
    // Sort by name since SetResume doesn't have releaseDate
    return sets.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error("Error fetching sets:", error)
    return []
  }
}

// Fetch single card details
export async function getCard(cardId: string) {
  try {
    console.log(`[TCGdex API] Fetching card: ${cardId}`)
    const card = await tcgdex.card.get(cardId)
    return card
  } catch (error) {
    console.error("Error fetching card:", error)
    return null
  }
}

/**
 * Fetch and process card image - stretches transparent corners
 * This is the primary function for getting card images for the proxy list
 *
 * Calls the /api/process-corners endpoint to handle the image processing server-side.
 *
 * @param baseUrl - Base image URL from TCGdex
 * @param quality - Image quality ('low' or 'high')
 * @returns Base64 data URL of processed image, or undefined if failed
 */
export async function getProcessedCardImage(
  baseUrl: string | undefined,
  quality: "low" | "high" = "high"
): Promise<string | undefined> {
  if (!baseUrl) return undefined

  // Construct full image URL
  const imageUrl = getFullImageUrl(baseUrl, quality, "png")
  if (!imageUrl) return undefined

  try {
    // Call API to process corners
    const response = await fetch("/api/process-corners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to process image")
    }

    const data = await response.json()
    return data.image
  } catch (error) {
    console.error("Error processing card image:", error)
    // Fallback to original URL if processing fails
    return imageUrl
  }
}
