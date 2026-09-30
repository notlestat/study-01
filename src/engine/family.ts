import type { CompositionLocks } from '../domain/composition.ts';
import type { Box, CompositionDocument, CompositionElement, FamilyFormat, ImageElement, TextElement } from '../domain/document.ts';
import { applyImageType } from './imageType.ts';
import { applyTypography } from './typography.ts';
import { generateComposition } from './generate.ts';
import { fitText } from './text.ts';

export const FAMILY_FORMATS: FamilyFormat[] = ['POSTER', 'SQUARE', 'EDITORIAL', 'BANNER', 'SOCIAL_PORTRAIT', 'TYPE_ONLY', 'IMAGE_ONLY'];
export const FAMILY_SIZES: Record<FamilyFormat, [number, number]> = {
  POSTER: [900, 1200], SQUARE: [1000, 1000], EDITORIAL: [1200, 1600], BANNER: [1600, 600],
  SOCIAL_PORTRAIT: [1080, 1350], TYPE_ONLY: [900, 1200], IMAGE_ONLY: [900, 1200],
};
const UNLOCKED: CompositionLocks = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function boxInside(box: Box, width: number, height: number): Box {
  const sized = { ...box, width: clamp(box.width, 20, width), height: clamp(box.height, 20, height) };
  return { ...sized, x: clamp(box.x, 0, width - sized.width), y: clamp(box.y, 0, height - sized.height) };
}

function titleAt(parent: TextElement, text: string, box: Box, size: number): TextElement {
  return { ...fitText('title', text.trim() || 'Untitled study', box, size, parent.font), weight: parent.weight, letterSpacing: parent.letterSpacing * size / parent.fontSize, tone: 'ink' };
}

/** Recompose source DNA against each output format's spatial constraints. */
export function generateFamily(parent: CompositionDocument): CompositionDocument[] {
  if (!parent.source.image) throw new Error('A visual family needs a source image.');
  // A developed type-only or image-only asset can still become a full family.
  const originalFormat = generateComposition({ system: parent.system, input: parent.source, seed: parent.seed });
  const image = parent.elements.find((item): item is ImageElement => item.id === 'source-image' && item.kind === 'image')
    ?? originalFormat.elements.find((item): item is ImageElement => item.id === 'source-image' && item.kind === 'image');
  const title = parent.elements.find((item): item is TextElement => item.id === 'title' && item.kind === 'text')
    ?? originalFormat.elements.find((item): item is TextElement => item.id === 'title' && item.kind === 'text');
  const metadata = parent.elements.find((item): item is TextElement => item.id === 'metadata' && item.kind === 'text')
    ?? originalFormat.elements.find((item): item is TextElement => item.id === 'metadata' && item.kind === 'text');
  if (!image || !title) throw new Error('A visual family needs a parent with an image and title.');
  const imageRight = image.box.x + image.box.width / 2 > parent.width / 2;
  const imageAbove = image.box.y + image.box.height / 2 < title.box.y + title.box.height / 2;
  const imageArea = image.box.width * image.box.height / (parent.width * parent.height);
  const titleScale = clamp(title.fontSize / 100, .55, 1.65);
  const parentId = parent.lineage?.id;

  return FAMILY_FORMATS.map((format) => {
    if (format === 'POSTER') {
      const source = parent.familyAsset && parent.familyAsset.format !== 'POSTER' ? originalFormat : parent;
      let poster: CompositionDocument = { ...source, processing: parent.processing, colour: parent.colour, drift: parent.drift, familyAsset: { format, parentId }, lineage: undefined };
      if (source === originalFormat && parent.imageType) poster = applyImageType(poster, UNLOCKED, parent.imageType);
      if (source === originalFormat && parent.typography?.length) poster = applyTypography(poster, UNLOCKED, parent.typography.at(-1)!);
      return poster;
    }
    const [width, height] = FAMILY_SIZES[format];
    const margin = Math.round(Math.min(width, height) * (parent.system === 'SILENCE' ? .095 : .065));
    const columns = format === 'BANNER' ? 8 : parent.grid.columns;
    const gutter = clamp(parent.grid.gutter / parent.width * width, 12, 30);
    const columnWidth = (width - 2 * margin - (columns - 1) * gutter) / columns;
    const frame = (box: Box): ImageElement => ({ ...image, id: 'source-image', box: boxInside(box, width, height), frame: undefined, fit: 'cover' });
    let elements: CompositionElement[] = [];
    let hierarchy = '';
    let imageBox: Box | null = null;
    let titleBox: Box | null = null;
    let preferredSize = title.fontSize;

    switch (format) {
      case 'SQUARE': {
        const imageWidth = clamp(width * (.48 + imageArea * .28), width * .42, width * .7);
        imageBox = { x: imageRight ? width - margin - imageWidth : margin, y: margin + 65, width: imageWidth, height: parent.system === 'SILENCE' ? height * .47 : height * .62 };
        titleBox = parent.system === 'TENSION'
          ? { x: imageRight ? margin : width * .38, y: height * .53, width: width * .52, height: height * .3 }
          : { x: imageRight ? margin : width * .57, y: imageAbove ? height * .65 : height * .18, width: width * .34, height: height * .28 };
        preferredSize = 82 * titleScale;
        hierarchy = 'Square / asymmetric image-to-type counterweight';
        break;
      }
      case 'EDITORIAL': {
        const imageWidth = width * clamp(.52 + imageArea * .23, .52, .68);
        imageBox = { x: imageRight ? width - margin - imageWidth : margin, y: height * .16, width: imageWidth, height: height * (.54 + imageArea * .13) };
        titleBox = { x: imageRight ? margin : width * .5, y: imageAbove ? height * .68 : height * .12, width: width * .47, height: height * .28 };
        preferredSize = 116 * titleScale;
        hierarchy = 'Editorial / image column and independent headline';
        break;
      }
      case 'BANNER': {
        if (parent.system === 'TENSION') {
          imageBox = { x: width * .28, y: margin, width: width * .68, height: height - 2 * margin };
          titleBox = { x: margin, y: height * .31, width: width * .52, height: height * .48 };
        } else if (parent.system === 'SILENCE') {
          imageBox = { x: imageRight ? width * .7 : margin, y: height * .15, width: width * .23, height: height * .58 };
          titleBox = { x: imageRight ? margin : width * .48, y: height * .35, width: width * .42, height: height * .35 };
        } else {
          imageBox = { x: imageRight ? width * .51 : margin, y: margin, width: width * .43, height: height - 2 * margin };
          titleBox = { x: imageRight ? margin : width * .5, y: height * .28, width: width * .42, height: height * .47 };
        }
        preferredSize = 84 * titleScale;
        hierarchy = 'Banner / horizontal hierarchy';
        break;
      }
      case 'SOCIAL_PORTRAIT': {
        imageBox = { x: parent.system === 'SILENCE' ? width * .27 : margin, y: margin + 70, width: parent.system === 'SILENCE' ? width * .62 : width - 2 * margin, height: height * (parent.system === 'SILENCE' ? .47 : .55) };
        titleBox = parent.system === 'TENSION'
          ? { x: margin, y: height * .56, width: width * .82, height: height * .28 }
          : { x: imageRight ? margin : width * .2, y: height * .68, width: width * .7, height: height * .22 };
        preferredSize = 112 * titleScale;
        hierarchy = 'Social portrait / crop and title field';
        break;
      }
      case 'TYPE_ONLY': {
        const y = parent.system === 'SILENCE' ? height * .53 : parent.system === 'TENSION' ? height * .2 : height * .32;
        titleBox = { x: margin, y, width: width - 2 * margin, height: height * (parent.system === 'SILENCE' ? .27 : .43) };
        preferredSize = 178 * titleScale;
        hierarchy = 'Type only / image removed, hierarchy retained';
        break;
      }
      case 'IMAGE_ONLY': {
        imageBox = parent.system === 'SILENCE'
          ? { x: imageRight ? width * .37 : margin, y: height * .18, width: width * .53, height: height * .54 }
          : { x: margin, y: margin + 60, width: width - 2 * margin, height: height - 2 * margin - 130 };
        hierarchy = 'Image only / type withheld';
        break;
      }
    }

    elements.push(fitText('header', 'STUDY / 01', { x: margin, y: margin * .55, width: width * .34, height: 35 }, 16, 'mono'));
    elements.push(fitText('edition', `${parent.system} / ${String(parent.seed).padStart(6, '0')}`, { x: width - margin - width * .36, y: margin * .55, width: width * .36, height: 35 }, 14, 'mono'));
    if (imageBox) elements.push(frame(imageBox));
    const footerY = height - margin - 74;
    if (titleBox) {
      const safeBox = boxInside({ ...titleBox, height: Math.max(80, Math.min(titleBox.height, footerY - 24 - titleBox.y)) }, width, height);
      const titleElement = titleAt(title, parent.source.title, safeBox, preferredSize);
      if (imageBox && parent.system === 'TENSION' && format !== 'TYPE_ONLY') titleElement.tone = (parent.source.image?.analysis?.meanLuminance ?? .7) < .45 ? 'paper' : 'ink';
      elements.push(titleElement);
    }
    elements.push({ kind: 'rule', id: 'footer-rule', x1: margin, y1: footerY, x2: width - margin, y2: footerY });
    if (metadata && format !== 'IMAGE_ONLY') elements.push({ ...fitText('metadata', parent.source.metadata, { x: margin, y: footerY + 12, width: width * .68, height: 58 }, clamp(metadata.fontSize * width / parent.width, 12, 18), 'mono'), weight: metadata.weight });
    else if (format === 'IMAGE_ONLY') elements.push(fitText('metadata', `${parent.system} / IMAGE STUDY`, { x: margin, y: footerY + 12, width: width * .5, height: 32 }, 13, 'mono'));

    let document: CompositionDocument = {
      ...parent, width, height, grid: { margin, columns, gutter, columnWidth },
      hierarchy, familyAsset: { format, parentId }, lineage: undefined,
      operations: undefined, imageType: undefined, typography: undefined, spaceZones: undefined, elements,
    };
    if (titleBox && imageBox && parent.imageType) document = applyImageType(document, UNLOCKED, parent.imageType);
    if (titleBox && parent.typography?.length) {
      // Reapply the last serialisable material recipe to the recomposed type.
      document = applyTypography(document, UNLOCKED, parent.typography.at(-1)!);
    }
    return document;
  });
}
