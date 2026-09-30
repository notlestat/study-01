import type { CompositionLocks } from '../domain/composition.ts';
import type { Box, CompositionDocument, CompositionElement, ImageElement, OperationKind, OperationRecord, TextElement } from '../domain/document.ts';
import { createRandom } from './random.ts';
import { fitText } from './text.ts';

export const OPERATION_KINDS: OperationKind[] = ['WITHHOLD', 'FRACTURE', 'COMPRESS', 'INTERRUPT', 'ECHO', 'ERODE', 'DISPLACE', 'INVERT', 'ACCIDENT'];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function move(box: Box, dx: number, dy: number, width: number, height: number): Box {
  return { ...box, x: clamp(box.x + dx, 0, width - box.width), y: clamp(box.y + dy, 0, height - box.height) };
}

function isTitle(element: CompositionElement): element is TextElement {
  return element.kind === 'text' && element.id === 'title';
}

function isImage(element: CompositionElement): element is ImageElement {
  return element.kind === 'image' && element.id === 'source-image';
}

function titleOnTop(elements: CompositionElement[]): CompositionElement[] {
  return [...elements.filter((element) => !isTitle(element)), ...elements.filter(isTitle)];
}

/** A reproducible document transformation. The browser and React are absent here. */
export function applyOperation(parent: CompositionDocument, locks: CompositionLocks, recipe: OperationRecord): CompositionDocument {
  if (!OPERATION_KINDS.includes(recipe.kind) || !Number.isFinite(recipe.intensity) || recipe.intensity < 0 || recipe.intensity > 1) {
    throw new Error('Choose a valid operation and intensity.');
  }
  const random = createRandom(recipe.seed);
  const typeFree = !locks.TYPE;
  const imageFree = !locks.IMAGE;
  const geometryFree = !locks.GRID;
  const textureFree = !locks.TEXTURE;
  const amount = recipe.intensity;
  const title = parent.elements.find(isTitle);
  const image = parent.elements.find(isImage);
  let elements = parent.elements.map((element) => ({ ...element, ...('box' in element ? { box: { ...element.box } } : {}) })) as CompositionElement[];

  switch (recipe.kind) {
    case 'WITHHOLD': {
      elements = elements.filter((element) => {
        if (element.kind === 'texture') return !textureFree;
        if (element.kind === 'rule') return !geometryFree || amount < .38;
        if (element.id === 'metadata') return !typeFree || amount < .58;
        if (element.id === 'edition' || element.id === 'seed') return amount < .82;
        return true;
      }).map((element) => {
        if (isImage(element) && imageFree && geometryFree) {
          const shrink = 1 - .55 * amount;
          const box = { ...element.box, width: element.box.width * shrink, height: element.box.height * shrink };
          return { ...element, box };
        }
        if (isTitle(element) && typeFree && geometryFree) {
          return { ...element, box: move(element.box, 0, -150 * amount, parent.width, parent.height) };
        }
        return element;
      });
      break;
    }
    case 'FRACTURE': {
      if (image && imageFree && geometryFree) {
        const count = amount < .34 ? 3 : amount < .75 ? 5 : 7;
        const strips: ImageElement[] = Array.from({ length: count }, (_, index) => {
          const sliceHeight = image.box.height / count;
          const slice: Box = { x: image.box.x, y: image.box.y + index * sliceHeight, width: image.box.width, height: sliceHeight };
          const stagger = index % 2 ? 1 : -1;
          const dx = stagger * (20 + 88 * amount) * (.65 + random() * .35);
          const dy = (random() - .5) * 26 * amount;
          const shifted = move(slice, dx, dy, parent.width, parent.height);
          return { ...image, id: `source-image-fragment-${index}`, frame: { ...image.box, x: image.box.x + shifted.x - slice.x, y: image.box.y + shifted.y - slice.y }, box: shifted };
        });
        elements = elements.flatMap<CompositionElement>((element) => isImage(element) ? strips : [element]);
      }
      if (title && typeFree && geometryFree) {
        const words = title.lines.join(' ').split(/\s+/).filter(Boolean);
        if (words.length > 1) {
          const split = clamp(Math.round(words.length * (.35 + .3 * random())), 1, words.length - 1);
          const upper = fitText('title-fragment-a', words.slice(0, split).join(' '), { ...title.box, height: title.box.height * .48 }, title.fontSize, title.font);
          const lowerBox = move({ ...title.box, height: title.box.height * .48 }, (random() - .5) * 170 * amount, title.box.height * (.48 + .12 * amount), parent.width, parent.height);
          const lower = fitText('title-fragment-b', words.slice(split).join(' '), lowerBox, title.fontSize * (1 + .18 * amount), title.font);
          elements = elements.flatMap<CompositionElement>((element) => isTitle(element) ? [upper, lower] : [element]);
        }
      }
      break;
    }
    case 'COMPRESS': {
      const centerY = (title && image) ? (title.box.y + title.box.height / 2 + image.box.y + image.box.height / 2) / 2 : parent.height / 2;
      const centerX = (title && image) ? (title.box.x + title.box.width / 2 + image.box.x + image.box.width / 2) / 2 : parent.width / 2;
      elements = elements.map((element) => {
        if (!('box' in element) || !geometryFree) return element;
        if (isTitle(element) && typeFree) {
          const box = move(element.box, (centerX - element.box.x - element.box.width / 2) * .85 * amount, (centerY - element.box.y - element.box.height / 2) * .95 * amount, parent.width, parent.height);
          return { ...element, box, letterSpacing: element.letterSpacing - element.fontSize * .08 * amount, lineHeight: element.lineHeight * (1 - .23 * amount) };
        }
        if (isImage(element) && imageFree) {
          const box = move(element.box, (centerX - element.box.x - element.box.width / 2) * .85 * amount, (centerY - element.box.y - element.box.height / 2) * .95 * amount, parent.width, parent.height);
          return { ...element, box };
        }
        if (element.kind === 'texture' && textureFree) return { ...element, pitch: Math.max(2, element.pitch * (1 - .6 * amount)) };
        return element;
      });
      if (typeFree && geometryFree) elements = titleOnTop(elements);
      break;
    }
    case 'INTERRUPT': {
      const target = random() < .5 ? 'title' : 'source-image';
      elements = elements.map((element) => {
        if (!geometryFree || !('box' in element)) return element;
        if (isTitle(element) && typeFree && target === 'title') return { ...element, box: move(element.box, (random() < .5 ? -1 : 1) * (44 + 128 * amount), (random() - .5) * 70 * amount, parent.width, parent.height) };
        if (isImage(element) && imageFree && target === 'source-image') return { ...element, box: move(element.box, (random() < .5 ? -1 : 1) * (44 + 128 * amount), (random() - .5) * 70 * amount, parent.width, parent.height) };
        return element;
      });
      if (geometryFree && (typeFree || imageFree)) {
        const anchor = target === 'title' ? title : image;
        const y = clamp((anchor?.box.y ?? parent.height * .45) + (anchor?.box.height ?? 200) * (.26 + .35 * random()), 0, parent.height - 76);
        const width = parent.width * (.5 + .5 * amount);
        const x = random() < .5 ? 0 : parent.width - width;
        elements.push({ kind: 'block', id: `interruption-${recipe.seed}`, box: { x, y, width, height: 18 + 58 * amount }, fill: 'ink', opacity: 1 });
      }
      break;
    }
    case 'ECHO': {
      if (title && typeFree && geometryFree) {
        const count = amount < .5 ? 2 : 3;
        const echoes = Array.from({ length: count }, (_, index): TextElement => ({ ...title, id: `title-echo-${index}`, box: move(title.box, (index + 1) * (12 + 35 * amount), (index + 1) * (14 + 38 * amount), parent.width, parent.height), opacity: .18 + .13 * (count - index) }));
        const at = elements.findIndex(isTitle);
        elements.splice(at, 0, ...echoes);
      }
      if (image && imageFree && geometryFree && amount > .55) {
        const echo: ImageElement = { ...image, id: 'source-image-echo', box: move(image.box, 35 + 80 * amount, -30 - 50 * amount, parent.width, parent.height), opacity: .3 + .2 * amount };
        const at = elements.findIndex(isImage);
        elements.splice(at + 1, 0, echo);
      }
      break;
    }
    case 'ERODE': {
      elements = elements.filter((element) => {
        if (element.kind === 'texture' && textureFree) return random() > amount * .7;
        if (element.kind === 'rule' && geometryFree) return random() > amount * .45;
        return true;
      }).map((element) => {
        if (isTitle(element) && typeFree) {
          const lines = element.lines.map((line) => Array.from(line).map((character) => character === ' ' || random() > amount * .48 ? character : ' ').join(''));
          return { ...element, lines };
        }
        if (isImage(element) && imageFree) return { ...element, opacity: 1 - .45 * amount };
        return element;
      });
      break;
    }
    case 'DISPLACE': {
      const dx = (random() < .5 ? -1 : 1) * (85 + 230 * amount);
      const dy = (random() < .5 ? -1 : 1) * (45 + 150 * amount);
      elements = elements.map((element) => {
        if (!geometryFree || !('box' in element)) return element;
        if (isTitle(element) && typeFree) return { ...element, box: move(element.box, dx, dy, parent.width, parent.height) };
        if (isImage(element) && imageFree) return { ...element, box: move(element.box, -dx * .7, -dy * .7, parent.width, parent.height) };
        if (element.kind === 'texture' && textureFree) return { ...element, box: move(element.box, dx * .4, dy * .4, parent.width, parent.height) };
        return element;
      });
      if (typeFree && geometryFree) elements = titleOnTop(elements);
      break;
    }
    case 'INVERT': {
      if (title && image && typeFree && imageFree && geometryFree) {
        elements = elements.map((element) => {
          if (isTitle(element)) return fitText(element.id, parent.source.title.trim() || 'Untitled study', { ...image.box }, element.fontSize * (1 + .35 * amount), element.font);
          if (isImage(element)) return { ...element, box: { ...title.box }, fit: element.fit === 'cover' ? 'contain' as const : 'cover' as const, focalX: 1 - element.focalX, focalY: 1 - element.focalY };
          return element;
        });
      } else {
        elements = elements.map((element) => isImage(element) && imageFree ? { ...element, fit: element.fit === 'cover' ? 'contain' as const : 'cover' as const, focalX: 1 - element.focalX, focalY: 1 - element.focalY } : element);
      }
      break;
    }
    case 'ACCIDENT': {
      // Each visual system has a different permissible failure. The seed chooses
      // its direction, while severity controls how far the rule is violated.
      const direction = random() < .5 ? -1 : 1;
      if (parent.system === 'ORDER') {
        const step = parent.grid.columnWidth + parent.grid.gutter;
        elements = elements.map((element) => {
          if (isTitle(element) && typeFree && geometryFree) {
            const box = move(element.box, direction * step * (.35 + .7 * amount), step * (.1 + .3 * amount), parent.width, parent.height);
            const fitted = fitText(element.id, parent.source.title.trim() || 'Untitled study', box, element.fontSize * (1 + .35 * amount), element.font);
            return { ...fitted, weight: element.weight, letterSpacing: element.letterSpacing * (1 + amount) };
          }
          if (isImage(element) && imageFree && geometryFree) {
            const width = element.box.width * (1 - .1 * amount);
            const box = move({ ...element.box, width }, -direction * step * .24 * amount, 0, parent.width, parent.height);
            return { ...element, box, focalX: clamp(element.focalX + direction * .3 * amount, 0, 1) };
          }
          return element;
        });
        if (amount >= .75 && geometryFree) {
          const x = clamp(parent.grid.margin + step * (direction > 0 ? 2 : 0), 0, parent.width - 10);
          elements.push({ kind: 'block', id: `accident-rule-${recipe.seed}`, box: { x, y: parent.grid.margin + 70, width: 5 + 13 * amount, height: parent.height * (.4 + .2 * amount) }, fill: 'ink', opacity: .95 });
        }
        if (amount >= .9 && typeFree && geometryFree && title) {
          const phrase = parent.source.title.trim().split(/\s+/u).slice(0, 2).join(' ');
          const accent = fitText(`accident-echo-${recipe.seed}`, phrase, { x: parent.grid.margin, y: parent.grid.margin + 90, width: parent.grid.columnWidth * 2 + parent.grid.gutter, height: 160 }, title.fontSize * 1.15, title.font);
          elements.push({ ...accent, weight: title.weight });
        }
        if (typeFree && geometryFree) elements = titleOnTop(elements);
      } else if (parent.system === 'SILENCE') {
        elements = elements.map((element) => {
          if (isImage(element) && imageFree && geometryFree) {
            const box = { ...element.box, width: Math.max(48, element.box.width * (1 - .62 * amount)), height: element.box.height * (1 + .42 * amount) };
            box.x = clamp(direction > 0 ? element.box.x + element.box.width - box.width : element.box.x, 0, parent.width - box.width);
            box.y = clamp(box.y - element.box.height * .08 * amount, 0, parent.height - box.height);
            return { ...element, box, fit: 'cover' as const, focalX: clamp(element.focalX + direction * .4 * amount, 0, 1) };
          }
          if (isTitle(element) && typeFree && geometryFree) {
            const box = move(element.box, -direction * 80 * amount, direction * 175 * amount, parent.width, parent.height);
            return { ...fitText(element.id, parent.source.title.trim() || 'Untitled study', box, element.fontSize * (1 - .4 * amount), element.font), weight: element.weight };
          }
          if (element.kind === 'texture' && textureFree && amount > .45) return { ...element, opacity: element.opacity * .22 };
          return element;
        });
        if (amount >= .9 && image && imageFree && geometryFree) {
          const sliver: ImageElement = { ...image, id: `accident-remnant-${recipe.seed}`, box: move({ ...image.box, width: Math.max(12, image.box.width * .08), height: image.box.height * .3 }, -direction * image.box.width * .5, image.box.height * .36, parent.width, parent.height), fit: 'cover' };
          elements.push(sliver);
        }
      } else {
        elements = elements.map((element) => {
          if (isImage(element) && imageFree && geometryFree) {
            const box = { ...element.box, width: Math.min(parent.width, element.box.width * (1 + .28 * amount)), height: element.box.height * (1 - .18 * amount) };
            box.x = clamp(box.x - direction * 95 * amount, 0, parent.width - box.width);
            box.y = clamp(box.y + direction * 65 * amount, 0, parent.height - box.height);
            return { ...element, box, focalY: clamp(element.focalY + direction * .4 * amount, 0, 1) };
          }
          if (isTitle(element) && typeFree && geometryFree) {
            const box = { ...element.box, x: clamp(element.box.x - direction * 120 * amount, 0, parent.width - element.box.width), y: clamp((image?.box.y ?? element.box.y) + (image?.box.height ?? 0) * (.35 + .3 * amount), 0, parent.height - element.box.height) };
            const tone = (parent.source.image?.analysis?.meanLuminance ?? .7) < .45 ? 'paper' as const : 'ink' as const;
            return { ...fitText(element.id, parent.source.title.trim() || 'Untitled study', box, element.fontSize * (1 + .5 * amount), element.font), weight: element.weight, tone };
          }
          return element;
        });
        if (amount >= .75 && image && imageFree && geometryFree) {
          const stripHeight = image.box.height * (.08 + .1 * amount);
          elements.push({ ...image, id: `accident-repeat-${recipe.seed}`, box: move({ ...image.box, y: image.box.y + image.box.height - stripHeight, height: stripHeight }, -direction * 100 * amount, 115 * amount, parent.width, parent.height), frame: image.box });
        }
        if (amount >= .9 && typeFree && geometryFree) {
          const accidentTitle = elements.find(isTitle);
          if (accidentTitle) {
            elements.push({ kind: 'block', id: `accident-blackout-${recipe.seed}`, box: { x: 0, y: accidentTitle.box.y - 16, width: parent.width, height: Math.min(parent.height - accidentTitle.box.y + 16, accidentTitle.box.height + 32) }, fill: 'ink', opacity: 1 });
            elements = elements.map((element) => isTitle(element) ? { ...element, tone: 'paper' as const } : element);
          }
        }
        if (typeFree && geometryFree) elements = titleOnTop(elements);
      }
      break;
    }
  }

  return { ...parent, hierarchy: `${parent.hierarchy} / ${recipe.kind.toLowerCase()}`, operations: [...(parent.operations ?? []), { ...recipe }], elements };
}
