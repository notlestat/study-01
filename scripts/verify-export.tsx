import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { CompositionRenderer } from '../src/components/canvas/CompositionRenderer';
import { generateComposition } from '../src/engine/generate';
import { applyOperation } from '../src/engine/operations';
import { applyTypography } from '../src/engine/typography';
import { generateFamily } from '../src/engine/family';
import { withColour } from '../src/engine/colour';
import { exportDimensions, portableSvg, rasterizeSvg } from '../src/lib/exportComposition';
const root = createRoot(document.getElementById('test-root')!);
const locks = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };
const parent = generateComposition({ system: 'TENSION', seed: 11, input: { title: 'A study\nin form.', metadata: 'Export verification / 2026', image: { id: 'sample', name: 'Forms', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' } } });
let lastUrl: string | undefined;
document.getElementById('run')!.addEventListener('click', async () => {
  const button = document.getElementById('run') as HTMLButtonElement;
  button.disabled = true;
  const status = document.getElementById('status')!;
  const rows = document.getElementById('results')!;
  rows.replaceChildren();
  try {
    const cases = [
      { name: 'Native opaque paper', artwork: parent, scale: 1, transparent: false },
      { name: 'Monochrome from coloured source', artwork: withColour(generateComposition({ system: 'ORDER', seed: 11, input: { ...parent.source, image: { ...parent.source.image!, src: '/benchmarks/colour/colour-source.svg' } } }), { mode: 'MONOCHROME', intensity: 1, registration: 0, seed: 1 }), scale: 1, transparent: false },
      { name: 'Transparent high resolution', artwork: parent, scale: 2, transparent: true },
      { name: 'Fracture + ink misregistration', artwork: withColour(applyOperation(parent, locks, { kind: 'FRACTURE', intensity: .8, seed: 18 }), { mode: 'INK_SYSTEM', intensity: 1, registration: .8, seed: 18 }), scale: 1, transparent: false },
      { name: 'Vector type erosion', artwork: applyTypography(parent, locks, { kind: 'PROCEDURAL_EROSION', intensity: .8, readability: .4, seed: 18 }), scale: 1, transparent: false },
      { name: 'Landscape family', artwork: generateFamily(parent).find(item => item.familyAsset?.format === 'BANNER')!, scale: 1, transparent: false },
    ];
    for (const item of cases) {
      status.textContent = `Checking ${item.name}…`;
      flushSync(() => root.render(<CompositionRenderer document={item.artwork} showGrid showSafe selectedElement="title" />));
      const svg = document.querySelector<SVGSVGElement>('#test-root svg')!;
      const vector = await portableSvg(svg, new Map(), item.transparent);
      const xml = new DOMParser().parseFromString(await vector.text(), 'image/svg+xml');
      if (xml.querySelector('parsererror') || xml.querySelector('[data-preview-only]')) throw new Error(`${item.name}: invalid SVG or leaked guides`);
      const metadata = JSON.parse(xml.querySelector('metadata')!.textContent!);
      if (metadata.seed !== item.artwork.seed || [...xml.querySelectorAll('image')].some(image => !image.getAttribute('href')?.startsWith('data:'))) throw new Error(`${item.name}: missing provenance or imagery`);
      if (item.name.startsWith('Monochrome') && xml.querySelector('feColorMatrix')?.getAttribute('values') !== '0') throw new Error('Monochrome filter is missing.');
      const dimensions = exportDimensions(item.artwork.width, item.artwork.height, item.scale);
      const png = await rasterizeSvg(vector, dimensions);
      const url = URL.createObjectURL(png);
      const image = new Image(); image.src = url; await image.decode();
      if (image.naturalWidth !== dimensions[0] || image.naturalHeight !== dimensions[1]) throw new Error(`${item.name}: wrong PNG size`);
      const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1;
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      const alpha = context.getImageData(0, 0, 1, 1).data[3];
      if (alpha !== (item.transparent ? 0 : 255)) throw new Error(`${item.name}: incorrect transparency`);
      const row = document.createElement('tr');
      const values = [item.name, `${dimensions[0]}×${dimensions[1]}`, `${xml.querySelectorAll('image').length} embedded images / ${xml.querySelectorAll('filter').length} filters / ${xml.querySelectorAll('mask').length} masks / metadata / no guides`, String(alpha)];
      for (const value of values) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
      rows.append(row);
      if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = url;
      (document.getElementById('result-image') as HTMLImageElement).src = url;
    }
    status.textContent = 'PASS / 6 production SVG and PNG checks';
  } catch (cause) { status.textContent = `FAIL / ${cause instanceof Error ? cause.message : String(cause)}`; }
  finally { button.disabled = false; }
});
