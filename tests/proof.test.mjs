import test from 'node:test';
import assert from 'node:assert/strict';
import { generateComposition } from '../src/engine/generate.ts';
import { generateProof } from '../src/engine/proof.ts';

const input = {
  title: 'A study\nin form.', metadata: '2026 / 001',
  image: { id: 'sample', name: 'test', src: '/sample.svg', width: 1200, height: 900, origin: 'sample' },
};
const unlocked = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };

test('proof creates distinct deterministic studies in each system', () => {
  for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
    const parent = generateComposition({ system, input, seed: 999995 });
    for (const size of [4, 9, 12, 16]) {
      const proof = generateProof(parent, unlocked, size);
      assert.equal(proof.length, size);
      assert.equal(new Set(proof.map((doc) => doc.seed)).size, size);
      assert.deepEqual(proof, generateProof(parent, unlocked, size));
      assert.ok(proof.every((doc) => doc.system === system));
    }
  }
});

test('proof preserves locked image and grid from its parent', () => {
  const parent = generateComposition({ system: 'TENSION', input, seed: 11 });
  const locks = { GRID: true, TYPE: false, IMAGE: true, TEXTURE: false };
  const proof = generateProof(parent, locks, 12);
  const image = parent.elements.find((element) => element.kind === 'image');
  assert.equal(new Set(proof.map((doc) => doc.seed)).size, 12);
  for (const doc of proof) {
    assert.deepEqual(doc.grid, parent.grid);
    assert.deepEqual(doc.elements.find((element) => element.kind === 'image'), image);
    assert.equal(doc.family, parent.family);
  }
});
