import type { CompositionLocks } from '../domain/composition.ts';
import type { CompositionDocument } from '../domain/document.ts';
import { mutateComposition } from './mutate.ts';
import { MAX_SEED } from './random.ts';

export const PROOF_SIZES = [4, 9, 12, 16] as const;
export type ProofSize = (typeof PROOF_SIZES)[number];

/** All studies branch from one parent; a skipped seed never duplicates a later card. */
export function generateProof(parent: CompositionDocument, locks: CompositionLocks, count: ProofSize): CompositionDocument[] {
  if (!PROOF_SIZES.includes(count)) throw new Error('Choose 4, 9, 12, or 16 studies.');
  if (Object.values(locks).every(Boolean)) throw new Error('Release at least one lock to make a proof.');
  const documents: CompositionDocument[] = [];
  let nextSeed = (parent.seed + 1) % (MAX_SEED + 1);
  for (let index = 0; index < count; index++) {
    const document = mutateComposition(parent, locks, nextSeed);
    documents.push(document);
    nextSeed = (document.seed + 1) % (MAX_SEED + 1);
  }
  return documents;
}
