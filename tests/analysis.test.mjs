import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeImagePixels } from '../src/engine/analyzeImage.ts';

test('pixel analysis finds tonal balance and a quiet area deterministically', () => {
  const width = 16, height = 16;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    const value = x < 8 ? 25 : 240;
    pixels.set([value, value, value, 255], offset);
  }
  const analysis = analyzeImagePixels(pixels, width, height);
  assert.deepEqual(analysis, analyzeImagePixels(pixels, width, height));
  assert.ok(analysis.balanceX < .5);
  assert.ok(analysis.quietX > .5);
  assert.ok(analysis.contrast > .5);
  assert.ok(analysis.edgeDensity > 0);
});

test('analysis rejects invalid pixel dimensions', () => {
  assert.throws(() => analyzeImagePixels(new Uint8ClampedArray(3), 16, 16), /RGBA/);
});
