import test from 'node:test';
import assert from 'node:assert/strict';
import { generateComposition } from '../src/engine/generate.ts';
import { applyTypography, TYPOGRAPHY_KINDS } from '../src/engine/typography.ts';
import { applySpaceZones } from '../src/engine/space.ts';

const input = { title: 'The unruly\narchive.', metadata: 'No. 01', image: { id: 'sample', name: 'sample', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' } };
const unlocked = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };

test('typographic treatments are deterministic, serialisable and remain on paper', () => {
  for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
    const parent = generateComposition({ system, input, seed: 11 });
    const before = structuredClone(parent);
    for (const kind of TYPOGRAPHY_KINDS) {
      const recipe = { kind, intensity: .7, readability: .35, seed: 18 };
      const result = applyTypography(parent, unlocked, recipe);
      assert.deepEqual(result, applyTypography(parent, unlocked, recipe));
      assert.deepEqual(JSON.parse(JSON.stringify(result.typography)), [recipe]);
      assert.deepEqual(result.source, parent.source);
      const title = result.elements.find((element) => element.id === 'title');
      assert.ok(title.glyphs.length > 0, kind);
      for (const mark of title.glyphs) {
        assert.ok(mark.x >= 0 && mark.x <= result.width, `${kind} x`);
        assert.ok(mark.y >= 0 && mark.y <= result.height, `${kind} y`);
      }
      if (kind.endsWith('MASK') || kind === 'PROCEDURAL_EROSION') assert.ok(title.erasures.length > 0);
    }
    assert.deepEqual(parent, before);
  }
});

test('TYPE lock blocks treatments and readability changes their geometry', () => {
  const parent = generateComposition({ system: 'ORDER', input, seed: 11 });
  const recipe = { kind: 'CHARACTER_DISPLACEMENT', intensity: 1, readability: 0, seed: 18 };
  assert.throws(() => applyTypography(parent, { ...unlocked, TYPE: true }, recipe), /Release the TYPE lock/);
  const wild = applyTypography(parent, unlocked, recipe);
  const restrained = applyTypography(parent, unlocked, { ...recipe, readability: 1 });
  assert.notDeepEqual(wild.elements.find((item) => item.id === 'title').glyphs, restrained.elements.find((item) => item.id === 'title').glyphs);
});

test('SPACE can move a treated title without dropping its glyph recipe', () => {
  const treated = applyTypography(generateComposition({ system: 'ORDER', input, seed: 11 }), unlocked, { kind: 'CHARACTER_DISPLACEMENT', intensity: .7, readability: .3, seed: 18 });
  const original = treated.elements.find((item) => item.id === 'title');
  const zone = { id: 'z', shape: 'rectangle', box: { x: original.box.x + 20, y: original.box.y + 20, width: 80, height: 80 }, locked: false };
  const recomposed = applySpaceZones(treated, [zone], unlocked);
  const moved = recomposed.elements.find((item) => item.id === 'title');
  assert.notDeepEqual(moved.box, original.box);
  assert.equal(moved.glyphs.length, original.glyphs.length);
  assert.equal(recomposed.typography.at(-1).kind, 'CHARACTER_DISPLACEMENT');
});
