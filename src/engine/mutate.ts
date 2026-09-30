import type { CompositionLocks } from '../domain/composition.ts';
import type { Box, CompositionDocument, CompositionElement, TextElement } from '../domain/document.ts';
import { generateComposition } from './generate.ts';
import { assertSeed, MAX_SEED } from './random.ts';
import { fitText } from './text.ts';
import { applySpaceZones } from './space.ts';
import { generateFamily } from './family.ts';

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function geometryOf(candidate: CompositionElement, original: CompositionElement, source: CompositionDocument['source']): CompositionElement {
  if (candidate.kind === 'rule' && original.kind === 'rule') {
    return { ...candidate, x1: original.x1, y1: original.y1, x2: original.x2, y2: original.y2 };
  }
  if ('box' in candidate && 'box' in original) {
    if (candidate.kind === 'text') {
      const content = candidate.id === 'title' ? source.title.trim() || 'Untitled study'
        : candidate.id === 'metadata' ? source.metadata.trim() : candidate.lines.join(' ');
      return fitText(candidate.id, content, { ...original.box }, candidate.fontSize, candidate.font);
    }
    return { ...candidate, box: { ...original.box } };
  }
  return candidate;
}

function merge(current: CompositionDocument, candidate: CompositionDocument, locks: CompositionLocks): CompositionDocument {
  const previous = new Map(current.elements.map((element) => [element.id, element]));
  const elements = candidate.elements.map((generated) => {
    const original = previous.get(generated.id);
    if (!original || original.kind !== generated.kind) return generated;
    // TYPE means the title and metadata, not the changing edition/seed labels.
    if (locks.TYPE && generated.kind === 'text' && (generated.id === 'title' || generated.id === 'metadata')) return original;
    if (locks.IMAGE && generated.kind === 'image') return original;
    if (locks.TEXTURE && generated.kind === 'texture') return original;
    return locks.GRID ? geometryOf(generated, original, current.source) : generated;
  });
  return { ...candidate, grid: locks.GRID ? current.grid : candidate.grid, elements };
}

function hasCollision(document: CompositionDocument): boolean {
  const title = document.elements.find((element): element is TextElement => element.id === 'title' && element.kind === 'text');
  const image = document.elements.find((element) => element.kind === 'image');
  return !!title && !!image && overlaps(title.box, image.box);
}

/** Pure mutation: candidate seeds are searched until the held parts still make a valid composition. */
export function mutateComposition(current: CompositionDocument, locks: CompositionLocks, startSeed = (current.seed + 1) % (MAX_SEED + 1)): CompositionDocument {
  if (Object.values(locks).every(Boolean)) return current;
  assertSeed(startSeed);
  for (let offset = 0; offset < 128; offset++) {
    const seed = (startSeed + offset) % (MAX_SEED + 1);
    const generated = generateComposition({ system: current.system, input: current.source, seed });
    const candidate = current.familyAsset
      ? generateFamily({ ...generated, processing: current.processing, typography: current.typography }).find((item) => item.familyAsset?.format === current.familyAsset?.format)!
      : generated;
    if (current.familyAsset) candidate.familyAsset = { ...current.familyAsset };
    if (current.drift) candidate.drift = { ...current.drift };
    if (current.colour) candidate.colour = { ...current.colour };
    if (locks.GRID && current.family && candidate.family !== current.family) continue;
    const result = merge(current, candidate, locks);
    // Some family formats intentionally set type over the image. Preserve that
    // relationship, while still rejecting a collision introduced by locks.
    if (hasCollision(result) && !(current.familyAsset && hasCollision(candidate))) continue;
    if (current.spaceZones?.length) {
      try { return applySpaceZones(result, current.spaceZones, locks); } catch { continue; }
    }
    return result;
  }
  throw new Error('No clear arrangement was found. Release a lock and try again.');
}
