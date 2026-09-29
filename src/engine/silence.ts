import type { CompositionInput } from '../domain/composition.ts';
import type { Box, CompositionDocument } from '../domain/document.ts';
import { choose, createRandom } from './random.ts';
import { requireImage, frameImage } from './shared.ts';
import { fitText } from './text.ts';

interface SilenceRequest { input: CompositionInput; seed: number }

// SILENCE gives the image one quiet anchor and lets the rest of the page breathe.
export function generateSilence({ input, seed }: SilenceRequest): CompositionDocument {
  const random = createRandom(seed);
  const image = requireImage(input);
  const width = 900;
  const height = 1200;
  const margin = choose(random, [78, 96, 114]);
  const columns = choose(random, [5, 6]);
  const gutter = 24;
  const columnWidth = (width - 2 * margin - (columns - 1) * gutter) / columns;
  const columnX = (column: number) => margin + column * (columnWidth + gutter);
  const spanWidth = (span: number) => span * columnWidth + (span - 1) * gutter;
  const imageSide = choose(random, ['Left', 'Right'] as const);
  const imageSpan = choose(random, [3, 4]);
  const imageColumn = imageSide === 'Left' ? 0 : columns - imageSpan;
  const imageBox: Box = {
    x: columnX(imageColumn),
    y: choose(random, [500, 530, 560]),
    width: spanWidth(imageSpan),
    height: choose(random, [330, 360, 390]),
  };
  const titleBox: Box = {
    x: imageSide === 'Left' ? margin : columnX(1),
    y: choose(random, [190, 220, 250]),
    width: spanWidth(columns - 1),
    height: 180,
  };
  const footerY = height - margin - 76;
  return {
    version: 1, system: 'SILENCE', seed, width, height,
    source: { ...input, image: { ...image } },
    grid: { margin, columns, gutter, columnWidth },
    hierarchy: `${imageSide} image / open field`,
    elements: [
      fitText('edition', 'STUDY / 01', { x: margin, y: margin, width: 190, height: 24 }, 12, 'mono'),
      fitText('seed', `SILENCE / ${String(seed).padStart(6, '0')}`, { x: width - margin - 245, y: margin, width: 245, height: 24 }, 12, 'mono'),
      fitText('title', input.title.trim() || 'Untitled study', titleBox, choose(random, [48, 56, 64]), 'sans'),
      frameImage(image, imageBox, random),
      { kind: 'texture', id: 'texture', box: { x: imageSide === 'Left' ? width - margin - 66 : margin, y: 700, width: 66, height: 66 }, pattern: 'dots', pitch: choose(random, [10, 12, 14]), opacity: 0.25 },
      { kind: 'rule', id: 'footer-rule', x1: margin, y1: footerY, x2: width - margin, y2: footerY },
      fitText('metadata', input.metadata.trim(), { x: margin, y: footerY + 18, width: spanWidth(columns - 1), height: 58 }, 12, 'mono'),
    ],
  };
}
