import test from 'node:test';
import assert from 'node:assert/strict';
import { generateComposition } from '../src/engine/generate.ts';
import { applyOperation, OPERATION_KINDS } from '../src/engine/operations.ts';

const input = {
  title: 'A study\nin form.', metadata: '2026 / 001',
  image: { id: 'sample', name: 'test', src: '/sample.svg', width: 1200, height: 900, origin: 'sample' },
};
const unlocked = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };

test('creative operations are serialisable, deterministic, and preserve their source', () => {
  for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
    const parent = generateComposition({ system, input, seed: 11 });
    const original = structuredClone(parent);
    for (const kind of OPERATION_KINDS) {
      const recipe = { kind, intensity: .65, seed: 18 };
      const result = applyOperation(parent, unlocked, recipe);
      assert.deepEqual(result, applyOperation(parent, unlocked, recipe));
      assert.deepEqual(JSON.parse(JSON.stringify(result.operations)), [recipe]);
      assert.deepEqual(result.source, parent.source);
      assert.ok(result.elements.length > 0);
      for (const element of result.elements) {
        if (!('box' in element)) continue;
        assert.ok(element.box.x >= 0 && element.box.y >= 0, `${system} ${kind} ${element.id} starts inside`);
        assert.ok(element.box.x + element.box.width <= result.width + .001, `${system} ${kind} ${element.id} fits width`);
        assert.ok(element.box.y + element.box.height <= result.height + .001, `${system} ${kind} ${element.id} fits height`);
      }
    }
    assert.deepEqual(parent, original);
  }
});

test('locks preserve the held visual layers across all operations', () => {
  const parent = generateComposition({ system: 'ORDER', input, seed: 7 });
  const heldTitle = parent.elements.find((item) => item.id === 'title');
  const heldImage = parent.elements.find((item) => item.id === 'source-image');
  const locks = { GRID: true, TYPE: true, IMAGE: true, TEXTURE: true };
  for (const kind of OPERATION_KINDS) {
    const result = applyOperation(parent, locks, { kind, intensity: 1, seed: 4 });
    assert.deepEqual(result.elements.find((item) => item.id === 'title'), heldTitle, kind);
    assert.deepEqual(result.elements.find((item) => item.id === 'source-image'), heldImage, kind);
    assert.deepEqual(result.grid, parent.grid, kind);
  }
});

test('fracture produces independently clipped image slices and broken type', () => {
  const parent = generateComposition({ system: 'ORDER', input, seed: 7 });
  const result = applyOperation(parent, unlocked, { kind: 'FRACTURE', intensity: .7, seed: 11 });
  assert.ok(result.elements.filter((item) => item.kind === 'image').length >= 5);
  assert.ok(result.elements.every((item) => item.id !== 'title'));
  assert.ok(result.elements.some((item) => item.id === 'title-fragment-b'));
});
