import type { CompositionLocks } from '../domain/composition.ts';
import type { Box, CompositionDocument, CompositionElement, ImageElement, ImageTypeKind, ImageTypeRecipe, TextElement } from '../domain/document.ts';
import { createRandom } from './random.ts';
import { fitText } from './text.ts';

export const IMAGE_TYPE_KINDS: ImageTypeKind[] = ['TYPE_MASK', 'TYPE_KNOCKOUT', 'IMAGE_SLICE', 'TYPE_SLICE', 'OVERPRINT', 'OCCLUSION', 'DISPLACEMENT', 'EXTRACT_STRUCTURE'];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function relationAllowed(kind: ImageTypeKind, locks: CompositionLocks, hasAnalysis: boolean): boolean {
  if (locks.GRID || (kind === 'EXTRACT_STRUCTURE' && !hasAnalysis)) return false;
  if (kind === 'IMAGE_SLICE') return !locks.IMAGE;
  if (kind === 'TYPE_SLICE') return !locks.TYPE;
  return !locks.TYPE && !locks.IMAGE;
}

function titleText(document: CompositionDocument): string { return document.source.title.trim() || 'Untitled study'; }
function titleAt(document: CompositionDocument, box: Box, size: number, tone: 'ink' | 'paper' = 'ink'): TextElement {
  return { ...fitText('title', titleText(document), box, size, 'sans'), weight: 600, tone };
}
function imageAt(image: ImageElement, box: Box): ImageElement {
  return { ...image, box, frame: undefined, fit: 'cover' };
}
function expandBox(document: CompositionDocument, box: Box, xFactor: number, yFactor: number): Box {
  const margin = document.grid.margin;
  const width = Math.min(document.width - 2 * margin, box.width * xFactor);
  const height = Math.min(document.height - 2 * margin - 100, box.height * yFactor);
  return {
    x: clamp(box.x + box.width / 2 - width / 2, margin, document.width - margin - width),
    y: clamp(box.y + box.height / 2 - height / 2, margin + 30, document.height - margin - 100 - height),
    width, height,
  };
}
function titleWithin(document: CompositionDocument, imageBox: Box, x: number, y: number, widthRatio: number, heightRatio: number, size: number, tone: 'ink' | 'paper'): TextElement {
  const width = imageBox.width * widthRatio, height = imageBox.height * heightRatio;
  const box = {
    x: clamp(imageBox.x + imageBox.width * x - width / 2, imageBox.x + 8, imageBox.x + imageBox.width - width - 8),
    y: clamp(imageBox.y + imageBox.height * y - height / 2, imageBox.y + 8, imageBox.y + imageBox.height - height - 8),
    width, height,
  };
  return titleAt(document, box, size, tone);
}

/** Pure image/type relationship; all visual modes remain SVG-renderable. */
export function applyImageType(parent: CompositionDocument, locks: CompositionLocks, recipe: ImageTypeRecipe): CompositionDocument {
  if (!IMAGE_TYPE_KINDS.includes(recipe.kind) || !Number.isFinite(recipe.intensity) || recipe.intensity < 0 || recipe.intensity > 1) throw new Error('Choose a valid image/type relationship.');
  if (!relationAllowed(recipe.kind, locks, !!parent.source.image?.analysis)) throw new Error('Release the relevant locks, or analyse a photograph for EXTRACT STRUCTURE.');
  const random = createRandom(recipe.seed);
  const title = parent.elements.find((element): element is TextElement => element.kind === 'text' && element.id === 'title');
  const image = parent.elements.find((element): element is ImageElement => element.kind === 'image' && element.id === 'source-image');
  if (!title || !image) throw new Error('This relationship needs one title and image.');
  const margin = parent.grid.margin;
  const analysis = parent.source.image?.analysis;
  const quietX = analysis?.quietX ?? .5, quietY = analysis?.quietY ?? .5;
  const tone = (analysis?.quietLuminance ?? .75) < .45 ? 'paper' as const : 'ink' as const;
  const amount = recipe.intensity;
  // Replace a previous relation's slices before applying the next recipe.
  let elements = parent.elements.filter((element) => !element.id.startsWith('source-image-slice-') && !element.id.startsWith('title-slice-'));
  const replace = (target: string, replacement: CompositionElement | CompositionElement[]) => {
    elements = elements.flatMap((element) => element.id === target ? (Array.isArray(replacement) ? replacement : [replacement]) : [element]);
  };
  const putTitleAboveImage = () => {
    const found = elements.find((element) => element.id === 'title');
    if (found) elements = [...elements.filter((element) => element.id !== 'title'), found];
  };

  switch (recipe.kind) {
    case 'TYPE_MASK': {
      const box = expandBox(parent, { ...title.box, width: Math.max(title.box.width, 420), height: Math.max(title.box.height, 300) }, 1.25 + .35 * amount, 1.3 + .35 * amount);
      replace('title', titleAt(parent, box, Math.max(title.fontSize * (1.4 + amount), 140)));
      elements = elements.filter((element) => element.kind !== 'texture' || locks.TEXTURE);
      break;
    }
    case 'TYPE_KNOCKOUT': {
      const imageBox = expandBox(parent, image.box, 1.25 + .25 * amount, 1.2 + .25 * amount);
      replace('source-image', imageAt(image, imageBox));
      replace('title', titleWithin(parent, imageBox, quietX, quietY, .8, .58, Math.max(title.fontSize * (1.3 + .4 * amount), 95), 'ink'));
      break;
    }
    case 'IMAGE_SLICE': {
      const frame = expandBox(parent, image.box, 1.1 + .25 * amount, 1.1 + .2 * amount);
      const count = amount < .5 ? 4 : 7;
      const vertical = random() < .5;
      const slices: ImageElement[] = Array.from({ length: count }, (_, index) => {
        const slice: Box = vertical
          ? { x: frame.x + frame.width * index / count, y: frame.y, width: frame.width / count, height: frame.height }
          : { x: frame.x, y: frame.y + frame.height * index / count, width: frame.width, height: frame.height / count };
        const displacement = (index % 2 ? 1 : -1) * (25 + 90 * amount) * (.7 + .3 * random());
        const dx = vertical ? 0 : displacement, dy = vertical ? displacement : 0;
        const box = { ...slice, x: clamp(slice.x + dx, margin, parent.width - margin - slice.width), y: clamp(slice.y + dy, margin + 45, parent.height - margin - slice.height) };
        return { ...image, id: index === 0 ? 'source-image' : `source-image-slice-${index}`, box, frame: { ...frame, x: frame.x + box.x - slice.x, y: frame.y + box.y - slice.y }, fit: 'cover' };
      });
      replace('source-image', slices);
      break;
    }
    case 'TYPE_SLICE': {
      const full = titleAt(parent, expandBox(parent, title.box, 1.25 + .25 * amount, 1.3 + .2 * amount), title.fontSize * (1.35 + .25 * amount));
      const count = amount < .5 ? 3 : 5;
      const slices: TextElement[] = Array.from({ length: count }, (_, index) => {
        const original: Box = { x: full.box.x + full.box.width * index / count, y: full.box.y, width: full.box.width / count, height: full.box.height };
        const dy = (index % 2 ? -1 : 1) * (30 + 90 * amount) * (.65 + random() * .35);
        const box = { ...original, y: clamp(original.y + dy, margin + 30, parent.height - margin - original.height) };
        return { ...full, id: index === 0 ? 'title' : `title-slice-${index}`, box, frame: { ...full.box, y: full.box.y + box.y - original.y } };
      });
      replace('title', slices);
      break;
    }
    case 'OVERPRINT':
    case 'EXTRACT_STRUCTURE': {
      const extracted = recipe.kind === 'EXTRACT_STRUCTURE';
      const imageBox = expandBox(parent, image.box, extracted ? 1.5 + .4 * amount : 1.25 + .35 * amount, extracted ? 1.5 + .4 * amount : 1.25 + .3 * amount);
      const frame = imageAt(image, imageBox);
      frame.focalX = analysis?.focalX ?? image.focalX;
      frame.focalY = analysis?.focalY ?? image.focalY;
      replace('source-image', frame);
      replace('title', titleWithin(parent, imageBox, clamp(quietX + (random() - .5) * .16 * amount, 0, 1), quietY, extracted ? .66 : .72, extracted ? .48 : .42, Math.max(title.fontSize * (1.1 + .35 * amount), 82), tone));
      putTitleAboveImage();
      if (extracted && analysis) {
        const columns = analysis.edgeDensity > .13 ? 6 : 4;
        const gutter = parent.grid.gutter;
        const columnWidth = (parent.width - 2 * margin - (columns - 1) * gutter) / columns;
        return { ...parent, grid: { margin, columns, gutter, columnWidth }, hierarchy: `${parent.hierarchy} / extracted structure`, imageType: { ...recipe }, elements: locks.TEXTURE ? elements : elements.filter((element) => element.kind !== 'texture') };
      }
      break;
    }
    case 'OCCLUSION': {
      const imageBox = expandBox(parent, image.box, 1.2 + .3 * amount, 1.15 + .25 * amount);
      const titleBox = expandBox(parent, title.box, 1.15 + .25 * amount, 1.15 + .25 * amount);
      titleBox.x = clamp(titleBox.x + (imageBox.x + imageBox.width / 2 - titleBox.x - titleBox.width / 2) * .55 * amount, margin, parent.width - margin - titleBox.width);
      titleBox.y = clamp(titleBox.y + (imageBox.y + imageBox.height / 2 - titleBox.y - titleBox.height / 2) * .55 * amount, margin, parent.height - margin - titleBox.height);
      replace('title', titleAt(parent, titleBox, title.fontSize * (1.15 + .3 * amount)));
      replace('source-image', imageAt(image, imageBox));
      // The image is intentionally painted after type so it hides only their intersection.
      const found = elements.find((element) => element.id === 'source-image');
      if (found) elements = [...elements.filter((element) => element.id !== 'source-image'), found];
      break;
    }
    case 'DISPLACEMENT': {
      const frame = expandBox(parent, image.box, 1.15 + .2 * amount, 1.1 + .2 * amount);
      const count = 8;
      const slices: ImageElement[] = Array.from({ length: count }, (_, index) => {
        const strip = frame.height / count;
        const slice: Box = { x: frame.x, y: frame.y + strip * index, width: frame.width, height: strip };
        const textBoundary = index >= 4 && index <= 6;
        const dx = (random() < .5 ? -1 : 1) * (textBoundary ? 70 + 150 * amount : 12 + 35 * amount);
        const box = { ...slice, x: clamp(slice.x + dx, 0, parent.width - slice.width) };
        return { ...image, id: index === 0 ? 'source-image' : `source-image-slice-${index}`, box, frame: { ...frame, x: frame.x + box.x - slice.x }, fit: 'cover' };
      });
      replace('source-image', slices);
      const titleBox = expandBox(parent, title.box, 1.1 + .2 * amount, 1.1 + .2 * amount);
      titleBox.y = clamp(titleBox.y + (frame.y + frame.height * .65 - titleBox.y - titleBox.height / 2) * .45 * amount, margin, parent.height - margin - titleBox.height);
      replace('title', titleAt(parent, titleBox, title.fontSize * (1.1 + .25 * amount), tone));
      putTitleAboveImage();
      break;
    }
  }

  return { ...parent, hierarchy: `${parent.hierarchy} / ${recipe.kind.toLowerCase()}`, imageType: { ...recipe }, elements: locks.TEXTURE ? elements : elements.filter((element) => element.kind !== 'texture') };
}
