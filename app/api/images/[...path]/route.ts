/**
 * Image Serving API Route (Development)
 * 
 * Serves card images from the local filesystem in development mode.
 * In production, images are served directly from R2/CDN.
 * 
 * Route: /api/images/{folder}/{filename}.webp
 * Example: /api/images/151_MEW/Abra_MEW_063_md.webp
 */

import { readFile } from 'fs/promises'
import { NextRequest } from 'next/server'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Get path segments
  const { path: pathSegments } = await params
  
  // Validate environment
  const basePath = process.env.LOCAL_IMAGES_PATH
  
  if (!basePath) {
    return new Response(
      JSON.stringify({ error: 'LOCAL_IMAGES_PATH not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  // Build file path
  const filePath = path.join(basePath, ...pathSegments)
  
  // Security check: ensure path is within base directory (prevent directory traversal)
  const resolvedPath = path.resolve(filePath)
  const resolvedBase = path.resolve(basePath)
  
  if (!resolvedPath.startsWith(resolvedBase)) {
    return new Response(
      JSON.stringify({ error: 'Invalid path' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  // Validate file extension
  if (!resolvedPath.endsWith('.webp')) {
    return new Response(
      JSON.stringify({ error: 'Only WebP images are supported' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  try {
    // Read and serve the file
    const fileBuffer = await readFile(resolvedPath)
    
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept-Encoding'
      }
    })
  } catch (error) {
    // File not found or other error
    console.error(`Image not found: ${filePath}`, error)
    
    return new Response(
      JSON.stringify({ error: 'Image not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
