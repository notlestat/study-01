import test from 'node:test';
import assert from 'node:assert/strict';
import { generateComposition } from '../src/engine/generate.ts';
import { generateFamily, FAMILY_FORMATS, FAMILY_SIZES } from '../src/engine/family.ts';
import { applyTypography } from '../src/engine/typography.ts';
import { mutateComposition } from '../src/engine/mutate.ts';

const input = { title: 'A study\nin form.', metadata: 'Visual exploration\n2026 / No. 001', image: { id: 'sample', name: 'sample', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' } };
const locks = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };

test('family recomposes seven formats while retaining source and visual system', () => {
  for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
    const parent = generateComposition({ system, input, seed: 11 });
    const before = structuredClone(parent);
    const family = generateFamily(parent);
    assert.deepEqual(family, generateFamily(parent));
    assert.deepEqual(family.map((item) => item.familyAsset.format), FAMILY_FORMATS);
    for (const document of family) {
      assert.deepEqual([document.width, document.height], FAMILY_SIZES[document.familyAsset.format]);
      assert.equal(document.system, system);
      assert.deepEqual(document.source, parent.source);
      for (const element of document.elements) {
        if (!('box' in element)) continue;
        assert.ok(element.box.x >= 0 && element.box.y >= 0, `${system} ${document.familyAsset.format} ${element.id}`);
        assert.ok(element.box.x + element.box.width <= document.width && element.box.y + element.box.height <= document.height, `${system} ${document.familyAsset.format} ${element.id}`);
      }
      if (document.familyAsset.format === 'TYPE_ONLY') assert.equal(document.elements.some((item) => item.kind === 'image'), false);
      if (document.familyAsset.format === 'IMAGE_ONLY') assert.equal(document.elements.some((item) => item.id === 'title'), false);
    }
    assert.deepEqual(parent, before);
  }
});

test('family keeps processed source and reapplies typographic material', () => {
  const parent = generateComposition({ system: 'ORDER', input, seed: 4 });
  const treated = applyTypography(parent, locks, { kind: 'BASELINE_SHIFT', intensity: .7, readability: .5, seed: 18 });
  const family = generateFamily(treated);
  assert.equal(family.find((item) => item.familyAsset.format === 'SQUARE').elements.find((item) => item.id === 'title').glyphs.length > 0, true);
  assert.equal(family.find((item) => item.familyAsset.format === 'BANNER').source.image.id, input.image.id);
});

test('a developed family asset can generate another full family', () => {
  const parent = generateComposition({ system: 'ORDER', input, seed: 4 });
  for (const sourceFormat of ['BANNER', 'TYPE_ONLY', 'IMAGE_ONLY']) {
    const selected = generateFamily(parent).find((item) => item.familyAsset.format === sourceFormat);
    const family = generateFamily(selected);
    assert.deepEqual(family.map((item) => [item.width, item.height]), FAMILY_FORMATS.map((format) => FAMILY_SIZES[format]));
    assert.ok(family[0].elements.some((item) => item.id === 'title'));
    assert.ok(family[0].elements.some((item) => item.id === 'source-image'));
  }
});

test('mutating a developed banner keeps its format and can preserve an intentional type/image overlap', () => {
  const parent = generateComposition({ system: 'TENSION', input, seed: 11 });
  const banner = generateFamily(parent).find((item) => item.familyAsset.format === 'BANNER');
  const next = mutateComposition(banner, locks, 12);
  assert.deepEqual([next.width, next.height], FAMILY_SIZES.BANNER);
  assert.equal(next.familyAsset.format, 'BANNER');
  assert.equal(next.seed >= 12, true);
  assert.deepEqual(banner, generateFamily(parent).find((item) => item.familyAsset.format === 'BANNER'));
});

test('family formats with both image and type preserve the parent mask relationship and colour', () => {
  const parent = generateComposition({ system: 'ORDER', input, seed: 11 });
  const related = { ...parent, imageType: { kind: 'TYPE_MASK', intensity: .7, seed: 3 }, colour: { mode: 'DUOTONE', intensity: .9, registration: .2, seed: 4 } };
  const family = generateFamily(related);
  for (const item of family) {
    assert.deepEqual(item.colour, related.colour);
    if (!['TYPE_ONLY', 'IMAGE_ONLY'].includes(item.familyAsset.format)) {
      assert.deepEqual(item.imageType, related.imageType);
      for (const element of item.elements.filter(element => 'box' in element)) {
        assert.ok(element.box.x >= 0 && element.box.y >= 0);
        assert.ok(element.box.x + element.box.width <= item.width + 1);
        assert.ok(element.box.y + element.box.height <= item.height + 1);
      }
    }
  }
});
