import type { ImageAsset } from '../domain/composition.ts';
import type { CompositionDocument, ProcessingPass } from '../domain/document.ts';

export function withProcessedImage(document: CompositionDocument, result: ImageAsset, passes: ProcessingPass[]): CompositionDocument {
  const current = document.source.image;
  if (!current) throw new Error('Add an image before using PASS.');
  const original = document.processing?.original ?? current;
  return {
    ...document,
    source: { ...document.source, image: result },
    processing: { original, passes: passes.map((pass) => ({ ...pass })) },
    elements: document.elements.map((element) => element.kind === 'image' && element.asset.id === current.id ? { ...element, asset: result } : element),
  };
}

export function originalImageDocument(document: CompositionDocument): CompositionDocument {
  const original = document.processing?.original;
  const current = document.source.image;
  if (!original || !current) return document;
  const { processing: _processing, ...unprocessed } = document;
  return {
    ...unprocessed,
    source: { ...unprocessed.source, image: original },
    elements: unprocessed.elements.map((element) => element.kind === 'image' && element.asset.id === current.id ? { ...element, asset: original } : element),
  };
}
