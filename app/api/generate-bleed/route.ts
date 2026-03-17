import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// mm to pixels at 300 DPI
const MM_TO_PX_300DPI = 300 / 25.4;

export type BleedMethod = 'replicate' | 'mirror' | 'edge';

export interface GenerateBleedRequest {
  imageUrl: string;
  method: BleedMethod;
  bleedMm: number;
  // For replicate method - user can provide a specific color
  colorR?: number;
  colorG?: number;
  colorB?: number;
}

export interface GenerateBleedResponse {
  image: string;
  width: number;
  height: number;
}

/**
 * Convert mm to pixels at 300 DPI
 */
function mmToPx(mm: number): number {
  return Math.round(mm * MM_TO_PX_300DPI);
}

/**
 * Extract the most common color from the outer 5px border
 * This is used as a default suggestion for the user
 */
async function extractBorderColor(
  buffer: Buffer
): Promise<{ r: number; g: number; b: number }> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const sampleSize = Math.min(5, Math.floor(Math.min(width, height) / 5));

  // Extract edge strips
  const edges: Buffer[] = [];

  // Get all edge pixels
  const [topEdge, bottomEdge, leftEdge, rightEdge] = await Promise.all([
    image.clone().extract({ left: 0, top: 0, width, height: sampleSize }).raw().toBuffer(),
    image.clone().extract({ left: 0, top: height - sampleSize, width, height: sampleSize }).raw().toBuffer(),
    image.clone().extract({ left: 0, top: sampleSize, width: sampleSize, height: height - sampleSize * 2 }).raw().toBuffer(),
    image.clone().extract({ left: width - sampleSize, top: sampleSize, width: sampleSize, height: height - sampleSize * 2 }).raw().toBuffer(),
  ]);

  edges.push(topEdge, bottomEdge, leftEdge, rightEdge);
  const allEdgePixels = Buffer.concat(edges);

  // Find most common color
  const colorCounts = new Map<string, { r: number; g: number; b: number; count: number }>();
  const channels = metadata.channels || 3;

  for (let i = 0; i < allEdgePixels.length; i += channels) {
    const r = allEdgePixels[i];
    const g = allEdgePixels[i + 1];
    const b = allEdgePixels[i + 2];
    const key = `${r},${g},${b}`;

    const existing = colorCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorCounts.set(key, { r, g, b, count: 1 });
    }
  }

  let mostCommon = { r: 0, g: 0, b: 0, count: 0 };
  for (const color of colorCounts.values()) {
    if (color.count > mostCommon.count) {
      mostCommon = color;
    }
  }

  return { r: mostCommon.r, g: mostCommon.g, b: mostCommon.b };
}

/**
 * REPLICATE method: Extend canvas with a solid color
 * Either user-provided color or auto-detected from border
 */
async function generateReplicateBleed(
  buffer: Buffer,
  bleedPx: number,
  userColor?: { r: number; g: number; b: number }
): Promise<Buffer> {
  const image = sharp(buffer);
  
  // Use user-provided color or extract from border
  const edgeColor = userColor || await extractBorderColor(buffer);

  // Extend canvas with the color
  const result = await image
    .extend({
      top: bleedPx,
      bottom: bleedPx,
      left: bleedPx,
      right: bleedPx,
      background: { r: edgeColor.r, g: edgeColor.g, b: edgeColor.b, alpha: 1 },
    })
    .png()
    .toBuffer();

  return result;
}

/**
 * MIRROR method: Extend canvas by mirroring edge pixels
 */
async function generateMirrorBleed(
  buffer: Buffer,
  bleedPx: number
): Promise<Buffer> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Extract edge strips
  const leftEdge = await image
    .clone()
    .extract({ left: 0, top: 0, width: bleedPx, height })
    .flop()
    .toBuffer();

  const rightEdge = await image
    .clone()
    .extract({ left: width - bleedPx, top: 0, width: bleedPx, height })
    .flop()
    .toBuffer();

  const topEdge = await image
    .clone()
    .extract({ left: 0, top: 0, width, height: bleedPx })
    .flip()
    .toBuffer();

  const bottomEdge = await image
    .clone()
    .extract({ left: 0, top: height - bleedPx, width, height: bleedPx })
    .flip()
    .toBuffer();

  // Create corner pieces (flip both directions)
  const topLeftCorner = await sharp(topEdge)
    .extract({ left: 0, top: 0, width: bleedPx, height: bleedPx })
    .flop()
    .toBuffer();

  const topRightCorner = await sharp(topEdge)
    .extract({ left: width - bleedPx, top: 0, width: bleedPx, height: bleedPx })
    .flop()
    .toBuffer();

  const bottomLeftCorner = await sharp(bottomEdge)
    .extract({ left: 0, top: 0, width: bleedPx, height: bleedPx })
    .flop()
    .toBuffer();

  const bottomRightCorner = await sharp(bottomEdge)
    .extract({ left: width - bleedPx, top: 0, width: bleedPx, height: bleedPx })
    .flop()
    .toBuffer();

  // Composite everything together
  const newWidth = width + bleedPx * 2;
  const newHeight = height + bleedPx * 2;

  const result = await sharp({
    create: {
      width: newWidth,
      height: newHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: buffer, left: bleedPx, top: bleedPx },
      { input: leftEdge, left: 0, top: bleedPx },
      { input: rightEdge, left: width + bleedPx, top: bleedPx },
      { input: topEdge, left: bleedPx, top: 0 },
      { input: bottomEdge, left: bleedPx, top: height + bleedPx },
      { input: topLeftCorner, left: 0, top: 0 },
      { input: topRightCorner, left: width + bleedPx, top: 0 },
      { input: bottomLeftCorner, left: 0, top: height + bleedPx },
      { input: bottomRightCorner, left: width + bleedPx, top: height + bleedPx },
    ])
    .png()
    .toBuffer();

  return result;
}

/**
 * EDGE method: Extend canvas by stretching the 1px outermost border outward
 * 
 * EXACT replication of the canvas drawImage behavior from edge-stretch-example.html:
 * 
 * Canvas drawImage with nearest-neighbor scaling replicates EACH PIXEL individually:
 * - A 1px strip stretched to bleedPx width becomes bleedPx copies of that pixel horizontally
 * - Each row/column is replicated pixel-by-pixel, not as a whole image resize
 * 
 * This is fundamentally different from image resizing - it's pixel replication.
 */
async function generateEdgeBleed(
  buffer: Buffer,
  bleedPx: number
): Promise<Buffer> {
  // Get raw pixel data from the image
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  const { data: src, info } = await image
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  
  const channels = info.channels;
  
  if (bleedPx === 0) {
    return sharp(src, { raw: { width, height, channels } }).png().toBuffer();
  }

  // Create output canvas with bleed
  const newWidth = width + bleedPx * 2;
  const newHeight = height + bleedPx * 2;
  const output = Buffer.alloc(newWidth * newHeight * 4);

  // Helper to get pixel from source
  const getPixel = (x: number, y: number): [number, number, number, number] => {
    const idx = (y * width + x) * channels;
    return [
      src[idx],
      src[idx + 1],
      src[idx + 2],
      channels === 4 ? src[idx + 3] : 255,
    ];
  };

  // Helper to set pixel in output
  const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    const idx = (y * newWidth + x) * 4;
    output[idx] = r;
    output[idx + 1] = g;
    output[idx + 2] = b;
    output[idx + 3] = a;
  };

  // Fill white background first
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      setPixel(x, y, 255, 255, 255, 255);
    }
  }

  // Sample edge pixels from slightly inside to avoid squaring artifacts
  const EDGE_INSET = 2;
  const leftEdgeX = EDGE_INSET;
  const rightEdgeX = width - 1 - EDGE_INSET;
  const topEdgeY = EDGE_INSET;
  const bottomEdgeY = height - 1 - EDGE_INSET;

  // Left edge: for each row, replicate the edge pixel bleedPx times horizontally
  // ctx.drawImage(originalImage, 0, 0, 1, h, 0, bleedPx, bleedPx, h)
  for (let y = 0; y < height; y++) {
    const pixel = getPixel(leftEdgeX, y);
    for (let x = 0; x < bleedPx; x++) {
      setPixel(x, y + bleedPx, pixel[0], pixel[1], pixel[2], pixel[3]);
    }
  }

  // Right edge: ctx.drawImage(originalImage, w-1, 0, 1, h, bleedPx+w, bleedPx, bleedPx, h)
  for (let y = 0; y < height; y++) {
    const pixel = getPixel(rightEdgeX, y);
    for (let x = 0; x < bleedPx; x++) {
      setPixel(bleedPx + width + x, y + bleedPx, pixel[0], pixel[1], pixel[2], pixel[3]);
    }
  }

  // Top edge: ctx.drawImage(originalImage, 0, 0, w, 1, bleedPx, 0, w, bleedPx)
  for (let x = 0; x < width; x++) {
    const pixel = getPixel(x, topEdgeY);
    for (let y = 0; y < bleedPx; y++) {
      setPixel(x + bleedPx, y, pixel[0], pixel[1], pixel[2], pixel[3]);
    }
  }

  // Bottom edge: ctx.drawImage(originalImage, 0, h-1, w, 1, bleedPx, bleedPx+h, w, bleedPx)
  for (let x = 0; x < width; x++) {
    const pixel = getPixel(x, bottomEdgeY);
    for (let y = 0; y < bleedPx; y++) {
      setPixel(x + bleedPx, bleedPx + height + y, pixel[0], pixel[1], pixel[2], pixel[3]);
    }
  }

  // Corners: single pixel stretched to bleedPx x bleedPx
  // Top-left: ctx.drawImage(originalImage, 0, 0, 1, 1, 0, 0, bleedPx, bleedPx)
  const topLeftPixel = getPixel(leftEdgeX, topEdgeY);
  for (let y = 0; y < bleedPx; y++) {
    for (let x = 0; x < bleedPx; x++) {
      setPixel(x, y, topLeftPixel[0], topLeftPixel[1], topLeftPixel[2], topLeftPixel[3]);
    }
  }

  // Top-right: ctx.drawImage(originalImage, w-1, 0, 1, 1, bleedPx+w, 0, bleedPx, bleedPx)
  const topRightPixel = getPixel(rightEdgeX, topEdgeY);
  for (let y = 0; y < bleedPx; y++) {
    for (let x = 0; x < bleedPx; x++) {
      setPixel(bleedPx + width + x, y, topRightPixel[0], topRightPixel[1], topRightPixel[2], topRightPixel[3]);
    }
  }

  // Bottom-left: ctx.drawImage(originalImage, 0, h-1, 1, 1, 0, bleedPx+h, bleedPx, bleedPx)
  const bottomLeftPixel = getPixel(leftEdgeX, bottomEdgeY);
  for (let y = 0; y < bleedPx; y++) {
    for (let x = 0; x < bleedPx; x++) {
      setPixel(x, bleedPx + height + y, bottomLeftPixel[0], bottomLeftPixel[1], bottomLeftPixel[2], bottomLeftPixel[3]);
    }
  }

  // Bottom-right: ctx.drawImage(originalImage, w-1, h-1, 1, 1, bleedPx+w, bleedPx+h, bleedPx, bleedPx)
  const bottomRightPixel = getPixel(rightEdgeX, bottomEdgeY);
  for (let y = 0; y < bleedPx; y++) {
    for (let x = 0; x < bleedPx; x++) {
      setPixel(bleedPx + width + x, bleedPx + height + y, bottomRightPixel[0], bottomRightPixel[1], bottomRightPixel[2], bottomRightPixel[3]);
    }
  }

  // Original image: ctx.drawImage(originalImage, bleedPx, bleedPx)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = getPixel(x, y);
      setPixel(x + bleedPx, y + bleedPx, pixel[0], pixel[1], pixel[2], pixel[3]);
    }
  }

  // Return as PNG
  return sharp(output, { raw: { width: newWidth, height: newHeight, channels: 4 } })
    .png()
    .toBuffer();
}

/**
 * Fetch image from URL or decode base64
 */
async function fetchImage(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('data:')) {
    const base64Data = imageUrl.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<GenerateBleedResponse | { error: string }>> {
  try {
    const body: GenerateBleedRequest = await request.json();
    const { imageUrl, method, bleedMm, colorR, colorG, colorB } = body;

    // Validate inputs
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    if (!['replicate', 'mirror', 'edge'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid method. Must be replicate, mirror, or edge' },
        { status: 400 }
      );
    }

    if (bleedMm < 0 || bleedMm > 10) {
      return NextResponse.json(
        { error: 'bleedMm must be between 0 and 10' },
        { status: 400 }
      );
    }

    // If bleed is 0, return original image
    if (bleedMm === 0) {
      const buffer = await fetchImage(imageUrl);
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const pngBuffer = await image.png().toBuffer();

      return NextResponse.json({
        image: `data:image/png;base64,${pngBuffer.toString('base64')}`,
        width: metadata.width || 0,
        height: metadata.height || 0,
      });
    }

    // Fetch the image
    const buffer = await fetchImage(imageUrl);

    // Convert bleed mm to pixels at 300 DPI
    const bleedPx = mmToPx(bleedMm);

    // Process based on method
    let resultBuffer: Buffer;
    switch (method) {
      case 'replicate': {
        // Use user-provided color if given
        const userColor = (colorR !== undefined && colorG !== undefined && colorB !== undefined)
          ? { r: colorR, g: colorG, b: colorB }
          : undefined;
        resultBuffer = await generateReplicateBleed(buffer, bleedPx, userColor);
        break;
      }
      case 'mirror':
        resultBuffer = await generateMirrorBleed(buffer, bleedPx);
        break;
      case 'edge':
        resultBuffer = await generateEdgeBleed(buffer, bleedPx);
        break;
      default:
        resultBuffer = buffer;
    }

    // Get dimensions of result
    const resultImage = sharp(resultBuffer);
    const resultMetadata = await resultImage.metadata();

    // Convert to base64
    const base64Result = resultBuffer.toString('base64');

    return NextResponse.json({
      image: `data:image/png;base64,${base64Result}`,
      width: resultMetadata.width || 0,
      height: resultMetadata.height || 0,
    });
  } catch (error) {
    console.error('Error generating bleed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to suggest a border color from an image
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const imageUrl = request.nextUrl.searchParams.get('imageUrl');
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const buffer = await fetchImage(imageUrl);
    const color = await extractBorderColor(buffer);

    return NextResponse.json({ color });
  } catch (error) {
    console.error('Error extracting color:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
