import type { CompositionInput, SystemId } from '../domain/composition.ts';
import type { CompositionDocument } from '../domain/document.ts';
import { ENGINE_REVISION } from './revision.ts';
import { generateOrder } from './order.ts';
import { generateSilence } from './silence.ts';
import { generateTension } from './tension.ts';

export function generateComposition(request: { system: SystemId; input: CompositionInput; seed: number }): CompositionDocument {
  let document: CompositionDocument;
  switch (request.system) {
    case 'ORDER': document = generateOrder(request); break;
    case 'SILENCE': document = generateSilence(request); break;
    case 'TENSION': document = generateTension(request); break;
  }
  return { ...document, engineRevision: ENGINE_REVISION };
}
