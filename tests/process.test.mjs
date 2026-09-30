import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPass, applyPassStack, PASS_KINDS } from '../src/processing/passes.ts';
import { generateComposition } from '../src/engine/generate.ts';
import { originalImageDocument, withProcessedImage } from '../src/engine/processDocument.ts';

const source = { width: 48, height: 48, data: new Uint8ClampedArray(48 * 48 * 4) };
for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
  const i = (y * 48 + x) * 4;
  source.data[i] = x * 5;
  source.data[i + 1] = y * 5;
  source.data[i + 2] = (x * 7 + y * 11) % 256;
  source.data[i + 3] = 255;
}
const pass = (kind, seed = 4) => ({ id: kind, kind, amount: .7, seed, enabled: true });

test('material passes are reproducible and visually distinct on the same raster', () => {
  const signatures = new Set();
  for (const kind of PASS_KINDS) {
    const first = applyPass(source, pass(kind));
    assert.deepEqual(first, applyPass(source, pass(kind)));
    assert.deepEqual(source.data[(10 * 48 + 10) * 4 + 3], 255);
    signatures.add(Buffer.from(first.data).toString('base64'));
  }
  assert.equal(signatures.size, PASS_KINDS.length);
});

test('PASS consumes the previous result and its order changes the outcome', () => {
  const xerox = pass('XEROX');
  const offset = pass('OFFSET');
  assert.notDeepEqual(applyPassStack(source, [xerox, offset]), applyPassStack(source, [offset, xerox]));
  assert.deepEqual(applyPassStack(source, [xerox, { ...offset, enabled: false }]), applyPass(source, xerox));
});

test('a processed document keeps its original source for comparison and restoration', () => {
  const image = { id: 'original', name: 'Original', src: 'data:image/png;base64,original', width: 48, height: 48, origin: 'local' };
  const document = generateComposition({ system: 'ORDER', input: { title: 'Study', metadata: '', image }, seed: 1 });
  const result = { ...image, id: 'processed', name: 'Processed', src: 'data:image/png;base64,processed' };
  const processed = withProcessedImage(document, result, [pass('XEROX')]);
  assert.equal(processed.source.image.id, 'processed');
  assert.equal(processed.processing.original.id, 'original');
  assert.ok(processed.elements.filter((element) => element.kind === 'image').every((element) => element.asset.id === 'processed'));
  assert.deepEqual(originalImageDocument(processed), document);
});
