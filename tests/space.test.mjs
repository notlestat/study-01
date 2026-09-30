import test from 'node:test';
import assert from 'node:assert/strict';
import { generateComposition } from '../src/engine/generate.ts';
import { applySpaceZones, intersectsZone } from '../src/engine/space.ts';
import { mutateComposition } from '../src/engine/mutate.ts';

const input = { title: 'A study\nin form.', metadata: '2026 / 001', image: { id: 'sample', name: 'sample', src: '/sample.svg', width: 1200, height: 900, origin: 'sample' } };
const unlocked = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };
const zone = { id: 'center', shape: 'rectangle', box: { x: 300, y: 350, width: 300, height: 300 }, locked: false };

test('space reflows actual elements away from a zone, reproducibly', () => {
  for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
    const parent = generateComposition({ system, input, seed: 11 });
    const result = applySpaceZones(parent, [zone], unlocked);
    assert.deepEqual(result, applySpaceZones(parent, [zone], unlocked));
    assert.deepEqual(result.spaceZones, [zone]);
    assert.ok(result.elements.every((element) => !('box' in element) || !intersectsZone(element.box, zone)), system);
    assert.ok(result.elements.some((element, index) => JSON.stringify(element) !== JSON.stringify(parent.elements[index])), `${system} should recompose`);
  }
});

test('ellipse and freeform use their drawn shape rather than only their bounding rectangle', () => {
  const box = { x: 100, y: 100, width: 200, height: 200 };
  assert.equal(intersectsZone({ x: 101, y: 101, width: 20, height: 20 }, { id: 'e', shape: 'ellipse', box, locked: false }), false);
  assert.equal(intersectsZone({ x: 190, y: 190, width: 20, height: 20 }, { id: 'e', shape: 'ellipse', box, locked: false }), true);
  const triangle = { id: 'f', shape: 'freeform', box, points: [[100, 100], [300, 100], [200, 300]], locked: false };
  assert.equal(intersectsZone({ x: 105, y: 260, width: 20, height: 20 }, triangle), false);
  assert.equal(intersectsZone({ x: 190, y: 150, width: 20, height: 20 }, triangle), true);
});

test('locked elements cannot be hidden by a new zone and mutation retains accepted zones', () => {
  const parent = generateComposition({ system: 'ORDER', input, seed: 11 });
  assert.throws(() => applySpaceZones(parent, [zone], { ...unlocked, GRID: true }), /locked/);
  const spaced = applySpaceZones(parent, [zone], unlocked);
  const mutated = mutateComposition(spaced, unlocked);
  assert.deepEqual(mutated.spaceZones, [zone]);
  assert.ok(mutated.elements.every((element) => !('box' in element) || !intersectsZone(element.box, zone)));
});
