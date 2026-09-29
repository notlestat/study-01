import type { CompositionInput, ImageAsset } from '../domain/composition.ts';
import type { Box, ImageElement } from '../domain/document.ts';
import { choose } from './random.ts';

export function requireImage(input: CompositionInput): ImageAsset {
  const image = input.image;
  if (!image || !Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width <= 0 || image.height <= 0 || !image.src) {
    throw new Error('Add a decoded image with valid dimensions.');
  }
  return image;
}

export function frameImage(image: ImageAsset, box: Box, random: () => number, cropTolerance = 1.7): ImageElement {
  const ratioDifference = (image.width / image.height) / (box.width / box.height);
  const extreme = ratioDifference > cropTolerance || ratioDifference < 1 / cropTolerance;
  return {
    kind: 'image', id: 'source-image', box, asset: { ...image },
    fit: extreme ? 'contain' : cropTolerance > 1.7 ? 'cover' : choose(random, ['contain', 'cover'] as const),
    focalX: choose(random, [0.2, 0.5, 0.8]),
    focalY: choose(random, [0.2, 0.5, 0.8]),
  };
}
