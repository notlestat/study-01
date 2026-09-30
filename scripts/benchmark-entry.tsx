import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateComposition } from '../src/engine/generate.ts';
import { applyOperation } from '../src/engine/operations.ts';
import { applySpaceZones } from '../src/engine/space.ts';
import { applyImageType } from '../src/engine/imageType.ts';
import { crossbreedCompositions } from '../src/engine/crossbreed.ts';
import { applyTypography } from '../src/engine/typography.ts';
import { generateFamily } from '../src/engine/family.ts';
import { driftFrame } from '../src/engine/drift.ts';
import { withColour } from '../src/engine/colour.ts';
import { CompositionRenderer } from '../src/components/canvas/CompositionRenderer.tsx';
import type { CompositionDocument } from '../src/domain/document.ts';

export { generateComposition, applyOperation, applySpaceZones, applyImageType, crossbreedCompositions, applyTypography, generateFamily, driftFrame, withColour };

export function renderDocument(document: CompositionDocument): string {
  return renderToStaticMarkup(createElement(CompositionRenderer, { document }));
}
