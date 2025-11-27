/**
 * Client-side compression service for images, videos, and 3D models
 * Target: 200-500 KB file size with balanced quality
 */

export interface CompressionResult {
  compressedBlob: Blob;
  compressedUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Compress an image to WebP format with target size of 200-500 KB
 */
export async function compressImage(
  imageUrl: string,
  targetSizeKB: number = 350
): Promise<CompressionResult> {
  try {
    // Fetch the original image
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const originalSize = blob.size;

    // Load image
    const img = await loadImageFromBlob(blob);
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Calculate dimensions (max 2048px on longest side for balanced quality)
    let width = img.width;
    let height = img.height;
    const maxDimension = 2048;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    // Binary search for optimal quality to hit target size
    let quality = 0.85;
    let compressedBlob = await canvasToBlob(canvas, 'image/webp', quality);
    
    // If still too large, reduce quality
    const targetBytes = targetSizeKB * 1024;
    if (compressedBlob.size > targetBytes * 1.5) {
      let minQuality = 0.5;
      let maxQuality = 0.95;
      
      for (let i = 0; i < 5; i++) {
        quality = (minQuality + maxQuality) / 2;
        compressedBlob = await canvasToBlob(canvas, 'image/webp', quality);
        
        if (compressedBlob.size > targetBytes) {
          maxQuality = quality;
        } else if (compressedBlob.size < targetBytes * 0.5) {
          minQuality = quality;
        } else {
          break;
        }
      }
    }

    const compressedUrl = URL.createObjectURL(compressedBlob);
    const compressedSize = compressedBlob.size;

    console.log(`Image compressed: ${(originalSize / 1024).toFixed(0)}KB → ${(compressedSize / 1024).toFixed(0)}KB (${((1 - compressedSize / originalSize) * 100).toFixed(1)}% reduction)`);

    return {
      compressedBlob,
      compressedUrl,
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
}

/**
 * Generate a compressed thumbnail for video
 */
export async function compressVideoThumbnail(
  videoUrl: string,
  timeInSeconds: number = 1
): Promise<CompressionResult> {
  try {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });

    video.currentTime = timeInSeconds;
    await new Promise((resolve) => {
      video.onseeked = resolve;
    });

    // Create canvas for thumbnail
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Scale down to reasonable size
    const maxDimension = 1280;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    // Compress to WebP
    const compressedBlob = await canvasToBlob(canvas, 'image/webp', 0.8);
    const compressedUrl = URL.createObjectURL(compressedBlob);

    return {
      compressedBlob,
      compressedUrl,
      originalSize: 0, // Video size not relevant here
      compressedSize: compressedBlob.size,
      compressionRatio: 1
    };
  } catch (error) {
    console.error('Error generating video thumbnail:', error);
    throw error;
  }
}

/**
 * Compress 3D/CAD model poster/thumbnail
 */
export async function compress3DPoster(
  posterUrl: string
): Promise<CompressionResult> {
  // Reuse image compression for 3D posters
  return compressImage(posterUrl, 250); // Smaller target for 3D thumbnails
}

// Helper functions

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      type,
      quality
    );
  });
}

/**
 * Upload compressed file to storage
 */
export async function uploadCompressedFile(
  blob: Blob,
  originalPath: string,
  fileType: 'image' | 'video' | '3d' | 'cad'
): Promise<string> {
  const { supabase } = await import('@/integrations/supabase/client');
  
  // Generate compressed file path
  const pathParts = originalPath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const fileNameWithoutExt = fileName.split('.')[0];
  const compressedPath = `${pathParts.slice(0, -1).join('/')}/compressed_${fileNameWithoutExt}.webp`;

  const { data, error } = await supabase.storage
    .from('generations')
    .upload(compressedPath, blob, {
      contentType: 'image/webp',
      upsert: true
    });

  if (error) throw error;
  if (!data) throw new Error('No data returned from upload');

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('generations')
    .getPublicUrl(compressedPath);

  return urlData.publicUrl;
}
