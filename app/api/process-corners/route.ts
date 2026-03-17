import { NextRequest, NextResponse } from 'next/server';
import { stretchCorners } from '@/lib/image-processing';

export interface ProcessCornersRequest {
  imageUrl: string;
}

export interface ProcessCornersResponse {
  image: string;
  width: number;
  height: number;
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

/**
 * POST /api/process-corners
 * 
 * Processes a card image to stretch transparent rounded corners to the edges.
 * This is a mandatory preprocessing step for all card images.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ProcessCornersResponse | { error: string }>> {
  try {
    const body: ProcessCornersRequest = await request.json();
    const { imageUrl } = body;

    // Validate inputs
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    // Fetch the image
    const buffer = await fetchImage(imageUrl);

    // Process corners
    const resultBuffer = await stretchCorners(buffer);

    // Get dimensions from the processed image
    const sharp = (await import('sharp')).default;
    const imageInfo = await sharp(resultBuffer).metadata();

    // Convert to base64
    const base64Result = resultBuffer.toString('base64');

    return NextResponse.json({
      image: `data:image/png;base64,${base64Result}`,
      width: imageInfo.width || 0,
      height: imageInfo.height || 0,
    });
  } catch (error) {
    console.error('Error processing corners:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
