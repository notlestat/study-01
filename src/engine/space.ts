import type { CompositionLocks } from '../domain/composition.ts';
import type { Box, CompositionDocument, CompositionElement, ImageElement, SpaceZone, TextElement } from '../domain/document.ts';
import { fitText } from './text.ts';

const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const inside = (x: number, y: number, box: Box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;

function pointInPolygon(x: number, y: number, points: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function segmentsMeet(a: [number, number], b: [number, number], c: [number, number], d: [number, number]): boolean {
  const cross = (p: [number, number], q: [number, number], r: [number, number]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  return abC * abD <= 0 && cdA * cdB <= 0;
}

export function intersectsZone(box: Box, zone: SpaceZone): boolean {
  if (!overlaps(box, zone.box)) return false;
  if (zone.shape === 'rectangle') return true;
  if (zone.shape === 'ellipse') {
    const cx = zone.box.x + zone.box.width / 2, cy = zone.box.y + zone.box.height / 2;
    const rx = zone.box.width / 2, ry = zone.box.height / 2;
    const nearestX = Math.max(box.x, Math.min(cx, box.x + box.width));
    const nearestY = Math.max(box.y, Math.min(cy, box.y + box.height));
    return ((nearestX - cx) / rx) ** 2 + ((nearestY - cy) / ry) ** 2 < 1;
  }
  const points = zone.points ?? [];
  if (points.length < 3) return true;
  const corners: [number, number][] = [[box.x, box.y], [box.x + box.width, box.y], [box.x + box.width, box.y + box.height], [box.x, box.y + box.height]];
  if (corners.some(([x, y]) => pointInPolygon(x, y, points))) return true;
  if (points.some(([x, y]) => inside(x, y, box))) return true;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    for (let j = 0; j < 4; j++) if (segmentsMeet(a, b, corners[j], corners[(j + 1) % 4])) return true;
  }
  return false;
}

function validateZone(zone: SpaceZone, document: CompositionDocument): void {
  const { x, y, width, height } = zone.box;
  if (!zone.id || !['rectangle', 'ellipse', 'freeform'].includes(zone.shape) || ![x, y, width, height].every(Number.isFinite)
    || x < 0 || y < 0 || width < 12 || height < 12 || x + width > document.width || y + height > document.height) {
    throw new Error('Space zones must stay within the paper and be at least 12 units wide and high.');
  }
  if (zone.shape === 'freeform' && (!zone.points || zone.points.length < 3 || zone.points.some(([px, py]) => !Number.isFinite(px) || !Number.isFinite(py) || !inside(px, py, zone.box)))) {
    throw new Error('A freeform space zone needs at least three points inside its bounds.');
  }
}

function isHeld(element: CompositionElement, locks: CompositionLocks): boolean {
  return locks.GRID || (element.kind === 'image' && locks.IMAGE)
    || (element.kind === 'texture' && locks.TEXTURE)
    || (element.kind === 'text' && (element.id === 'title' || element.id === 'metadata') && locks.TYPE);
}

function reposition(element: CompositionElement, box: Box, document: CompositionDocument): CompositionElement {
  if (element.kind === 'text') {
    if (element.glyphs?.length) {
      const xScale = box.width / element.box.width, yScale = box.height / element.box.height;
      return { ...element, box,
        fontSize: element.fontSize * Math.min(xScale, yScale),
        glyphs: element.glyphs.map((mark) => ({ ...mark, x: box.x + (mark.x - element.box.x) * xScale, y: box.y + (mark.y - element.box.y) * yScale })),
        erasures: element.erasures?.map((cut) => ({ x: box.x + (cut.x - element.box.x) * xScale, y: box.y + (cut.y - element.box.y) * yScale, width: cut.width * xScale, height: cut.height * yScale })),
      };
    }
    const content = element.id === 'title' ? document.source.title.trim() || 'Untitled study'
      : element.id === 'metadata' ? document.source.metadata.trim() : element.lines.join(' ');
    return fitText(element.id, content, box, element.fontSize, element.font);
  }
  if ('box' in element) return { ...element, box };
  return element;
}

/** Reflow around actual geometry. Zones never become paper-coloured cover shapes. */
export function applySpaceZones(document: CompositionDocument, zones: SpaceZone[], locks: CompositionLocks): CompositionDocument {
  zones.forEach((zone) => validateZone(zone, document));
  const margin = document.grid.margin;
  const footerY = document.elements.find((element) => element.id === 'footer-rule' && element.kind === 'rule');
  const contentBottom = footerY?.kind === 'rule' ? footerY.y1 - 18 : document.height - margin;
  const contentTop = margin + 32;
  const intersectsAny = (box: Box) => zones.some((zone) => intersectsZone(box, zone));
  const main = (element: CompositionElement) => element.kind === 'image' || element.id === 'title';
  const occupied: Box[] = document.elements.filter((element) => 'box' in element && main(element) && !intersectsAny(element.box)).map((element) => (element as ImageElement | TextElement).box);
  const reserved: Box[] = document.elements.filter((element) => element.kind === 'text' && element.id !== 'title' && !intersectsAny(element.box)).map((element) => (element as TextElement).box);
  const result = new Map<string, CompositionElement>();
  const ordered = [...document.elements].sort((a, b) => Number(main(b)) - Number(main(a)));

  for (const element of ordered) {
    if (element.kind === 'rule') {
      const ruleBox = { x: Math.min(element.x1, element.x2), y: Math.min(element.y1, element.y2) - 1, width: Math.max(1, Math.abs(element.x2 - element.x1)), height: Math.max(2, Math.abs(element.y2 - element.y1)) };
      if (intersectsAny(ruleBox)) {
        if (isHeld(element, locks)) throw new Error('A locked rule crosses the space zone. Release GRID or move the zone.');
        continue;
      }
      result.set(element.id, element);
      continue;
    }
    if (element.kind === 'texture' && !locks.TEXTURE && !locks.GRID) {
      const originalImage = document.elements.find((item) => item.kind === 'image' && item.id === 'source-image');
      const movedImage = result.get('source-image');
      if (originalImage?.kind === 'image' && movedImage?.kind === 'image' && JSON.stringify(originalImage.box) !== JSON.stringify(movedImage.box)) {
        const attached = { x: movedImage.box.x + movedImage.box.width - element.box.width, y: movedImage.box.y, width: element.box.width, height: movedImage.box.height };
        const opposite = { ...attached, x: movedImage.box.x };
        const chosen = !intersectsAny(attached) ? attached : !intersectsAny(opposite) ? opposite : null;
        if (chosen) result.set(element.id, { ...element, box: chosen });
        continue;
      }
    }
    if (!intersectsAny(element.box)) { result.set(element.id, element); continue; }
    if (isHeld(element, locks)) throw new Error(`The locked ${element.id} overlaps a space zone. Release its lock or move the zone.`);

    let best: { box: Box; score: number } | null = null;
    const scales = main(element) ? [1, .85, .7, .55, .4, .3] : [1, .8, .6];
    for (const scale of scales) {
      const width = element.box.width * scale, height = element.box.height * scale;
      const xPositions = new Set<number>([margin, document.width - margin - width]);
      for (let column = 0; column < document.grid.columns; column++) {
        const x = margin + column * (document.grid.columnWidth + document.grid.gutter);
        if (x + width <= document.width - margin) xPositions.add(x);
      }
      for (const x of xPositions) {
        for (let y = contentTop; y + height <= contentBottom; y += 24) {
          const box = { x, y, width, height };
          if (intersectsAny(box) || (main(element) && [...occupied, ...reserved].some((other) => overlaps(box, other)))) continue;
          const displacement = Math.hypot(x - element.box.x, y - element.box.y);
          const score = displacement + (1 - scale) * 250 + (document.system === 'SILENCE' ? y * .035 : 0);
          if (!best || score < best.score) best = { box, score };
        }
      }
    }
    const chosen = best as { box: Box; score: number } | null;
    if (!chosen) throw new Error(`No clear position for ${element.id}. Reduce the zone or release a lock.`);
    const placed = reposition(element, chosen.box, document);
    result.set(element.id, placed);
    if (main(placed) && 'box' in placed) occupied.push(placed.box);
  }

  return { ...document, spaceZones: zones.map((zone) => ({ ...zone, box: { ...zone.box }, ...(zone.points ? { points: zone.points.map((point) => [...point] as [number, number]) } : {}) })), elements: document.elements.flatMap((element) => result.has(element.id) ? [result.get(element.id)!] : []) };
}
