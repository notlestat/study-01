import type { ProcessingPass } from '../domain/document.ts';

import { PASS_KINDS } from './kinds.ts';
export { PASS_KINDS } from './kinds.ts';
export interface Raster { width: number; height: number; data: Uint8ClampedArray; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const lum = (data: Uint8ClampedArray, i: number) => data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722;
const noise = (x: number, y: number, seed: number) => {
  let value = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(seed + 1, 1442695041);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
};
const pixel = (x: number, y: number, width: number, height: number) => (Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * 4;
const setMono = (output: Uint8ClampedArray, i: number, value: number) => { output[i] = value; output[i + 1] = value; output[i + 2] = value; };

/** Each pass consumes the previous pass's pixels. No DOM or browser state enters this module. */
export function applyPass(source: Raster, pass: ProcessingPass): Raster {
  if (!PASS_KINDS.includes(pass.kind) || !Number.isFinite(pass.amount) || pass.amount < 0 || pass.amount > 1 || !Number.isSafeInteger(pass.seed)) throw new Error('Invalid processing pass.');
  if (source.width < 1 || source.height < 1 || source.data.length !== source.width * source.height * 4) throw new Error('Invalid source raster.');
  const { width, height } = source;
  const input = source.data;
  const output = new Uint8ClampedArray(input);
  const amount = pass.amount;
  if (!pass.enabled || pass.kind === 'RAW') return { width, height, data: output };
  let toneSum = 0, toneSquare = 0;
  for (let i = 0; i < input.length; i += 4) { const value = lum(input, i); toneSum += value; toneSquare += value * value; }
  const toneMean = toneSum / (width * height);
  const toneSpread = Math.max(24, Math.sqrt(Math.max(0, toneSquare / (width * height) - toneMean ** 2)));
  const normalize = (value: number) => clamp(128 + (value - toneMean) * 85 / toneSpread);

  if (pass.kind === 'HALFTONE') {
    const cell = Math.max(3, Math.round(4 + amount * 10));
    for (let cy = 0; cy < height; cy += cell) for (let cx = 0; cx < width; cx += cell) {
      let sum = 0, count = 0;
      for (let y = cy; y < Math.min(height, cy + cell); y++) for (let x = cx; x < Math.min(width, cx + cell); x++) { sum += lum(input, (y * width + x) * 4); count++; }
      const radius = Math.sqrt(1 - normalize(sum / count) / 255) * cell * .47;
      for (let y = cy; y < Math.min(height, cy + cell); y++) for (let x = cx; x < Math.min(width, cx + cell); x++) {
        const i = (y * width + x) * 4;
        setMono(output, i, Math.hypot(x - cx - cell / 2, y - cy - cell / 2) < radius ? 20 : 246);
      }
    }
    return { width, height, data: output };
  }

  const bitmapCells = new Map<number, number>();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const value = lum(input, i);
    const grain = noise(x, y, pass.seed) - .5;
    switch (pass.kind) {
      case 'THRESHOLD':
        setMono(output, i, value < toneMean + (amount - .5) * toneSpread * 1.2 ? 18 : 248);
        break;
      case 'DITHER': {
        const threshold = (BAYER[(y % 4) * 4 + x % 4] + .5) / 16 * 255;
        setMono(output, i, value + (grain * 18 * amount) < threshold ? 24 : 247);
        break;
      }
      case 'XEROX': {
        const band = noise(Math.floor(x / 19), Math.floor(y / 5), pass.seed + 7);
        const streak = noise(Math.floor(x / 2), 0, pass.seed + 8) > .987 ? -60 * amount : 0;
        const rough = value + grain * (85 + 115 * amount) + (band - .5) * 64 * amount + streak;
        setMono(output, i, rough < 138 ? 18 + Math.max(0, grain * 22) : 245 - Math.max(0, -grain * 35));
        break;
      }
      case 'BITMAP': {
        const cell = Math.max(2, Math.round(3 + amount * 15));
        const cx = Math.floor(x / cell) * cell, cy = Math.floor(y / cell) * cell;
        const key = cy * width + cx;
        if (!bitmapCells.has(key)) {
          let sum = 0, count = 0;
          for (let yy = cy; yy < Math.min(height, cy + cell); yy++) for (let xx = cx; xx < Math.min(width, cx + cell); xx++) { sum += lum(input, (yy * width + xx) * 4); count++; }
          const levels = amount > .85 ? 2 : 4;
          bitmapCells.set(key, Math.round(normalize(sum / count) / 255 * (levels - 1)) * 255 / (levels - 1));
        }
        const shade = bitmapCells.get(key)!;
        setMono(output, i, shade);
        break;
      }
      case 'OFFSET': {
        const shift = Math.round(1 + amount * 4);
        const cIndex = pixel(x - shift, y, width, height), mIndex = pixel(x + shift, y + shift, width, height), yIndex = pixel(x, y - shift, width, height);
        const cyan = 1 - input[cIndex] / 255, magenta = 1 - input[mIndex + 1] / 255, yellow = 1 - input[yIndex + 2] / 255;
        const black = Math.min(cyan, magenta, yellow) * .6;
        const screen = (xx: number, yy: number) => (BAYER[((yy % 4 + 4) % 4) * 4 + ((xx % 4 + 4) % 4)] + .5) / 16;
        const cInk = cyan * .82 > screen(x, y), mInk = magenta * .82 > screen(y + 1, x), yInk = yellow * .82 > screen(x + 2, y + 1), kInk = black > screen(x + 3, y + 2);
        output[i] = cInk ? 48 : 250; output[i + 1] = mInk ? 48 : 250; output[i + 2] = yInk ? 48 : 250;
        if (kInk) { output[i] *= .45; output[i + 1] *= .45; output[i + 2] *= .45; }
        break;
      }
      case 'EROSION': {
        const radius = amount > .55 ? 2 : 1;
        let retainsInk = value < toneMean;
        for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > radius + 1) continue;
          if (lum(input, pixel(x + dx, y + dy, width, height)) >= toneMean) retainsInk = false;
        }
        if (noise(x, y, pass.seed + 31) < amount * .09) retainsInk = false;
        setMono(output, i, retainsInk ? 22 : 248);
        break;
      }
      case 'SCANNER_DISPLACEMENT': {
        const line = Math.floor(y / Math.max(2, Math.round(3 + 7 * (1 - amount))));
        const shift = Math.round((noise(0, line, pass.seed) - .5) * 2 * (8 + amount * 75) + Math.sin(y * .09 + pass.seed) * amount * 9);
        const src = pixel(x + shift, y, width, height);
        output[i] = input[src]; output[i + 1] = input[src + 1]; output[i + 2] = input[src + 2];
        break;
      }
      case 'GRAIN': {
        const delta = grain * (35 + amount * 120);
        output[i] = clamp(input[i] + delta); output[i + 1] = clamp(input[i + 1] + delta); output[i + 2] = clamp(input[i + 2] + delta);
        break;
      }
      case 'INK_BLEED': {
        const radius = Math.round(1 + amount * 3);
        let darkest = value;
        for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > radius + 1) continue;
          darkest = Math.min(darkest, lum(input, pixel(x + dx, y + dy, width, height)));
        }
        const ink = Math.max(0, Math.min(1, (toneMean + toneSpread * .45 - darkest) / (toneSpread * .7)));
        setMono(output, i, 248 - ink * 224);
        break;
      }
      case 'CHANNEL_MISREGISTRATION': {
        const shift = Math.round(2 + amount * 18);
        output[i] = input[pixel(x - shift, y, width, height)];
        output[i + 1] = input[pixel(x, y + Math.round(shift / 2), width, height) + 1];
        output[i + 2] = input[pixel(x + shift, y, width, height) + 2];
        break;
      }
    }
  }
  return { width, height, data: output };
}

export function applyPassStack(source: Raster, passes: ProcessingPass[], through = passes.length): Raster {
  return passes.slice(0, through).reduce(applyPass, source);
}
