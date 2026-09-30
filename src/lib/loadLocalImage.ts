import type { ImageAsset } from '../domain/composition';
import { analyzeImagePixels } from '../engine/analyzeImage';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif']);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function loadLocalImage(file: File): Promise<ImageAsset> {
  if (!IMAGE_TYPES.has(file.type)) throw new Error('Choose a PNG, JPEG, WebP, or AVIF image.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Choose an image smaller than 20 MB.');

  const src = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty image');
    const sampleSize = 64;
    const canvas = document.createElement('canvas');
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Image analysis is unavailable.');
    context.drawImage(image, 0, 0, sampleSize, sampleSize);
    const analysis = analyzeImagePixels(context.getImageData(0, 0, sampleSize, sampleSize).data, sampleSize, sampleSize);
    return {
      id: crypto.randomUUID(), name: file.name, src,
      width: image.naturalWidth, height: image.naturalHeight, origin: 'local', analysis,
    };
  } catch {
    URL.revokeObjectURL(src);
    throw new Error('This image could not be read. Try a different file.');
  }
}
