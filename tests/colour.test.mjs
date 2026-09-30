import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeImagePixels } from '../src/engine/analyzeImage.ts';
import { generateComposition } from '../src/engine/generate.ts';
import { resolveColour, withColour } from '../src/engine/colour.ts';
import { mutateComposition } from '../src/engine/mutate.ts';

const image = { id: 'sample', name: 'sample', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' };
const input = { title: 'Colour study', metadata: '2026', image };
const locks = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };

test('pixel analysis extracts a deterministic palette from local image data', () => {
  const pixels = new Uint8ClampedArray(4 * 4 * 4);
  for (let i = 0; i < 16; i++) {
    const colour = i < 7 ? [24, 58, 80] : i < 12 ? [188, 74, 51] : [220, 196, 145];
    pixels.set([...colour, 255], i * 4);
  }
  const analysis = analyzeImagePixels(pixels, 4, 4);
  assert.deepEqual(analysis.palette, analyzeImagePixels(pixels, 4, 4).palette);
  assert.equal(new Set(analysis.palette).size, 3);
});

test('five colour systems resolve distinct SVG-ready ink palettes without changing geometry', () => {
  const parent = generateComposition({ system: 'TENSION', input: { ...input, image: { ...image, analysis: { palette: ['#143450', '#bc4a33', '#dcc491'] } } }, seed: 11 });
  const modes = ['MONOCHROME', 'DUOTONE', 'TRITONE', 'EXTRACTED_PALETTE', 'INK_SYSTEM'];
  const results = modes.map((mode) => {
    const coloured = withColour(parent, { mode, intensity: 1, registration: .5, seed: 4 });
    assert.deepEqual(coloured.elements, parent.elements);
    assert.deepEqual(coloured.source, parent.source);
    return resolveColour(coloured);
  });
  assert.equal(new Set(results.map((item) => item.stops.join(','))).size, 5);
  assert.equal(results[0].registration, 0);
  assert.equal(results[4].registration, .5);
  assert.deepEqual(parent.colour, undefined);
  const next = mutateComposition(withColour(parent, { mode: 'TRITONE', intensity: .8, registration: .2, seed: 4 }), locks, 12);
  assert.equal(next.colour.mode, 'TRITONE');
});
