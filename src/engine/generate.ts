import type { CompositionInput, SystemId } from '../domain/composition.ts';
import type { CompositionDocument } from '../domain/document.ts';
import { generateOrder } from './order.ts';
import { generateSilence } from './silence.ts';
import { generateTension } from './tension.ts';

export function generateComposition(request: { system: SystemId; input: CompositionInput; seed: number }): CompositionDocument {
  switch (request.system) {
    case 'ORDER': return generateOrder(request);
    case 'SILENCE': return generateSilence(request);
    case 'TENSION': return generateTension(request);
  }
}
