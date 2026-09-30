import test from 'node:test';
import assert from 'node:assert/strict';
import { establishLineage, evolveDocument } from '../src/engine/lineage.ts';
import { generateComposition } from '../src/engine/generate.ts';

const input = { title: 'Study', metadata: '', image: { id: 'sample', name: 'sample', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' } };
const unlocked = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };

test('lineage records parentage, seed, event and lock snapshot without changing the parent', () => {
  const root = establishLineage(generateComposition({ system: 'ORDER', input, seed: 4 }), 'root', '2026-09-30T00:00:00.000Z');
  const child = evolveDocument(root, generateComposition({ system: 'TENSION', input, seed: 9 }), 'MUTATE', { ...unlocked, IMAGE: true }, 'child', '2026-09-30T00:01:00.000Z');
  const grandchild = evolveDocument(child, generateComposition({ system: 'SILENCE', input, seed: 11 }), 'DIRECT', unlocked, 'grandchild', '2026-09-30T00:02:00.000Z');
  assert.deepEqual(root.lineage.parentIds, []);
  assert.deepEqual(child.lineage.parentIds, ['root']);
  assert.deepEqual(grandchild.lineage.parentIds, ['child']);
  assert.equal(grandchild.lineage.generation, 2);
  assert.equal(grandchild.lineage.rootSeed, 4);
  assert.equal(child.lineage.locks.IMAGE, true);
  assert.equal(root.lineage.locks.IMAGE, false);
  assert.equal(root.seed, 4);
});
