import type { Box, CompositionDocument, CompositionElement, DriftRecipe, ImageElement, TextElement } from '../domain/document.ts';
import { createRandom, assertSeed } from './random.ts';
import { fitText } from './text.ts';

export const DRIFT_MODES = ['SLIP', 'DECAY', 'REPEAT'] as const;
export const DRIFT_DIRECTIONS = ['LEFT', 'RIGHT', 'UP', 'DOWN'] as const;
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));

export function validateDrift(recipe: DriftRecipe): void {
  if (!DRIFT_MODES.includes(recipe.mode) || !DRIFT_DIRECTIONS.includes(recipe.direction)
    || !Number.isFinite(recipe.duration) || recipe.duration < 1 || recipe.duration > 12
    || !Number.isFinite(recipe.speed) || recipe.speed < .25 || recipe.speed > 3
    || !Number.isFinite(recipe.intensity) || recipe.intensity < 0 || recipe.intensity > 1
    || typeof recipe.loop !== 'boolean') throw new Error('Choose valid DRIFT settings.');
  assertSeed(recipe.seed);
}

function vector(direction: DriftRecipe['direction']): [number, number] {
  if (direction === 'LEFT') return [-1, 0];
  if (direction === 'RIGHT') return [1, 0];
  if (direction === 'UP') return [0, -1];
  return [0, 1];
}

function shift(box: Box, dx: number, dy: number, document: CompositionDocument): Box {
  return { ...box, x: clamp(box.x + dx, 0, document.width - box.width), y: clamp(box.y + dy, 0, document.height - box.height) };
}

function shiftText(text: TextElement, dx: number, dy: number, document: CompositionDocument, id = text.id, opacity = text.opacity ?? 1): TextElement {
  const box = shift(text.box, dx, dy, document);
  const x = box.x - text.box.x, y = box.y - text.box.y;
  return { ...text, id, box, frame: text.frame ? shift(text.frame, x, y, document) : undefined,
    glyphs: text.glyphs?.map((glyph) => ({ ...glyph, x: glyph.x + x, y: glyph.y + y })),
    erasures: text.erasures?.map((area) => ({ ...area, x: area.x + x, y: area.y + y })), opacity };
}

/** A deterministic, SVG-ready artwork at one instant; no React or browser time. */
export function driftFrame(parent: CompositionDocument, recipe: DriftRecipe, seconds: number): CompositionDocument {
  validateDrift(recipe);
  if (!Number.isFinite(seconds)) throw new Error('Frame time must be finite.');
  const progress = clamp(seconds / recipe.duration, 0, 1);
  const motion = recipe.loop ? ((1 - Math.cos(2 * Math.PI * progress)) / 2) ** (1 / recipe.speed) : clamp(recipe.speed * progress, 0, 1);
  const amount = motion * recipe.intensity;
  if (amount < .00001) return parent;
  const locks = recipe.locks ?? { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };
  // Keep linked masks/knockouts intact; moving their source separately would drop the relationship.
  const linked = parent.imageType?.kind === 'TYPE_MASK' || parent.imageType?.kind === 'TYPE_KNOCKOUT';
  const imageHeld = locks.IMAGE || locks.GRID || (linked && locks.TYPE);
  const typeHeld = locks.TYPE || locks.GRID;
  const random = createRandom(recipe.seed);
  const [vx, vy] = vector(recipe.direction);
  const image = parent.elements.find((item): item is ImageElement => item.kind === 'image' && item.id === 'source-image');
  const title = parent.elements.find((item): item is TextElement => item.kind === 'text' && item.id === 'title');
  let elements: CompositionElement[] = parent.elements.map((item) => ({ ...item }));

  if (recipe.mode === 'SLIP') {
    if (image && !imageHeld && !linked) {
      const count = 7;
      const vertical = Math.abs(vx) > 0;
      const strips: ImageElement[] = Array.from({ length: count }, (_, index) => {
        const slice: Box = vertical
          ? { x: image.box.x, y: image.box.y + image.box.height * index / count, width: image.box.width, height: image.box.height / count }
          : { x: image.box.x + image.box.width * index / count, y: image.box.y, width: image.box.width / count, height: image.box.height };
        const distance = (index % 2 ? 1 : -1) * (25 + 115 * random()) * amount;
        const box = shift(slice, vx * distance, vy * distance, parent);
        return { ...image, id: `drift-image-${index}`, box,
          frame: { ...image.box, x: image.box.x + box.x - slice.x, y: image.box.y + box.y - slice.y } };
      });
      elements = elements.flatMap((item) => item.id === 'source-image' ? strips : [item]);
    }
    elements = elements.map((item) => {
      if (title && !typeHeld && item.id === 'title') return shiftText(title, -vx * 180 * amount, -vy * 180 * amount, parent);
      if (item.kind === 'rule' && !locks.GRID) return { ...item, x1: clamp(item.x1 + vx * 45 * amount, 0, parent.width), x2: clamp(item.x2 + vx * 45 * amount, 0, parent.width), y1: clamp(item.y1 + vy * 45 * amount, 0, parent.height), y2: clamp(item.y2 + vy * 45 * amount, 0, parent.height) };
      return item;
    });
  } else if (recipe.mode === 'DECAY') {
    if (image && !imageHeld && !linked) {
      const count = 11;
      const strips: ImageElement[] = Array.from({ length: count }, (_, index) => {
        const slice: Box = { x: image.box.x, y: image.box.y + image.box.height * index / count, width: image.box.width, height: image.box.height / count };
        const dx = (random() - .5) * 170 * amount + vx * index * 5 * amount;
        const dy = (random() - .5) * 65 * amount + vy * index * 4 * amount;
        const box = shift(slice, dx, dy, parent);
        return { ...image, id: `drift-decay-${index}`, box,
          frame: { ...image.box, x: image.box.x + box.x - slice.x, y: image.box.y + box.y - slice.y },
          opacity: clamp(1 - amount * (.3 + random() * .55), .12, 1) };
      });
      elements = elements.flatMap((item) => item.id === 'source-image' ? strips : [item]);
      const bars: CompositionElement[] = Array.from({ length: Math.ceil(16 * amount) }, (_, index) => ({
        kind: 'block', id: `drift-absence-${index}`, fill: index % 5 === 0 ? 'ink' : 'paper', opacity: .94,
        box: { x: image.box.x + random() * image.box.width * .72,
          y: image.box.y + random() * image.box.height,
          width: image.box.width * (.09 + random() * .25), height: 2 + random() * 15 * amount },
      }));
      elements.push(...bars);
    }
    if (title && !typeHeld) elements = elements.map((item) => item.id === 'title' ? { ...title, opacity: clamp(1 - .45 * amount, .45, 1) } : item);
  } else {
    if (image && !imageHeld) {
      const box = { ...image.box, width: image.box.width * (1 - .28 * amount), height: image.box.height * (1 - .28 * amount) };
      box.x = clamp(image.box.x + (image.box.width - box.width) / 2 + vx * 90 * amount, 0, parent.width - box.width);
      box.y = clamp(image.box.y + (image.box.height - box.height) / 2 + vy * 90 * amount, 0, parent.height - box.height);
      elements = elements.map((item) => item.id === 'source-image' ? { ...image, box, focalX: clamp(image.focalX + vx * .2 * amount, 0, 1), focalY: clamp(image.focalY + vy * .2 * amount, 0, 1) } : item);
    }
    if (title && !typeHeld) {
      const count = 2 + Math.round(3 * amount);
      const echoes = Array.from({ length: count }, (_, index) => shiftText(title,
        vx * (index + 1) * (42 + 115 * amount) + (vy ? (index % 2 ? 1 : -1) * 36 * amount : 0),
        vy * (index + 1) * (42 + 115 * amount) + (vx ? (index % 2 ? 1 : -1) * 36 * amount : 0),
        parent, `drift-type-${index}`, .16 + .25 * amount * (1 - index / count)));
      const at = elements.findIndex((item) => item.id === 'title');
      const field = image?.box ?? title.box;
      const massBox = shift({ ...field, width: clamp(field.width * (1 + .3 * amount), 100, parent.width), height: clamp(field.height * (1 + .2 * amount), 100, parent.height) }, -field.width * .1 * amount, 0, parent);
      const mass: TextElement = { ...fitText('drift-type-mass', parent.source.title.trim() || 'Untitled study', massBox, title.fontSize * (1 + 1.4 * amount), title.font), weight: title.weight, opacity: .12 + .12 * amount };
      elements.splice(at, 0, mass, ...echoes);
    }
    elements = elements.map((item) => item.kind === 'texture' && !locks.TEXTURE && !locks.GRID ? { ...item, pitch: Math.max(2, item.pitch * (1 - .5 * amount)) } : item);
  }

  if (linked && image && !imageHeld && recipe.mode !== 'REPEAT') elements = elements.map((item) => item.id === 'source-image' ? { ...image, focalX: clamp(image.focalX + vx * .25 * amount, 0, 1), focalY: clamp(image.focalY + vy * .25 * amount, 0, 1), opacity: recipe.mode === 'DECAY' ? 1 - .65 * amount : image.opacity } : item);
  return { ...parent, hierarchy: `${parent.hierarchy} / drift ${recipe.mode.toLowerCase()} @ ${progress.toFixed(3)}`, elements };
}
