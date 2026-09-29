import type { CompositionInput } from '../domain/composition.ts';
import type { Box, CompositionDocument } from '../domain/document.ts';
import { choose, createRandom } from './random.ts';
import { requireImage, frameImage } from './shared.ts';
import { fitText } from './text.ts';

interface TensionRequest { input: CompositionInput; seed: number }

// TENSION opposes a dense image column with a large, narrow title block.
export function generateTension({ input, seed }: TensionRequest): CompositionDocument {
  const random = createRandom(seed);
  const image = requireImage(input);
  const width = 900;
  const height = 1200;
  const margin = choose(random, [54, 66, 78]);
  const columns = 6;
  const gutter = choose(random, [18, 24]);
  const columnWidth = (width - 2 * margin - (columns - 1) * gutter) / columns;
  const columnX = (column: number) => margin + column * (columnWidth + gutter);
  const spanWidth = (span: number) => span * columnWidth + (span - 1) * gutter;
  const imageSide = choose(random, ['Left', 'Right'] as const);
  const imageSpan = 3;
  const imageBox: Box = {
    x: imageSide === 'Left' ? margin : columnX(columns - imageSpan),
    y: choose(random, [188, 218, 248]),
    width: spanWidth(imageSpan),
    height: choose(random, [670, 710, 750]),
  };
  const titleBox: Box = {
    x: imageSide === 'Left' ? columnX(imageSpan) : margin,
    y: choose(random, [360, 410, 460]),
    width: spanWidth(columns - imageSpan),
    height: 420,
  };
  const footerY = height - margin - 112;
  return {
    version: 1, system: 'TENSION', seed, width, height,
    source: { ...input, image: { ...image } },
    grid: { margin, columns, gutter, columnWidth },
    hierarchy: `${imageSide} image / opposing title`,
    elements: [
      fitText('edition', 'STUDY / 01', { x: margin, y: margin, width: 190, height: 24 }, 13, 'mono'),
      fitText('seed', `TENSION / ${String(seed).padStart(6, '0')}`, { x: width - margin - 245, y: margin, width: 245, height: 24 }, 13, 'mono'),
      { kind: 'rule', id: 'top-rule', x1: margin, y1: 151, x2: width - margin, y2: 151 },
      frameImage(image, imageBox, random, 4),
      fitText('title', input.title.trim() || 'Untitled study', titleBox, choose(random, [88, 96, 104]), 'sans'),
      { kind: 'texture', id: 'texture', box: { x: titleBox.x, y: 210, width: titleBox.width, height: 72 }, pattern: 'lines', pitch: choose(random, [7, 9, 11]), opacity: 0.34 },
      { kind: 'rule', id: 'footer-rule', x1: margin, y1: footerY, x2: width - margin, y2: footerY },
      fitText('metadata', input.metadata.trim(), { x: margin, y: footerY + 22, width: spanWidth(columns - 1), height: 90 }, 13, 'mono'),
    ],
  };
}
