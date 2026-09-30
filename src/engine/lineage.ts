import type { CompositionLocks } from '../domain/composition.ts';
import type { CompositionDocument, EvolutionEvent } from '../domain/document.ts';

import { ENGINE_REVISION } from './revision.ts';

const UNLOCKED: CompositionLocks = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };

export function establishLineage(document: CompositionDocument, id: string, createdAt: string): CompositionDocument {
  return { ...document, lineage: { id, parentIds: [], rootSeed: document.seed, generation: 0, event: 'ROOT', locks: { ...UNLOCKED }, createdAt } };
}

/** Identity is supplied by the caller; inheritance itself stays pure and reproducible. */
export function evolveDocument(parent: CompositionDocument, child: CompositionDocument, event: EvolutionEvent, locks: CompositionLocks, id: string, createdAt: string): CompositionDocument {
  return {
    ...child, engineRevision: ENGINE_REVISION,
    lineage: {
      id, parentIds: parent.lineage ? [parent.lineage.id] : [],
      rootSeed: parent.lineage?.rootSeed ?? parent.seed,
      generation: (parent.lineage?.generation ?? 0) + 1,
      event, locks: { ...locks }, createdAt,
    },
  };
}
