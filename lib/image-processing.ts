import sharp from 'sharp';

/**
 * Corner Pixel Extension - Image Processing Library
 * 
 * This module provides functionality to stretch the transparent rounded corners
 * of Pokemon card images to the edges, eliminating transparent pixels entirely.
 * 
 * Algorithm adapted from: docs/reference/corner-pixel-stretch-app.html
 */

// Constants from reference implementation
const DEFAULT_ALPHA_THRESH = 30;
const DEFAULT_MAX_SCAN = 120;
const DEFAULT_INNER = 120;

export interface CornerStretchOptions {
  /** Alpha threshold - pixels with alpha >= this are considered opaque (0-255) */
  alphaThreshold?: number;
  /** Maximum pixels to scan inward from each edge */
  maxScan?: number;
  /** How far into the image to extend the corner fill */
  innerExtension?: number;
}

interface EdgeArrays {
  top: Uint8Array;    // RGBA for each column (width * 4)
  bottom: Uint8Array; // RGBA for each column (width * 4)
  left: Uint8Array;   // RGBA for each row (height * 4)
  right: Uint8Array;  // RGBA for each row (height * 4)
}

/**
 * Linear interpolation between two RGBA values
 */
function lerp(a: number[], b: number[], t: number): number[] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    255,
  ];
}

/**
 * Scan edges to build effective edge arrays, skipping transparent pixels
 * 
 * Uses an "inset" of 4 pixels - this means we scan 4 pixels PAST the first
 * opaque pixel we find. This ensures the extended colors completely cover
 * the anti-aliased edge of rounded corners, preventing "ghost borders".
 */
function buildEdgeArrays(
  src: Buffer,
  width: number,
  height: number,
  alphaThreshold: number,
  maxScan: number
): EdgeArrays {
  const top = new Uint8Array(width * 4);
  const bottom = new Uint8Array(width * 4);
  const left = new Uint8Array(height * 4);
  const right = new Uint8Array(height * 4);
  
  // Inset: how many pixels to go PAST the first opaque pixel
  // This ensures we sample from inside the card, not at the anti-aliased edge
  // Increased to 4 to completely eliminate ghost borders
  const INSET = 4;

  // Scan top edge (for each column, find first opaque pixel from top, then go INSET deeper)
  for (let x = 0; x < width; x++) {
    let found = false;
    for (let y = 0; y < Math.min(height, maxScan); y++) {
      const idx = (y * width + x) * 4;
      if (src[idx + 3] >= alphaThreshold) {
        // Go INSET pixels deeper into the card to avoid anti-aliased edge
        const insetY = Math.min(y + INSET, height - 1);
        const insetIdx = (insetY * width + x) * 4;
        top[x * 4] = src[insetIdx];
        top[x * 4 + 1] = src[insetIdx + 1];
        top[x * 4 + 2] = src[insetIdx + 2];
        top[x * 4 + 3] = 255;
        found = true;
        break;
      }
    }
    if (!found) {
      // Use the edge pixel itself if nothing opaque found
      const idx = x * 4;
      top[x * 4] = src[idx];
      top[x * 4 + 1] = src[idx + 1];
      top[x * 4 + 2] = src[idx + 2];
      top[x * 4 + 3] = 255;
    }
  }

  // Scan bottom edge (for each column, find first opaque pixel from bottom, then go INSET deeper)
  for (let x = 0; x < width; x++) {
    let found = false;
    for (let y = height - 1; y >= Math.max(0, height - maxScan); y--) {
      const idx = (y * width + x) * 4;
      if (src[idx + 3] >= alphaThreshold) {
        // Go INSET pixels deeper into the card (upward from bottom)
        const insetY = Math.max(y - INSET, 0);
        const insetIdx = (insetY * width + x) * 4;
        bottom[x * 4] = src[insetIdx];
        bottom[x * 4 + 1] = src[insetIdx + 1];
        bottom[x * 4 + 2] = src[insetIdx + 2];
        bottom[x * 4 + 3] = 255;
        found = true;
        break;
      }
    }
    if (!found) {
      const idx = ((height - 1) * width + x) * 4;
      bottom[x * 4] = src[idx];
      bottom[x * 4 + 1] = src[idx + 1];
      bottom[x * 4 + 2] = src[idx + 2];
      bottom[x * 4 + 3] = 255;
    }
  }

  // Scan left edge (for each row, find first opaque pixel from left, then go INSET deeper)
  for (let y = 0; y < height; y++) {
    let found = false;
    for (let x = 0; x < Math.min(width, maxScan); x++) {
      const idx = (y * width + x) * 4;
      if (src[idx + 3] >= alphaThreshold) {
        // Go INSET pixels deeper into the card (rightward from left)
        const insetX = Math.min(x + INSET, width - 1);
        const insetIdx = (y * width + insetX) * 4;
        left[y * 4] = src[insetIdx];
        left[y * 4 + 1] = src[insetIdx + 1];
        left[y * 4 + 2] = src[insetIdx + 2];
        left[y * 4 + 3] = 255;
        found = true;
        break;
      }
    }
    if (!found) {
      const idx = y * width * 4;
      left[y * 4] = src[idx];
      left[y * 4 + 1] = src[idx + 1];
      left[y * 4 + 2] = src[idx + 2];
      left[y * 4 + 3] = 255;
    }
  }

  // Scan right edge (for each row, find first opaque pixel from right, then go INSET deeper)
  for (let y = 0; y < height; y++) {
    let found = false;
    for (let x = width - 1; x >= Math.max(0, width - maxScan); x--) {
      const idx = (y * width + x) * 4;
      if (src[idx + 3] >= alphaThreshold) {
        // Go INSET pixels deeper into the card (leftward from right)
        const insetX = Math.max(x - INSET, 0);
        const insetIdx = (y * width + insetX) * 4;
        right[y * 4] = src[insetIdx];
        right[y * 4 + 1] = src[insetIdx + 1];
        right[y * 4 + 2] = src[insetIdx + 2];
        right[y * 4 + 3] = 255;
        found = true;
        break;
      }
    }
    if (!found) {
      const idx = (y * width + width - 1) * 4;
      right[y * 4] = src[idx];
      right[y * 4 + 1] = src[idx + 1];
      right[y * 4 + 2] = src[idx + 2];
      right[y * 4 + 3] = 255;
    }
  }

  return { top, bottom, left, right };
}

/**
 * Calculate fill color for a transparent pixel based on its position
 * Uses diagonal angle-weighted blending for corners
 */
function calculateFillColor(
  x: number,
  y: number,
  width: number,
  height: number,
  edges: EdgeArrays
): number[] {
  // Get edge colors for this position
  const topColor = [edges.top[x * 4], edges.top[x * 4 + 1], edges.top[x * 4 + 2], 255];
  const bottomColor = [edges.bottom[x * 4], edges.bottom[x * 4 + 1], edges.bottom[x * 4 + 2], 255];
  const leftColor = [edges.left[y * 4], edges.left[y * 4 + 1], edges.left[y * 4 + 2], 255];
  const rightColor = [edges.right[y * 4], edges.right[y * 4 + 1], edges.right[y * 4 + 2], 255];

  // Calculate distance from each edge
  const distTop = y;
  const distBottom = height - 1 - y;
  const distLeft = x;
  const distRight = width - 1 - x;

  // Determine which quadrant we're in and blend accordingly
  const isTop = distTop <= distBottom;
  const isLeft = distLeft <= distRight;

  let hColor: number[];
  let vColor: number[];
  let hDist: number;
  let vDist: number;

  if (isTop) {
    hColor = topColor;
    hDist = distTop;
  } else {
    hColor = bottomColor;
    hDist = distBottom;
  }

  if (isLeft) {
    vColor = leftColor;
    vDist = distLeft;
  } else {
    vColor = rightColor;
    vDist = distRight;
  }

  // Blend based on diagonal distance ratio
  const totalDist = hDist + vDist;
  if (totalDist === 0) {
    // Exactly at a corner - blend all four (simplified: just average)
    return [
      Math.round((topColor[0] + bottomColor[0] + leftColor[0] + rightColor[0]) / 4),
      Math.round((topColor[1] + bottomColor[1] + leftColor[1] + rightColor[1]) / 4),
      Math.round((topColor[2] + bottomColor[2] + leftColor[2] + rightColor[2]) / 4),
      255,
    ];
  }

  const t = vDist / totalDist;
  return lerp(hColor, vColor, t);
}

/**
 * Stretch transparent corners to fill with edge pixel colors
 * 
 * @param imageBuffer - Input image buffer
 * @param options - Processing options
 * @returns Processed image buffer (PNG format)
 */
export async function stretchCorners(
  imageBuffer: Buffer,
  options: CornerStretchOptions = {}
): Promise<Buffer> {
  const alphaThreshold = options.alphaThreshold ?? DEFAULT_ALPHA_THRESH;
  const maxScan = options.maxScan ?? DEFAULT_MAX_SCAN;

  // Load image and ensure it has alpha channel
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  // Get raw RGBA pixel data
  const { data: src } = await image
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  // Build edge arrays (scanning past transparent pixels)
  const edges = buildEdgeArrays(src, width, height, alphaThreshold, maxScan);

  // Create output buffer
  const output = Buffer.alloc(width * height * 4);

  // Use a high threshold for "fully opaque" to avoid anti-aliased edge artifacts
  // Only pixels that are nearly fully opaque (alpha >= 250) are copied as-is
  // Everything else (including semi-transparent anti-aliased edges) gets filled
  const FULLY_OPAQUE_THRESHOLD = 250;

  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const outIdx = srcIdx;

      if (src[srcIdx + 3] >= FULLY_OPAQUE_THRESHOLD) {
        // Fully opaque pixel - copy from source
        output[outIdx] = src[srcIdx];
        output[outIdx + 1] = src[srcIdx + 1];
        output[outIdx + 2] = src[srcIdx + 2];
        output[outIdx + 3] = src[srcIdx + 3];
      } else {
        // Semi-transparent or transparent pixel - fill from edge stretch
        // This completely covers anti-aliased edges with solid colors
        const fillColor = calculateFillColor(x, y, width, height, edges);
        output[outIdx] = fillColor[0];
        output[outIdx + 1] = fillColor[1];
        output[outIdx + 2] = fillColor[2];
        output[outIdx + 3] = 255; // Fully opaque
      }
    }
  }

  // Return as PNG
  return sharp(output, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Fetch image from URL and stretch corners
 * 
 * @param imageUrl - URL of the image to process
 * @param options - Processing options
 * @returns Processed image buffer (PNG format)
 */
export async function stretchCornersFromUrl(
  imageUrl: string,
  options: CornerStretchOptions = {}
): Promise<Buffer> {
  // Handle data URLs
  if (imageUrl.startsWith('data:')) {
    const base64Data = imageUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    return stretchCorners(buffer, options);
  }

  // Fetch from network
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return stretchCorners(buffer, options);
}

/**
 * Process card image and return as base64 data URL
 * 
 * @param imageUrl - Source image URL
 * @param options - Processing options
 * @returns Base64 data URL of processed image
 */
export async function processCardImage(
  imageUrl: string,
  options: CornerStretchOptions = {}
): Promise<string> {
  const processedBuffer = await stretchCornersFromUrl(imageUrl, options);
  return `data:image/png;base64,${processedBuffer.toString('base64')}`;
}
