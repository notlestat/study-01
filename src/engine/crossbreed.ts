import type { CompositionLocks } from '../domain/composition.ts';
import type { Box, CompositionDocument, ImageElement, TextElement } from '../domain/document.ts';
import { fitText } from './text.ts';

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

function first<T extends TextElement | ImageElement>(document: CompositionDocument, id: string, kind: T['kind']): T {
  const element = document.elements.find((item) => item.id === id && item.kind === kind);
  if (!element) throw new Error(`Both parents need a ${id} element to crossbreed.`);
  return element as T;
}

function insidePaper(box: Box, document: CompositionDocument): Box {
  const margin = Math.max(20, document.grid.margin * .55);
  const width = clamp(box.width, 40, document.width - margin * 2);
  const height = clamp(box.height, 30, document.height - margin * 2);
  return {
    x: clamp(box.x, margin, document.width - margin - width),
    y: clamp(box.y, margin, document.height - margin - height),
    width, height,
  };
}

function spliceImage(image: ImageElement, donorImage: ImageElement, document: CompositionDocument, weight: number): ImageElement[] {
  if (weight <= .55) return [image];
  const influence = (weight - .55) / .45;
  const donorWide = donorImage.box.width / donorImage.box.height > 1.05;
  const ratio = clamp(donorWide
    ? donorImage.box.height / document.height
    : donorImage.box.width / document.width, .3, .7);
  const gap = (15 + 52 * influence) * (donorWide ? 1 : -1);
  const frame = image.box;
  const firstBox: Box = donorWide
    ? { ...frame, height: frame.height * ratio }
    : { ...frame, width: frame.width * ratio };
  const secondBox: Box = donorWide
    ? { ...frame, y: frame.y + frame.height * ratio, height: frame.height * (1 - ratio) }
    : { ...frame, x: frame.x + frame.width * ratio, width: frame.width * (1 - ratio) };
  const displaced = insidePaper({ ...secondBox,
    x: secondBox.x + (donorWide ? gap : 0),
    y: secondBox.y + (donorWide ? 0 : gap),
  }, document);
  const dx = displaced.x - secondBox.x, dy = displaced.y - secondBox.y;
  return [
    { ...image, box: firstBox, frame },
    { ...image, id: 'source-image-slice-crossbreed', box: displaced, frame: { ...frame, x: frame.x + dx, y: frame.y + dy } },
  ];
}

/**
 * Transplant the donor's type-to-image relationship into the base grid.
 * No DOM, randomness or browser storage is involved, so the result can be
 * rendered in the UI, tests or an offline artwork review.
 */
export function crossbreedCompositions(base: CompositionDocument, donor: CompositionDocument, donorWeight: number): CompositionDocument {
  if (!Number.isFinite(donorWeight) || donorWeight < 0 || donorWeight > 1) throw new Error('Crossbreed weight must be between 0 and 1.');
  if (base.width !== donor.width || base.height !== donor.height) throw new Error('Parents must use the same paper size.');
  if (base.lineage?.id && base.lineage.id === donor.lineage?.id) throw new Error('Choose two different studies to crossbreed.');

  const baseImage = first<ImageElement>(base, 'source-image', 'image');
  const donorImage = first<ImageElement>(donor, 'source-image', 'image');
  const baseTitle = first<TextElement>(base, 'title', 'text');
  const donorTitle = first<TextElement>(donor, 'title', 'text');
  const baseMetadata = base.elements.find((item): item is TextElement => item.id === 'metadata' && item.kind === 'text');
  const donorMetadata = donor.elements.find((item): item is TextElement => item.id === 'metadata' && item.kind === 'text');
  const relationship = {
    x: (donorTitle.box.x - donorImage.box.x) / donorImage.box.width,
    y: (donorTitle.box.y - donorImage.box.y) / donorImage.box.height,
    width: donorTitle.box.width / donorImage.box.width,
    height: donorTitle.box.height / donorImage.box.height,
  };
  const transplanted = {
    x: baseImage.box.x + relationship.x * baseImage.box.width,
    y: baseImage.box.y + relationship.y * baseImage.box.height,
    width: relationship.width * baseImage.box.width,
    height: relationship.height * baseImage.box.height,
  };
  const titleBox = insidePaper({
    x: mix(baseTitle.box.x, transplanted.x, donorWeight),
    y: mix(baseTitle.box.y, transplanted.y, donorWeight),
    width: mix(baseTitle.box.width, transplanted.width, donorWeight),
    height: mix(baseTitle.box.height, transplanted.height, donorWeight),
  }, base);
  const text = donor.source.title.trim() || 'Untitled study';
  const title = fitText('title', text, titleBox, mix(baseTitle.fontSize, donorTitle.fontSize, donorWeight), donorWeight >= .5 ? donorTitle.font : baseTitle.font);
  title.weight = donorWeight >= .35 ? donorTitle.weight : baseTitle.weight;
  title.letterSpacing = mix(baseTitle.letterSpacing, donorTitle.letterSpacing, donorWeight);
  const materialParent = donorWeight >= .5 ? donorTitle : baseTitle;
  if (materialParent.glyphs?.length) {
    title.glyphs = materialParent.glyphs.map((mark) => ({ ...mark,
      x: clamp(titleBox.x + (mark.x - materialParent.box.x) / materialParent.box.width * titleBox.width, 0, base.width),
      y: clamp(titleBox.y + (mark.y - materialParent.box.y) / materialParent.box.height * titleBox.height, 0, base.height),
    }));
    title.erasures = materialParent.erasures?.map((box) => ({
      x: titleBox.x + (box.x - materialParent.box.x) / materialParent.box.width * titleBox.width,
      y: titleBox.y + (box.y - materialParent.box.y) / materialParent.box.height * titleBox.height,
      width: box.width / materialParent.box.width * titleBox.width,
      height: box.height / materialParent.box.height * titleBox.height,
    }));
  }
  const imageIntersection = titleBox.x < baseImage.box.x + baseImage.box.width && titleBox.x + titleBox.width > baseImage.box.x
    && titleBox.y < baseImage.box.y + baseImage.box.height && titleBox.y + titleBox.height > baseImage.box.y;
  title.tone = imageIntersection ? (donorTitle.tone ?? baseTitle.tone ?? 'ink') : 'ink';

  let metadata: TextElement | undefined;
  if (baseMetadata && donorMetadata) {
    const box = insidePaper({
      x: mix(baseMetadata.box.x, donorMetadata.box.x, donorWeight * .65),
      y: mix(baseMetadata.box.y, donorMetadata.box.y, donorWeight * .65),
      width: mix(baseMetadata.box.width, donorMetadata.box.width, donorWeight),
      height: mix(baseMetadata.box.height, donorMetadata.box.height, donorWeight),
    }, base);
    metadata = fitText('metadata', donor.source.metadata, box, mix(baseMetadata.fontSize, donorMetadata.fontSize, donorWeight), donorMetadata.font);
    metadata.weight = donorMetadata.weight;
  }

  // Keep the base's spatial grammar and image; replace its type grammar.
  const elements = base.elements.filter((item) => item.id !== 'title' && item.id !== 'metadata' && !item.id.startsWith('title-slice-') && !item.id.startsWith('source-image-slice-'));
  const imageIndex = elements.findIndex((item) => item.id === 'source-image');
  if (imageIndex >= 0 && donorWeight > .55) {
    const image = {
    ...baseImage,
    focalX: mix(baseImage.focalX, donorImage.focalX, (donorWeight - .55) / .45),
    focalY: mix(baseImage.focalY, donorImage.focalY, (donorWeight - .55) / .45),
    };
    elements.splice(imageIndex, 1, ...spliceImage(image, donorImage, base, donorWeight));
  }
  elements.push(title);
  if (metadata) elements.push(metadata);
  return {
    ...base,
    source: { ...base.source, title: donor.source.title, metadata: donor.source.metadata },
    hierarchy: `${base.hierarchy} × ${donor.hierarchy}`,
    family: `Crossbreed / ${base.system} × ${donor.system}`,
    imageType: undefined,
    typography: donorWeight >= .5 ? donor.typography : base.typography,
    operations: undefined,
    spaceZones: undefined,
    elements,
  };
}

export function crossbreedDocument(base: CompositionDocument, donor: CompositionDocument, donorWeight: number, locks: CompositionLocks, id: string, createdAt: string): CompositionDocument {
  if (!base.lineage || !donor.lineage) throw new Error('Both parents need lineage before crossbreeding.');
  const hybrid = crossbreedCompositions(base, donor, donorWeight);
  return {
    ...hybrid,
    lineage: {
      id,
      parentIds: [base.lineage.id, donor.lineage.id],
      rootSeed: base.lineage.rootSeed,
      generation: Math.max(base.lineage.generation, donor.lineage.generation) + 1,
      event: 'CROSSBREED',
      locks: { ...locks },
      createdAt,
      crossbreed: { baseId: base.lineage.id, donorId: donor.lineage.id, donorWeight },
    },
  };
}
