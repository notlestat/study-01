import type { FamilyFormat } from '../domain/document';
import { downloadBlob, portableSvg } from './exportComposition';
import { storedZip } from './zip';

export async function exportFamilyArchive(svgByFormat: Map<FamilyFormat, SVGSVGElement>, name: string): Promise<void> {
  const files: { name: string; bytes: Uint8Array }[] = [];
  for (const [format, svg] of svgByFormat) {
    const vector = await portableSvg(svg);
    files.push({ name: `${name}_${format.toLowerCase()}.svg`, bytes: new Uint8Array(await vector.arrayBuffer()) });
  }
  if (files.length !== 7) throw new Error('Generate all seven family formats before batch export.');
  const archive = storedZip(files);
  downloadBlob(new Blob([archive as BlobPart], { type: 'application/zip' }), `${name}_family.zip`);
}
