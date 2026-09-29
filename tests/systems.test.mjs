import test from 'node:test';
import assert from 'node:assert/strict';
import { generateComposition } from '../src/engine/generate.ts';
import { mutateComposition } from '../src/engine/mutate.ts';
import { estimateTextWidth } from '../src/engine/text.ts';

const image = { id: 'source', name: 'image.png', src: '/image.png', width: 1200, height: 900, origin: 'local' };
const input = { image, title: 'A study\nin form.', metadata: 'Visual exploration\n2026 / No. 001' };
const unlocked = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };
const element = (doc, id) => doc.elements.find((item) => item.id === id);
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

test('every system is reproducible and keeps content inside the paper', () => {
  for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
    const layouts = new Set();
    for (let seed = 0; seed < 100; seed++) {
      const doc = generateComposition({ system, input, seed });
      assert.deepEqual(doc, generateComposition({ system, input, seed }));
      layouts.add(JSON.stringify({ grid: doc.grid, hierarchy: doc.hierarchy, title: element(doc, 'title').box, image: element(doc, 'source-image').box }));
      assert.equal(doc.system, system);
      assert.ok(!overlaps(element(doc, 'title').box, element(doc, 'source-image').box));
      for (const item of doc.elements) {
        if (item.kind === 'rule') continue;
        assert.ok(item.box.x >= 0 && item.box.y >= 0 && item.box.width > 0 && item.box.height > 0);
        assert.ok(item.box.x + item.box.width <= doc.width + 0.001);
        assert.ok(item.box.y + item.box.height <= doc.height + 0.001);
        if (item.kind === 'text') {
          assert.ok(item.lines.length * item.lineHeight <= item.box.height + 0.001);
          for (const line of item.lines) assert.ok(estimateTextWidth(line, item.fontSize, item.font === 'mono') <= item.box.width + 0.001);
        }
      }
    }
    assert.ok(layouts.size >= 30, `${system} should yield varied arrangements`);
  }
});

test('each lock preserves its intended layer across mutations', () => {
  for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
    const original = generateComposition({ system, input, seed: 9 });
    const next = mutateComposition(original, unlocked);
    assert.notEqual(next.seed, original.seed);
    for (const key of ['GRID', 'TYPE', 'IMAGE', 'TEXTURE']) {
      const result = mutateComposition(original, { ...unlocked, [key]: true });
      assert.notEqual(result.seed, original.seed);
      assert.ok(!overlaps(element(result, 'title').box, element(result, 'source-image').box));
      if (key === 'GRID') {
        assert.deepEqual(result.grid, original.grid);
        for (const before of original.elements) {
          const after = element(result, before.id);
          if ('box' in before) assert.deepEqual(after.box, before.box);
          if (before.kind === 'rule') assert.deepEqual([after.x1, after.y1, after.x2, after.y2], [before.x1, before.y1, before.x2, before.y2]);
        }
      }
      if (key === 'TYPE') {
        assert.deepEqual(element(result, 'title'), element(original, 'title'));
        assert.deepEqual(element(result, 'metadata'), element(original, 'metadata'));
      }
      if (key === 'IMAGE') assert.deepEqual(element(result, 'source-image'), element(original, 'source-image'));
      if (key === 'TEXTURE') assert.deepEqual(element(result, 'texture'), element(original, 'texture'));
    }
    assert.equal(mutateComposition(original, { GRID: true, TYPE: true, IMAGE: true, TEXTURE: true }), original);
  }
});

test('mixed locks remain clear through repeated mutations', () => {
  for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
    for (const locks of [
      { GRID: false, TYPE: true, IMAGE: true, TEXTURE: false },
      { GRID: true, TYPE: false, IMAGE: true, TEXTURE: true },
      { GRID: true, TYPE: true, IMAGE: false, TEXTURE: true },
    ]) {
      let doc = generateComposition({ system, input, seed: 1 });
      for (let i = 0; i < 20; i++) {
        doc = mutateComposition(doc, locks);
        assert.ok(!overlaps(element(doc, 'title').box, element(doc, 'source-image').box));
      }
    }
  }
});

test('new systems fit maximum-length copy and extreme image orientations', () => {
  for (const system of ['SILENCE', 'TENSION']) {
    for (const [width, height] of [[10000, 100], [100, 10000], [800, 800]]) {
      for (let seed = 0; seed < 15; seed++) {
        const doc = generateComposition({
          system, seed,
          input: { title: 'W'.repeat(70), metadata: Array(70).fill('X').join('\n'), image: { ...image, width, height } },
        });
        for (const item of doc.elements) {
          if (item.kind !== 'text') continue;
          assert.ok(item.lines.length * item.lineHeight <= item.box.height + 0.001);
          for (const line of item.lines) assert.ok(estimateTextWidth(line, item.fontSize, item.font === 'mono') <= item.box.width + 0.001);
        }
        if (width / height > 100 || height / width > 100) assert.equal(element(doc, 'source-image').fit, 'contain');
      }
    }
  }
});
