'use server'

import { findCardForDeck, type CardResult } from '@/lib/db'

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
 * Resolve deck cards against local database (Server Action)
 */
export async function resolveDeckCards(
  items: DeckListItem[]
): Promise<ParsedDeckResult[]> {
  const start = performance.now()
  
  const uniqueKeyMap = new Map<
    string,
    DeckListItem & { totalQuantity: number; originalIndices: number[] }
  >()

  items.forEach((item, index) => {
    const key = `${item.cardName.toLowerCase()}|${item.setCode?.toLowerCase() || ""}|${item.cardNumber || ""}`

    if (uniqueKeyMap.has(key)) {
      const existing = uniqueKeyMap.get(key)!
      existing.totalQuantity += item.quantity
      existing.originalIndices.push(index)
    } else {
      uniqueKeyMap.set(key, {
        ...item,
        totalQuantity: item.quantity,
        originalIndices: [index],
      })
    }
  })

  const uniqueItems = Array.from(uniqueKeyMap.values())
  const results: ParsedDeckResult[] = []
  const resultsByIndex = new Map<number, ParsedDeckResult>()

  console.log(`[Deck Parser] Resolving ${uniqueItems.length} unique card(s)`)

  for (const item of uniqueItems) {
    let selectedCard: CardResult | null = null
    let error: string | undefined

    try {
      console.log(
        `[Deck Parser] Searching for: ${item.cardName} (set: ${item.setCode}, number: ${item.cardNumber})`
      )

      const foundCard = await findCardForDeck(
        item.cardName,
        item.setCode,
        item.cardNumber
      )

      if (foundCard) {
        selectedCard = foundCard
        console.log(
          `[Deck Parser] Found: ${selectedCard.name} (${selectedCard.set_code} ${selectedCard.local_id})`
        )
      } else {
        console.log(`[Deck Parser] Card not found: ${item.cardName}`)
        error = `Card not found: ${item.cardName}${item.setCode ? ` (${item.setCode})` : ""}`
      }
    } catch (err) {
      console.error(`[Deck Parser] Error searching for ${item.cardName}:`, err)
      error = "Search failed"
    }

    const result: ParsedDeckResult = {
      item: {
        ...item,
        quantity: item.totalQuantity,
      },
      card: selectedCard,
      error,
    }

    for (const originalIndex of item.originalIndices) {
      resultsByIndex.set(originalIndex, result)
    }
  }

  const processedKeys = new Set<string>()

  for (let i = 0; i < items.length; i++) {
    const result = resultsByIndex.get(i)
    if (result) {
      const key = `${result.item.cardName.toLowerCase()}|${result.item.setCode?.toLowerCase() || ""}|${result.item.cardNumber || ""}`

      if (!processedKeys.has(key)) {
        results.push(result)
        processedKeys.add(key)
      }
    }
  }
  
  const duration = performance.now() - start
  console.log(`[Deck Parser] Resolved ${items.length} cards in ${duration.toFixed(2)}ms`)

  return results
}
