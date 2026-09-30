import type { ArchiveItem } from '../engine/archive';
import { downloadBlob, portableSvg } from './exportComposition';
import { storedZip } from './zip';

const NS = 'http://www.w3.org/2000/svg';
const create = (tag: string) => document.createElementNS(NS, tag);

/** Contact sheets clone the exact production SVGs shown in the archive. */
export async function exportArchiveContactSheet<T extends ArchiveItem>(items: T[], svgById: Map<string, SVGSVGElement>, basename: string): Promise<number> {
  if (!items.length) throw new Error('There are no studies in this archive view.');
  const cache = new Map<string, string>();
  const pages: { name: string; bytes: Uint8Array }[] = [];
  for (let offset = 0; offset < items.length; offset += 12) {
    const pageItems = items.slice(offset, offset + 12);
    const rows = Math.ceil(pageItems.length / 3);
    const root = create('svg') as SVGSVGElement;
    root.setAttribute('viewBox', `0 0 900 ${70 + rows * 390}`);
    const metadata = create('metadata');
    metadata.textContent = JSON.stringify({ application: 'STUDY/01', kind: 'archive-contact-sheet', studies: pageItems.map((item) => ({ id: item.id, seed: item.document.seed, system: item.document.system, createdAt: item.createdAt })) });
    root.append(metadata);
    const background = create('rect');
    background.setAttribute('width', '900'); background.setAttribute('height', String(70 + rows * 390)); background.setAttribute('fill', '#f3f1eb');
    root.append(background);
    const heading = create('text');
    heading.setAttribute('x', '25'); heading.setAttribute('y', '40'); heading.setAttribute('fill', '#22221f');
    heading.setAttribute('font-family', 'Helvetica, Arial, sans-serif'); heading.setAttribute('font-size', '20');
    heading.textContent = `STUDY / 01    ARCHIVE / ${String(Math.floor(offset / 12) + 1).padStart(2, '0')}`;
    root.append(heading);
    for (const [index, item] of pageItems.entries()) {
      const artwork = svgById.get(item.id);
      if (!artwork) throw new Error('An archive thumbnail is unavailable. Try the export again.');
      const x = 25 + index % 3 * 290, y = 70 + Math.floor(index / 3) * 390;
      const copy = artwork.cloneNode(true) as SVGSVGElement;
      copy.setAttribute('x', String(x)); copy.setAttribute('y', String(y));
      copy.setAttribute('width', '270'); copy.setAttribute('height', '340');
      copy.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      root.append(copy);
      const label = create('text');
      label.setAttribute('x', String(x)); label.setAttribute('y', String(y + 360));
      label.setAttribute('fill', '#22221f'); label.setAttribute('font-family', 'monospace'); label.setAttribute('font-size', '10');
      label.textContent = `${item.document.system} / ${String(item.document.seed).padStart(6, '0')}   ${item.document.familyAsset?.format ?? 'POSTER'}`;
      root.append(label);
    }
    const blob = await portableSvg(root, cache);
    pages.push({ name: `${basename}_${String(Math.floor(offset / 12) + 1).padStart(2, '0')}.svg`, bytes: new Uint8Array(await blob.arrayBuffer()) });
  }
  if (pages.length === 1) downloadBlob(new Blob([pages[0].bytes as BlobPart], { type: 'image/svg+xml' }), pages[0].name);
  else downloadBlob(new Blob([storedZip(pages) as BlobPart], { type: 'application/zip' }), `${basename}.zip`);
  return pages.length;
}
