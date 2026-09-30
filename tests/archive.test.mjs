import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveTags, filterArchive } from '../src/engine/archive.ts';
import { exportDimensions } from '../src/lib/exportComposition.ts';
import { generateComposition } from '../src/engine/generate.ts';
import { hydrateVariation } from '../src/lib/variations.ts';
const input = { title: 'Archive', metadata: '', image: { id: 'sample', name: 'sample', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' } };
const parent = generateComposition({ system: 'ORDER', input, seed: 11 });
test('archive filters systems, operation stacks and date windows without modifying saved items', () => {
  const items = [
    { id: 'old', createdAt: '2026-08-01T10:00:00Z', document: parent },
    { id: 'recent', createdAt: '2026-09-29T12:00:00Z', document: { ...parent, system: 'SILENCE', operations: [{ kind: 'FRACTURE', intensity: .5, seed: 1 }] } },
    { id: 'today', createdAt: '2026-09-30T12:00:00Z', document: { ...parent, colour: { mode: 'INK_SYSTEM', intensity: 1, registration: .5, seed: 3 } } },
  ];
  const before = structuredClone(items);
  const filter = { system: 'ALL', operation: 'ALL', period: '7_DAYS', order: 'NEWEST' };
  const now = new Date('2026-09-30T18:00:00Z');
  assert.deepEqual(filterArchive(items, filter, now).map(x => x.id), ['today', 'recent']);
  assert.deepEqual(filterArchive(items, { ...filter, system: 'SILENCE', operation: 'FRACTURE' }, now).map(x => x.id), ['recent']);
  assert.deepEqual(filterArchive(items, { ...filter, period: 'ALL', order: 'OLDEST' }, now).map(x => x.id), ['old', 'recent', 'today']);
  assert.ok(archiveTags(items[2].document).includes('COLOUR / INK_SYSTEM'));
  assert.deepEqual(items, before);
});
test('legacy variations hydrate with stable lineage and retain their original geometry', () => {
  const saved = { id: 'old-record', createdAt: '2026-09-01T12:00:00Z', document: parent };
  const { variation, ownedUrls } = hydrateVariation(saved);
  assert.equal(variation.document.lineage.id, 'legacy-old-record');
  assert.equal(variation.document.lineage.rootSeed, parent.seed);
  assert.deepEqual(variation.document.elements, parent.elements);
  assert.deepEqual(ownedUrls, []);
  assert.equal(saved.document.lineage, undefined);
});
test('PNG resolution is explicit and vector exports keep native dimensions', () => {
  assert.deepEqual(exportDimensions(900, 1200, 3), [2700, 3600]);
  assert.deepEqual(exportDimensions(1600, 600, 1), [1600, 600]);
  assert.throws(() => exportDimensions(900, 1200, 9));
});
