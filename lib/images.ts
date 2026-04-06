/**
 * Image URL utilities
 * 
 * This module provides functions to generate image URLs for cards,
 * supporting both local development and R2 production storage.
 */

import { SET_MAPPINGS, getFolderName } from './set-mappings'

/**
 * Generate image URL for a card
 * 
 * @param cardName - Card name (e.g., "Abra")
 * @param setCode - Official set code (e.g., "MEW")
 * @param localId - Card number in set (e.g., "063")
 * @param size - Image size: 'sm' | 'md' | 'lg' | 'xl'
 * @param variant - Card variant: 'normal' | 'holo' | 'reverse'
 * @returns Full URL to the image
 * 
 * Examples:
 *   getImageUrl("Abra", "MEW", "063", "md") 
 *     -> "/api/images/151_MEW/Abra_MEW_063_md.webp"
 *   
 *   getImageUrl("Charizard", "OBF", "125", "lg", "holo")
 *     -> "https://cards.yourdomain.com/Obsidian_Flames_OBF/Charizard_OBF_125_holo_lg.webp"
 */
export function getImageUrl(
  cardName: string,
  setCode: string,
  localId: string,
  size: 'sm' | 'md' | 'lg' | 'xl' = 'md',
  variant: 'normal' | 'holo' | 'reverse' = 'normal'
): string {
  // Get folder name from mapping, fallback to set code
  const folder = getFolderName(setCode) || setCode
  
  // Sanitize card name for filename (preserve hyphens and accented characters)
  // Replace any character that is NOT: Unicode letter, number, or hyphen
  const safeName = cardName.replace(/[^\p{L}\p{N}-]/gu, '_')
  
  // Build variant suffix (empty for normal)
  const variantSuffix = variant === 'normal' ? '' : `_${variant}`
  
  // Build filename: Abra_MEW_063_md.webp or Charizard_OBF_125_holo_lg.webp
  const fileName = `${safeName}_${setCode}_${localId}${variantSuffix}_${size}.webp`
  
  // Check environment for storage source
  const imageSource = process.env.IMAGE_SOURCE || 'local'
  
  if (imageSource === 'r2') {
    // Production: Use R2 public URL
    const r2Url = process.env.R2_PUBLIC_URL
    if (!r2Url) {
      throw new Error('R2_PUBLIC_URL not configured')
    }
    return `${r2Url}/${folder}/${fileName}`
  }
  
  // Development: Use local API route
  return `/api/images/${folder}/${fileName}`
}

/**
 * Generate image URL from a card database result
 * 
 * Convenience function that extracts fields from CardResult
 * Uses the folder_name from the database for correct path
 */
export function getCardImageUrl(
  card: {
    name: string
    set_code: string
    local_id: string
    folder_name?: string
  },
  size: 'sm' | 'md' | 'lg' | 'xl' = 'md',
  variant: 'normal' | 'holo' | 'reverse' = 'normal'
): string {
  // Use folder_name from database if available, otherwise fall back to mapping
  const folder = card.folder_name || getFolderName(card.set_code) || card.set_code
  
  // Sanitize card name for filename (preserve hyphens and accented characters)
  // Replace any character that is NOT: Unicode letter, number, or hyphen
  const safeName = card.name.replace(/[^\p{L}\p{N}-]/gu, '_')
  
  // Build variant suffix
  const variantSuffix = variant === 'normal' ? '' : `_${variant}`
  
  // Build filename
  const fileName = `${safeName}_${card.set_code}_${card.local_id}${variantSuffix}_${size}.webp`
  
  // Check environment
  const imageSource = process.env.IMAGE_SOURCE || 'local'
  
  if (imageSource === 'r2') {
    const r2Url = process.env.R2_PUBLIC_URL
    if (!r2Url) {
      throw new Error('R2_PUBLIC_URL not configured')
    }
    return `${r2Url}/${folder}/${fileName}`
  }
  
  return `/api/images/${folder}/${fileName}`
}

/**
 * Get available sizes for a card
 */
export function getAvailableSizes(sizesString: string): string[] {
  return sizesString.split(',')
}

/**
 * Get available variants for a card
 */
export function getAvailableVariants(variantsString: string): string[] {
  return variantsString.split(',')
}

/**
 * Check if a specific size is available
 */
export function hasSize(sizesString: string, size: string): boolean {
  return sizesString.split(',').includes(size)
}

/**
 * Check if a specific variant is available
 */
export function hasVariant(variantsString: string, variant: string): boolean {
  return variantsString.split(',').includes(variant)
}

/**
 * Get the best available size for a purpose
 * 
 * @param sizesString - Comma-separated sizes from database
 * @param preferred - Preferred size to try first
 * @returns Available size, falling back to alternatives
 */
export function getBestSize(
  sizesString: string,
  preferred: 'sm' | 'md' | 'lg' | 'xl' = 'md'
): string {
  const available = getAvailableSizes(sizesString)
  
  // Try preferred size first
  if (available.includes(preferred)) {
    return preferred
  }
  
  // Fall back to alternatives
  const fallbackOrder: Array<'sm' | 'md' | 'lg' | 'xl'> = ['md', 'lg', 'sm', 'xl']
  for (const size of fallbackOrder) {
    if (available.includes(size)) {
      return size
    }
  }
  
  // Last resort: return first available
  return available[0] || 'md'
}

/**
 * Size recommendations by use case
 */
export const SIZE_RECOMMENDATIONS = {
  thumbnail: 'sm',    // 288x400 - Card list, search results
  preview: 'md',      // 575x800 - Detail view, deck builder
  print: 'lg',        // 1150x1600 - PDF generation, printing
  highres: 'xl'       // 1472x2048 - Future use, maximum quality
} as const

/**
 * Get recommended size for a specific use case
 */
export function getRecommendedSize(
  useCase: keyof typeof SIZE_RECOMMENDATIONS,
  availableSizes: string
): string {
  const preferred = SIZE_RECOMMENDATIONS[useCase]
  return getBestSize(availableSizes, preferred)
}

/**
 * Swap image size in a URL for PDF generation
 * Converts to specified size for printing (default: lg)
 * 
 * @param imageUrl - Current image URL (e.g., "/api/images/..._md.webp")
 * @param size - Target size: 'sm' | 'md' | 'lg' (default: 'lg')
 * @returns URL with size swapped (e.g., "/api/images/..._lg.webp")
 */
export function getPrintImageUrl(imageUrl: string, size: 'sm' | 'md' | 'lg' = 'lg'): string {
  // Pattern: _sm.webp, _md.webp, _lg.webp, _xl.webp -> _{size}.webp
  return imageUrl.replace(/_(sm|md|lg|xl)\.webp$/, `_${size}.webp`)
}
