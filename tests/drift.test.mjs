import test from 'node:test';
import assert from 'node:assert/strict';
import { generateComposition } from '../src/engine/generate.ts';
import { generateFamily } from '../src/engine/family.ts';
import { driftFrame } from '../src/engine/drift.ts';
import { mutateComposition } from '../src/engine/mutate.ts';

const input = { title: 'A study\nin form.', metadata: 'Visual exploration\n2026 / No. 001', image: { id: 'sample', name: 'sample', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' } };
const recipe = { mode: 'SLIP', duration: 4, speed: 1, intensity: .8, direction: 'RIGHT', loop: false, seed: 8 };

test('DRIFT frames are deterministic, leave the parent untouched and fit every family format', () => {
  for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
    const parent = generateComposition({ system, input, seed: 11 });
    const before = structuredClone(parent);
    for (const document of [parent, ...generateFamily(parent)]) {
      for (const mode of ['SLIP', 'DECAY', 'REPEAT']) {
        const setting = { ...recipe, mode };
        const start = driftFrame(document, setting, 0);
        const middle = driftFrame(document, setting, 2);
        assert.deepEqual(start, document);
        assert.deepEqual(middle, driftFrame(document, setting, 2));
        assert.notDeepEqual(middle.elements, document.elements);
        for (const element of middle.elements) {
          if (!('box' in element)) continue;
          assert.ok(element.box.x >= 0 && element.box.y >= 0, `${mode} ${document.familyAsset?.format} ${element.id}`);
          assert.ok(element.box.x + element.box.width <= document.width + 1, `${mode} ${document.familyAsset?.format} ${element.id}`);
          assert.ok(element.box.y + element.box.height <= document.height + 1, `${mode} ${document.familyAsset?.format} ${element.id}`);
        }
      }
    }
    assert.deepEqual(parent, before);
  }
});

test('the loop returns to its first composition and direction changes the motion', () => {
  const parent = generateComposition({ system: 'ORDER', input, seed: 11 });
  const loop = { ...recipe, loop: true };
  assert.deepEqual(driftFrame(parent, loop, 0), driftFrame(parent, loop, 4));
  assert.notDeepEqual(driftFrame(parent, recipe, 2), driftFrame(parent, { ...recipe, direction: 'UP' }, 2));
  assert.throws(() => driftFrame(parent, { ...recipe, duration: 0 }, 2));
});

test('an attached motion recipe survives mutation as serialisable document data', () => {
  const parent = generateComposition({ system: 'ORDER', input, seed: 11 });
  const attached = { ...parent, drift: recipe };
  const locks = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };
  const next = mutateComposition(attached, locks, 12);
  assert.deepEqual(next.drift, recipe);
  assert.deepEqual(attached.drift, recipe);
});

test('fractional-speed loops close cleanly and every held layer stays unchanged', () => {
  const parent = generateComposition({ system: 'TENSION', input, seed: 11 });
  for (const speed of [.25, .7, 1.5, 2.3, 3]) {
    const setting = { ...recipe, loop: true, speed };
    assert.deepEqual(driftFrame(parent, setting, 0), driftFrame(parent, setting, setting.duration));
  }
  for (const mode of ['SLIP', 'DECAY', 'REPEAT']) {
    const setting = { ...recipe, mode, locks: { GRID: false, TYPE: true, IMAGE: true, TEXTURE: true } };
    const frame = driftFrame(parent, setting, 2);
    for (const element of parent.elements.filter(item => ['text', 'image', 'texture'].includes(item.kind))) assert.deepEqual(frame.elements.find(item => item.id === element.id), element);
    const gridHeld = driftFrame(parent, { ...setting, locks: { GRID: true, TYPE: false, IMAGE: false, TEXTURE: false } }, 2);
    assert.deepEqual(gridHeld.elements, parent.elements);
  }
});
