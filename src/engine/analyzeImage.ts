import type { ImageAnalysis } from '../domain/composition.ts';

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Pure analysis of a downsampled RGBA image. No browser, model, or remote API. */
export function analyzeImagePixels(pixels: Uint8ClampedArray, width: number, height: number): ImageAnalysis {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 4 || height < 4 || pixels.length !== width * height * 4) {
    throw new Error('Image analysis needs a valid RGBA pixel grid.');
  }
  const luma = new Float32Array(width * height);
  const bins = new Map<number, { count: number; r: number; g: number; b: number }>();
  let sum = 0;
  for (let i = 0; i < luma.length; i++) {
    const offset = i * 4;
    const alpha = pixels[offset + 3] / 255;
    const value = (pixels[offset] * .2126 + pixels[offset + 1] * .7152 + pixels[offset + 2] * .0722) / 255;
    luma[i] = value * alpha + (1 - alpha);
    sum += luma[i];
    if (alpha > .5) {
      const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
      const key = (Math.floor(r / 32) << 8) | (Math.floor(g / 32) << 4) | Math.floor(b / 32);
      const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      bin.count++; bin.r += r; bin.g += g; bin.b += b;
      bins.set(key, bin);
    }
  }
  const mean = sum / luma.length;
  let variance = 0, edgeSum = 0, darkWeight = 0, darkX = 0, darkY = 0, focusWeight = 0, focusX = 0, focusY = 0;
  const cells = Array.from({ length: 16 }, () => ({ sum: 0, square: 0, edge: 0, count: 0 }));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x;
    const value = luma[index];
    variance += (value - mean) ** 2;
    const edge = (x + 1 < width ? Math.abs(value - luma[index + 1]) : 0)
      + (y + 1 < height ? Math.abs(value - luma[index + width]) : 0);
    edgeSum += edge;
    const nx = (x + .5) / width, ny = (y + .5) / height;
    const darkness = 1 - value;
    darkWeight += darkness; darkX += nx * darkness; darkY += ny * darkness;
    const focus = edge ** 1.5;
    focusWeight += focus; focusX += nx * focus; focusY += ny * focus;
    const cell = cells[Math.min(3, Math.floor(ny * 4)) * 4 + Math.min(3, Math.floor(nx * 4))];
    cell.sum += value; cell.square += value * value; cell.edge += edge; cell.count++;
  }
  const quiet = cells.map((cell, index) => {
    const localMean = cell.sum / cell.count;
    const localVariance = Math.max(0, cell.square / cell.count - localMean ** 2);
    // Low detail and light tone favour dark editorial typography.
    return { index, score: cell.edge / cell.count + Math.sqrt(localVariance) * .7 + (1 - localMean) * .15 };
  }).sort((a, b) => a.score - b.score || a.index - b.index)[0].index;
  const candidates = [...bins.values()].map((bin) => ({ r: bin.r / bin.count, g: bin.g / bin.count, b: bin.b / bin.count, count: bin.count }))
    .sort((a, b) => b.count - a.count);
  const selected: typeof candidates = [];
  for (const candidate of candidates) {
    if (selected.every((previous) => Math.hypot(candidate.r - previous.r, candidate.g - previous.g, candidate.b - previous.b) > 48)) selected.push(candidate);
    if (selected.length === 3) break;
  }
  const neutral = Math.round(mean * 255);
  while (selected.length < 3) selected.push({ r: neutral + (selected.length - 1) * 45, g: neutral + (selected.length - 1) * 45, b: neutral + (selected.length - 1) * 45, count: 0 });
  selected.sort((a, b) => (.2126 * a.r + .7152 * a.g + .0722 * a.b) - (.2126 * b.r + .7152 * b.g + .0722 * b.b));
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  const palette = selected.map((color) => `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`) as [string, string, string];
  return {
    meanLuminance: clamp(mean), contrast: clamp(Math.sqrt(variance / luma.length) * 2),
    edgeDensity: clamp(edgeSum / luma.length),
    balanceX: darkWeight ? clamp(darkX / darkWeight) : .5,
    balanceY: darkWeight ? clamp(darkY / darkWeight) : .5,
    focalX: focusWeight ? clamp(focusX / focusWeight) : .5,
    focalY: focusWeight ? clamp(focusY / focusWeight) : .5,
    quietX: (quiet % 4 + .5) / 4,
    quietY: (Math.floor(quiet / 4) + .5) / 4,
    quietLuminance: clamp(cells[quiet].sum / cells[quiet].count),
    palette,
  };
}
