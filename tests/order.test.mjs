import test from 'node:test';
import assert from 'node:assert/strict';
import { generateOrder } from '../src/engine/order.ts';
import { estimateTextWidth } from '../src/engine/text.ts';

const image = { id: 'test-image', name: 'test.png', src: '/test.png', width: 1200, height: 900, origin: 'local' };
const input = { title: 'A study\nin form.', metadata: 'Visual exploration\n2026 / No. 001', image };

test('same inputs and seed reproduce the entire document without mutating input', () => {
  const frozen = Object.freeze({ ...input, image: Object.freeze({ ...image }) });
  assert.deepEqual(generateOrder({ input: frozen, seed: 1 }), generateOrder({ input: frozen, seed: 1 }));
  assert.deepEqual(frozen, input);
});

test('seeds produce varied geometry while retaining ORDER alignment', () => {
  const outputs = Array.from({ length: 40 }, (_, seed) => generateOrder({ input, seed }));
  const layouts = new Set(outputs.map(({ grid, elements, hierarchy }) => JSON.stringify({ grid, hierarchy, boxes: elements.map((element) => element.box) })));
  assert.ok(layouts.size > 20);
  assert.deepEqual(new Set(outputs.map((doc) => doc.family)), new Set(['Stack', 'Parallel', 'Inset']));
  assert.ok(outputs.some((doc) => doc.hierarchy === 'Title first'));
  assert.ok(outputs.some((doc) => doc.hierarchy === 'Image first'));
  for (const doc of outputs) {
    const title = doc.elements.find((el) => el.id === 'title');
    const frame = doc.elements.find((el) => el.kind === 'image');
    const titleColumn = (title.box.x - doc.grid.margin) / (doc.grid.columnWidth + doc.grid.gutter);
    assert.ok(Math.abs(titleColumn - Math.round(titleColumn)) < 0.00001);
    const columnIndex = (frame.box.x - doc.grid.margin) / (doc.grid.columnWidth + doc.grid.gutter);
    assert.ok(Math.abs(columnIndex - Math.round(columnIndex)) < 0.00001);
    assert.ok(title.box.y + title.box.height <= frame.box.y || frame.box.y + frame.box.height <= title.box.y
      || title.box.x + title.box.width <= frame.box.x || frame.box.x + frame.box.width <= title.box.x);
  }
});

test('content stays within the paper across seeds, orientations, and long text', () => {
  for (const [width, height] of [[1200, 900], [600, 1600], [4000, 100], [100, 4000]]) {
    for (let seed = 0; seed < 200; seed++) {
      const doc = generateOrder({ input: { ...input, title: 'W'.repeat(70), metadata: '測試'.repeat(70), image: { ...image, width, height } }, seed });
      for (const el of doc.elements) {
        if (el.kind === 'rule') continue;
        const box = el.box;
        assert.ok(box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0);
        assert.ok(box.x + box.width <= doc.width + 0.001 && box.y + box.height <= doc.height + 0.001);
        if (el.kind === 'text') {
          assert.ok(el.lines.length * el.lineHeight <= box.height + 0.001);
          for (const line of el.lines) assert.ok(estimateTextWidth(line, el.fontSize, el.font === 'mono') <= box.width + 0.001);
        }
      }
    }
  }
});

test('extreme aspect ratios preserve the whole image', () => {
  for (const [width, height] of [[10000, 100], [100, 10000]]) {
    for (let seed = 0; seed < 20; seed++) {
      const doc = generateOrder({ input: { ...input, image: { ...image, width, height } }, seed });
      assert.equal(doc.elements.find((el) => el.kind === 'image').fit, 'contain');
    }
  }
});

test('empty title has a fallback and empty metadata creates no fabricated copy', () => {
  const doc = generateOrder({ input: { ...input, title: '  ', metadata: '' }, seed: 0 });
  assert.equal(doc.elements.find((el) => el.id === 'title').lines.join(' '), 'Untitled study');
  assert.deepEqual(doc.elements.find((el) => el.id === 'metadata').lines, []);
});

test('long words and explicit line breaks fit without dropping text', () => {
  for (const title of ['W'.repeat(70), Array(35).fill('W').join('\n')]) {
    const doc = generateOrder({ input: { ...input, title }, seed: 23 });
    const el = doc.elements.find((element) => element.id === 'title');
    assert.equal(el.lines.join('').replaceAll(' ', ''), title.replaceAll('\n', ''));
    assert.ok(el.lines.length * el.lineHeight <= el.box.height);
  }
});

test('invalid seeds and undecoded images are rejected', () => {
  for (const seed of [-1, 0.5, 1000000, NaN, Infinity]) assert.throws(() => generateOrder({ input, seed }), /Seed/);
  for (const asset of [null, { ...image, width: 0 }, { ...image, height: Infinity }, { ...image, src: '' }]) {
    assert.throws(() => generateOrder({ input: { ...input, image: asset }, seed: 1 }), /image/);
  }
});
