import test from 'node:test';
import assert from 'node:assert/strict';
import { generateComposition } from '../src/engine/generate.ts';
import { advanceHistory, stepHistory } from '../src/engine/history.ts';
import { packRecovery, unpackRecovery } from '../src/lib/sessionRecovery.ts';
const image = { id: 'source', name: 'local.png', src: 'data:image/png;base64,aGVsbG8=', width: 1200, height: 900, origin: 'local' };
const input = { title: image.src, metadata: 'Literal source text', image };
const locks = { GRID: true, TYPE: false, IMAGE: false, TEXTURE: false };
const parent = generateComposition({ system: 'ORDER', input, seed: 11 });

test('recovery deduplicates image bytes across undo history and restores image references', async () => {
  const snapshot = { session: { system: 'ORDER', input, locks }, document: { ...parent, processing: { original: image, passes: [] } }, seedText: 'draft seed', undoStack: [parent], redoStack: [], directBase: parent };
  const stored = await packRecovery(snapshot);
  assert.equal(stored.images.length, 1);
  assert.equal(stored.snapshot.document.source.image.src, '__recovery_image_0__');
  assert.equal(stored.snapshot.document.source.title, image.src);
  assert.equal(snapshot.document.source.image.src, image.src);
  const { snapshot: restored, ownedUrls } = unpackRecovery(stored);
  try {
    assert.equal(restored.document.source.image.src, restored.undoStack[0].source.image.src);
    assert.equal(restored.document.source.image.src, restored.document.processing.original.src);
    assert.equal(await (await fetch(restored.document.source.image.src)).text(), 'hello');
    assert.deepEqual(restored.session.locks, locks);
    assert.equal(restored.seedText, 'draft seed');
    assert.throws(() => unpackRecovery({ ...stored, version: 99 }));
  } finally { ownedUrls.forEach(url => URL.revokeObjectURL(url)); }
});

test('undo and redo restore snapshots; a new branch discards redo and history stays bounded', () => {
  let history = { document: parent, past: [], future: [] };
  const next = { ...parent, seed: 12 };
  history = advanceHistory(history, next);
  const undone = stepHistory(history, 'undo');
  assert.equal(undone.document, parent);
  assert.equal(stepHistory(undone, 'redo').document, next);
  const branched = advanceHistory(undone, { ...parent, seed: 18 });
  assert.equal(branched.future.length, 0);
  assert.equal(stepHistory(branched, 'redo'), branched);
  for (let seed = 20; seed < 100; seed++) history = advanceHistory(history, { ...parent, seed });
  assert.equal(history.past.length, 40);
  assert.equal(history.document.seed, 99);
  assert.deepEqual(parent.seed, 11);
});
