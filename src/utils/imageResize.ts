const DEFAULT_MAX_SIZE = 400;
const DEFAULT_QUALITY = 0.85;

/**
 * Resize an image file to fit within maxSize×maxSize, preserve aspect ratio,
 * and return a compressed WebP or JPEG data URL.
 */
export async function resizeImageToDataUrl(
  file: File,
  maxSize = DEFAULT_MAX_SIZE,
  quality = DEFAULT_QUALITY,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Could not process image.');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webp = canvas.toDataURL('image/webp', quality);
  if (webp.startsWith('data:image/webp')) {
    return webp;
  }

  return canvas.toDataURL('image/jpeg', quality);
}
