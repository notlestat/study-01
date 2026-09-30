import test from 'node:test';
import assert from 'node:assert/strict';
import { crossbreedCompositions, crossbreedDocument } from '../src/engine/crossbreed.ts';
import { establishLineage } from '../src/engine/lineage.ts';
import { applyTypography } from '../src/engine/typography.ts';
import { generateComposition } from '../src/engine/generate.ts';

const image = { id: 'sample', name: 'sample', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' };
const input = { title: 'A study\nin form.', metadata: 'Visual exploration', image };
const locks = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };
const parent = (system, seed, id) => establishLineage(generateComposition({ system, input, seed }), id, '2026-09-30T00:00:00.000Z');

test('crossbreeding is pure, bounded and different from either parent across systems', () => {
  for (const baseSystem of ['ORDER', 'SILENCE', 'TENSION']) for (const donorSystem of ['ORDER', 'SILENCE', 'TENSION']) {
    const base = parent(baseSystem, 11, `base-${baseSystem}`);
    const donor = parent(donorSystem, 18, `donor-${donorSystem}`);
    const before = JSON.stringify(base);
    const hybrid = crossbreedCompositions(base, donor, .65);
    assert.equal(JSON.stringify(base), before);
    assert.deepEqual(hybrid, crossbreedCompositions(base, donor, .65));
    assert.notDeepEqual(hybrid.elements, base.elements);
    assert.notDeepEqual(hybrid.elements, donor.elements);
    assert.equal(hybrid.elements.some((element) => element.id === 'source-image-slice-crossbreed'), true);
    for (const element of hybrid.elements) {
      if (!('box' in element)) continue;
      assert.ok(element.box.x >= 0 && element.box.y >= 0, element.id);
      assert.ok(element.box.x + element.box.width <= hybrid.width && element.box.y + element.box.height <= hybrid.height, element.id);
    }
  }
});

test('crossbreeding records both parents and the weighting', () => {
  const base = parent('ORDER', 4, 'a');
  const donor = parent('TENSION', 18, 'b');
  const hybrid = crossbreedDocument(base, donor, .72, locks, 'child', '2026-09-30T00:01:00.000Z');
  assert.deepEqual(hybrid.lineage.parentIds, ['a', 'b']);
  assert.deepEqual(hybrid.lineage.crossbreed, { baseId: 'a', donorId: 'b', donorWeight: .72 });
  assert.equal(hybrid.lineage.generation, 1);
  assert.equal(hybrid.lineage.event, 'CROSSBREED');
  assert.equal(hybrid.lineage.rootSeed, 4);
  assert.throws(() => crossbreedCompositions(base, base, .5), /different studies/);
  assert.throws(() => crossbreedCompositions(base, donor, 2), /between 0 and 1/);
});

test('crossbreeding carries donor letterform treatment into the inherited type geometry', () => {
  const base = parent('SILENCE', 4, 'a');
  const donor = applyTypography(parent('TENSION', 18, 'b'), locks, { kind: 'BASELINE_SHIFT', intensity: .8, readability: .2, seed: 7 });
  const hybrid = crossbreedCompositions(base, donor, .75);
  assert.equal(hybrid.typography.at(-1).kind, 'BASELINE_SHIFT');
  assert.equal(hybrid.elements.find((item) => item.id === 'title').glyphs.length, donor.elements.find((item) => item.id === 'title').glyphs.length);
});
