import type { ImageAsset } from '../domain/composition';
import type { ProcessingPass } from '../domain/document';
import { analyzeImagePixels } from '../engine/analyzeImage';
import type { Raster } from '../processing/passes';

async function runPasses(raster: Raster, passes: ProcessingPass[], signal?: AbortSignal): Promise<Raster> {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (typeof Worker === 'undefined') {
    const { applyPassStack } = await import('../processing/passes');
    return applyPassStack(raster, passes);
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../processing/passWorker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => { worker.terminate(); signal?.removeEventListener('abort', cancel); };
    const cancel = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
    signal?.addEventListener('abort', cancel, { once: true });
    worker.onmessage = (event: MessageEvent<{ raster?: Raster; error?: string }>) => {
      cleanup();
      if (event.data.raster) resolve(event.data.raster);
      else reject(new Error(event.data.error ?? 'The processing worker returned no image.'));
    };
    worker.onerror = () => { cleanup(); reject(new Error('The processing worker could not run.')); };
    worker.postMessage({ raster, passes }, [raster.data.buffer]);
  });
}

const previewCache = new Map<string, ImageAsset>();

/** Browser boundary: decode once, run the pure pass stack, then encode a portable result. */
export async function processImage(original: ImageAsset, passes: ProcessingPass[], signal?: AbortSignal): Promise<ImageAsset> {
  if (!passes.some((pass) => pass.enabled && pass.kind !== 'RAW')) return original;
  const key = JSON.stringify([original.src, passes]);
  const cached = previewCache.get(key);
  if (cached) return cached;
  const image = new Image();
  image.src = original.src;
  await image.decode();
  const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Image processing is unavailable in this browser.');
  context.drawImage(image, 0, 0, width, height);
  const originalPixels = context.getImageData(0, 0, width, height);
  const result = await runPasses({ width, height, data: originalPixels.data }, passes, signal);
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  context.putImageData(new ImageData(new Uint8ClampedArray(result.data), width, height), 0, 0);
  const sample = document.createElement('canvas');
  sample.width = 64; sample.height = 64;
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  if (!sampleContext) throw new Error('Image analysis is unavailable in this browser.');
  sampleContext.drawImage(canvas, 0, 0, 64, 64);
  const analysis = analyzeImagePixels(sampleContext.getImageData(0, 0, 64, 64).data, 64, 64);
  const asset: ImageAsset = {
    id: crypto.randomUUID(), name: `${original.name} / PASS`, src: canvas.toDataURL('image/webp', .94),
    width, height, origin: 'local', analysis,
  };
  previewCache.set(key, asset);
  while (previewCache.size > 4) previewCache.delete(previewCache.keys().next().value!);
  return asset;
}
