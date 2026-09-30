import test from 'node:test';
import assert from 'node:assert/strict';
import { generateComposition } from '../src/engine/generate.ts';
import { applyImageType, IMAGE_TYPE_KINDS } from '../src/engine/imageType.ts';

const image = { id: 'photo', name: 'sample', src: '/sample.svg', width: 1200, height: 900, origin: 'local', analysis: { meanLuminance: .62, contrast: .5, edgeDensity: .15, balanceX: .3, balanceY: .55, focalX: .68, focalY: .42, quietX: .125, quietY: .375, quietLuminance: .8 } };
const input = { title: 'A study\nin form.', metadata: '2026 / 001', image };
const unlocked = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };

test('image/type relations are deterministic, serialisable and stay within the paper', () => {
  for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
    const parent = generateComposition({ system, input, seed: 11 });
    const original = structuredClone(parent);
    for (const kind of IMAGE_TYPE_KINDS) {
      const recipe = { kind, intensity: .65, seed: 18 };
      const result = applyImageType(parent, unlocked, recipe);
      assert.deepEqual(result, applyImageType(parent, unlocked, recipe));
      assert.deepEqual(result.imageType, recipe);
      assert.deepEqual(result.source, parent.source);
      assert.ok(result.elements.some((item) => item.kind === 'image'));
      for (const element of result.elements) if ('box' in element) {
        assert.ok(element.box.x >= 0 && element.box.y >= 0, `${system} ${kind} ${element.id} origin`);
        assert.ok(element.box.x + element.box.width <= result.width + .001, `${system} ${kind} ${element.id} width`);
        assert.ok(element.box.y + element.box.height <= result.height + .001, `${system} ${kind} ${element.id} height`);
      }
    }
    assert.deepEqual(parent, original);
  }
});

test('image and type locks protect their elements', () => {
  const parent = generateComposition({ system: 'ORDER', input, seed: 7 });
  const lockedType = applyImageType(parent, { ...unlocked, TYPE: true }, { kind: 'IMAGE_SLICE', intensity: .8, seed: 2 });
  assert.deepEqual(lockedType.elements.find((item) => item.id === 'title'), parent.elements.find((item) => item.id === 'title'));
  const lockedImage = applyImageType(parent, { ...unlocked, IMAGE: true }, { kind: 'TYPE_SLICE', intensity: .8, seed: 2 });
  assert.deepEqual(lockedImage.elements.find((item) => item.id === 'source-image'), parent.elements.find((item) => item.id === 'source-image'));
  assert.throws(() => applyImageType(parent, { ...unlocked, GRID: true }, { kind: 'TYPE_MASK', intensity: .5, seed: 2 }), /Release/);
  const withoutAnalysis = generateComposition({ system: 'ORDER', input: { ...input, image: { ...image, analysis: undefined } }, seed: 7 });
  assert.throws(() => applyImageType(withoutAnalysis, unlocked, { kind: 'EXTRACT_STRUCTURE', intensity: .5, seed: 2 }), /analyse/);
});

test('relationships inherit distinct geometry from the three systems', () => {
  for (const kind of ['TYPE_KNOCKOUT', 'IMAGE_SLICE', 'OVERPRINT', 'DISPLACEMENT', 'EXTRACT_STRUCTURE']) {
    const signatures = new Set();
    for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
      const parent = generateComposition({ system, input, seed: 11 });
      const result = applyImageType(parent, unlocked, { kind, intensity: .65, seed: 18 });
      const image = result.elements.find((item) => item.id === 'source-image');
      const title = result.elements.find((item) => item.id === 'title');
      signatures.add(JSON.stringify([image?.box, title?.box]));
    }
    assert.equal(signatures.size, 3, `${kind} should preserve each system's structural identity`);
  }
});
