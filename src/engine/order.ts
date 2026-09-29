import type { CompositionInput } from '../domain/composition.ts';
import type { Box, CompositionDocument, ImageElement } from '../domain/document.ts';
import { choose, createRandom } from './random.ts';
import { fitText } from './text.ts';

interface OrderRequest { input: CompositionInput; seed: number; }

export function generateOrder({ input, seed }: OrderRequest): CompositionDocument {
  const random = createRandom(seed);
  const image = input.image;
  if (!image || !Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width <= 0 || image.height <= 0 || !image.src) {
    throw new Error('ORDER needs a decoded image with valid dimensions.');
  }

  const width = 900;
  const height = 1200;
  const margin = choose(random, [60, 72, 84]);
  const columns = choose(random, [4, 6]);
  const gutter = 24;
  const contentWidth = width - 2 * margin;
  const columnWidth = (contentWidth - (columns - 1) * gutter) / columns;
  const spanWidth = (span: number) => span * columnWidth + (span - 1) * gutter;
  const columnX = (column: number) => margin + column * (columnWidth + gutter);
  const hierarchy = choose(random, ['Title first', 'Image first'] as const);
  const titleHeight = choose(random, [240, 272, 304]);
  const gap = choose(random, [36, 48]);
  const preferredTypeSize = choose(random, [88, 100, 112]);
  const footerY = height - margin - 112;
  const bodyTop = margin + 72;
  const bodyBottom = footerY - 36;
  const imageHeight = bodyBottom - bodyTop - titleHeight - gap;
  const portrait = image.width / image.height < 0.85;
  const imageSpan = portrait
    ? choose(random, [Math.ceil(columns / 2), columns - 1])
    : choose(random, [columns - 1, columns]);
  const imageColumn = choose(random, [0, columns - imageSpan]);
  const titleSpan = choose(random, [columns - 1, columns]);
  const titleBox: Box = {
    x: margin,
    y: hierarchy === 'Title first' ? bodyTop : bodyTop + imageHeight + gap,
    width: spanWidth(titleSpan),
    height: titleHeight,
  };
  const imageBox: Box = {
    x: columnX(imageColumn),
    y: hierarchy === 'Title first' ? bodyTop + titleHeight + gap : bodyTop,
    width: spanWidth(imageSpan),
    height: imageHeight,
  };
  const ratioDifference = (image.width / image.height) / (imageBox.width / imageBox.height);
  const imageElement: ImageElement = {
    kind: 'image', id: 'source-image', box: imageBox,
    asset: { ...image },
    // Keep extreme aspect ratios whole; moderate crops fill the grid frame.
    fit: ratioDifference > 1.7 || ratioDifference < 1 / 1.7 ? 'contain' : 'cover',
    focalX: choose(random, [0.25, 0.5, 0.75]),
    focalY: choose(random, [0.25, 0.5, 0.75]),
  };

  return {
    version: 1, system: 'ORDER', seed, width, height,
    source: { ...input, image: { ...image } },
    grid: { margin, columns, gutter, columnWidth },
    hierarchy,
    elements: [
      fitText('edition', 'STUDY / 01', { x: margin, y: margin, width: 240, height: 24 }, 13, 'mono'),
      fitText('seed', `ORDER / ${String(seed).padStart(6, '0')}`, { x: width - margin - 210, y: margin, width: 210, height: 24 }, 13, 'mono'),
      fitText('title', input.title.trim() || 'Untitled study', titleBox, preferredTypeSize, 'sans'),
      imageElement,
      { kind: 'texture', id: 'texture', box: { x: imageBox.x + imageBox.width - 18, y: imageBox.y, width: 18, height: imageBox.height }, pattern: 'lines', pitch: choose(random, [6, 8, 10]), opacity: 0.24 },
      { kind: 'rule', id: 'footer-rule', x1: margin, y1: footerY, x2: width - margin, y2: footerY },
      fitText('metadata', input.metadata.trim(), { x: margin, y: footerY + 20, width: spanWidth(columns - 1), height: 92 }, 14, 'mono'),
    ],
  };
}
