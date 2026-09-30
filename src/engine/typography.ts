import type { CompositionLocks } from '../domain/composition.ts';
import type { Box, CompositionDocument, GlyphMark, TextElement, TypographyKind, TypographyRecipe } from '../domain/document.ts';
import { createRandom } from './random.ts';
import { estimateTextWidth } from './text.ts';

export const TYPOGRAPHY_KINDS: TypographyKind[] = ['CHARACTER_DISPLACEMENT', 'REPETITION', 'VERTICAL_COMPRESSION', 'HORIZONTAL_STRETCH', 'LINE_FRAGMENTATION', 'TRACKING_DISTORTION', 'BASELINE_SHIFT', 'GRID_SEPARATION', 'TYPOGRAPHIC_MASK', 'PROCEDURAL_EROSION'];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function buildGlyphs(title: TextElement): GlyphMark[] {
  if (title.glyphs?.length) return title.glyphs.map((glyph) => ({ ...glyph }));
  const marks: GlyphMark[] = [];
  title.lines.forEach((line, row) => {
    let x = title.box.x;
    const y = title.box.y + title.fontSize + row * title.lineHeight;
    for (const char of Array.from(line)) {
      marks.push({ char, x, y });
      x += estimateTextWidth(char, title.fontSize, title.font === 'mono') + title.letterSpacing;
    }
  });
  return marks;
}

function boundGlyphs(glyphs: GlyphMark[], title: TextElement, document: CompositionDocument): GlyphMark[] {
  return glyphs.map((glyph) => {
    const width = estimateTextWidth(glyph.char, title.fontSize, title.font === 'mono') * (glyph.scaleX ?? 1);
    const height = title.fontSize * (glyph.scaleY ?? 1);
    return { ...glyph, x: clamp(glyph.x, 0, Math.max(0, document.width - width)), y: clamp(glyph.y, height, document.height) };
  });
}

/** Character geometry and masks are document data, not browser-only effects. */
export function applyTypography(parent: CompositionDocument, locks: CompositionLocks, recipe: TypographyRecipe): CompositionDocument {
  if (!TYPOGRAPHY_KINDS.includes(recipe.kind) || !Number.isFinite(recipe.intensity) || recipe.intensity < 0 || recipe.intensity > 1
    || !Number.isFinite(recipe.readability) || recipe.readability < 0 || recipe.readability > 1) throw new Error('Choose a valid typography recipe.');
  if (locks.TYPE) throw new Error('Release the TYPE lock before treating typography.');
  const title = parent.elements.find((element): element is TextElement => element.kind === 'text' && element.id === 'title');
  if (!title) throw new Error('This study needs a title before treating typography.');
  const random = createRandom(recipe.seed);
  const amount = recipe.intensity * (1 - .75 * recipe.readability);
  let glyphs = buildGlyphs(title);
  let erasures: Box[] = [...(title.erasures ?? [])];
  let renderedSize = title.fontSize;
  const letterWidth = title.fontSize * .65;

  switch (recipe.kind) {
    case 'CHARACTER_DISPLACEMENT':
      glyphs = glyphs.map((mark) => mark.char === ' ' ? mark : { ...mark, x: mark.x + (random() - .5) * 130 * amount, y: mark.y + (random() - .5) * 120 * amount, rotate: (random() - .5) * 22 * amount });
      break;
    case 'REPETITION': {
      const echoes = amount < .38 ? 1 : amount < .72 ? 2 : 3;
      glyphs = [...glyphs, ...Array.from({ length: echoes }, (_, index) => glyphs.filter((mark) => mark.char !== ' ').map((mark) => ({ ...mark, x: mark.x + (index + 1) * (10 + 35 * amount), y: mark.y + (index + 1) * (13 + 33 * amount), opacity: .13 + .1 * (echoes - index) }))).flat()];
      break;
    }
    case 'VERTICAL_COMPRESSION': {
      const scaleY = 1 - .78 * amount;
      const top = Math.min(...glyphs.map((mark) => mark.y));
      glyphs = glyphs.map((mark) => ({ ...mark, y: top + (mark.y - top) * (1 - .55 * amount), scaleY }));
      break;
    }
    case 'HORIZONTAL_STRETCH':
      glyphs = glyphs.map((mark) => ({ ...mark, x: title.box.x + (mark.x - title.box.x) * (1 - .37 * amount), scaleX: 1 + 1.35 * amount }));
      break;
    case 'LINE_FRAGMENTATION': {
      const shift = 35 + 120 * amount;
      glyphs = glyphs.map((mark, index) => ({ ...mark, x: mark.x + (Math.floor(index / 3) % 2 ? 1 : -1) * shift, y: mark.y + (Math.floor(index / 3) % 2 ? -1 : 1) * 30 * amount, opacity: recipe.readability < .3 && random() < amount * .17 ? .1 : mark.opacity }));
      break;
    }
    case 'TRACKING_DISTORTION': {
      let x = title.box.x;
      glyphs = glyphs.map((mark) => {
        const next = { ...mark, x };
        x += estimateTextWidth(mark.char, title.fontSize, title.font === 'mono') + (random() - .33) * title.fontSize * 1.2 * amount;
        return next;
      });
      break;
    }
    case 'BASELINE_SHIFT':
      glyphs = glyphs.map((mark, index) => ({ ...mark, y: mark.y + (Math.sin(index * 1.8 + recipe.seed) * .6 + (random() - .5) * .4) * title.fontSize * .68 * amount }));
      break;
    case 'GRID_SEPARATION': {
      const columns = Math.max(2, parent.grid.columns);
      const cell = title.box.width / columns;
      const rows = Math.ceil(glyphs.length / columns);
      const rowStep = title.box.height / rows;
      renderedSize = Math.min(title.fontSize, cell * .72, rowStep * .72);
      glyphs = glyphs.map((mark, index) => ({ ...mark, x: title.box.x + index % columns * cell + cell * .1, y: title.box.y + (Math.floor(index / columns) + .82) * rowStep, opacity: mark.char === ' ' ? 0 : mark.opacity }));
      break;
    }
    case 'TYPOGRAPHIC_MASK': {
      const bandHeight = Math.max(2, title.fontSize * (.08 + .21 * amount));
      for (let row = 0; row < title.lines.length; row++) {
        const y = title.box.y + title.fontSize + row * title.lineHeight - title.fontSize * (.55 + random() * .4);
        erasures.push({ x: title.box.x - 4, y, width: title.box.width + 8, height: bandHeight });
      }
      break;
    }
    case 'PROCEDURAL_EROSION': {
      const count = Math.round(glyphs.length * (2 + 7 * amount));
      for (let i = 0; i < count; i++) {
        const mark = glyphs[Math.floor(random() * glyphs.length)];
        if (!mark || mark.char === ' ') continue;
        erasures.push({ x: mark.x + random() * letterWidth * .8, y: mark.y - title.fontSize * random(), width: 2 + random() * title.fontSize * .5 * amount, height: 2 + random() * title.fontSize * .25 * amount });
      }
      break;
    }
  }

  glyphs = boundGlyphs(glyphs, { ...title, fontSize: renderedSize }, parent);
  const treated: TextElement = { ...title, fontSize: renderedSize, glyphs, erasures };
  return { ...parent, hierarchy: `${parent.hierarchy} / ${recipe.kind.toLowerCase()}`, typography: [...(parent.typography ?? []), { ...recipe }], elements: [...parent.elements.filter((element) => element.id !== 'title'), treated] };
}
