import { build } from 'rolldown';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const output = resolve(root, 'public/benchmarks/colour');
const bundle = resolve(root, 'scripts', `.colour-bundle-${process.pid}.mjs`);
await build({ input: resolve(root, 'scripts/benchmark-entry.tsx'), external: ['react', 'react-dom/server', 'react/jsx-runtime'], output: { file: bundle, format: 'esm' } });
try {
  const { generateComposition, withColour, renderDocument } = await import(pathToFileURL(bundle).href);
  await mkdir(output, { recursive: true });
  const original = await readFile(resolve(root, 'public/sample-study.svg'), 'utf8');
  const mappings = { '#d8d5cc': '#d8cbb9', '#c3c0b7': '#b0a394', '#a4a199': '#886f67', '#b0ada4': '#a78e88', '#eae7dd': '#e9dcc8', '#8b8981': '#707a82', '#f4f1e8': '#f7ead5', '#353630': '#6a332b', '#1e201d': '#3d2927', '#62635b': '#87665b', '#eeebe1': '#dfd7c7', '#b8b5ac': '#8b9ca2' };
  const colourSource = original.replace(/#[0-9a-f]{6}/gi, (hex) => mappings[hex] ?? hex);
  await writeFile(resolve(output, 'colour-source.svg'), colourSource);
  const embedded = `data:image/svg+xml;base64,${Buffer.from(colourSource).toString('base64')}`;
  const source = { title: 'A study\nin form.', metadata: 'Visual exploration\n2026 / No. 001', image: { id: 'colour-fixture', name: 'Colour geometry fixture', src: '/benchmarks/colour/colour-source.svg', width: 1200, height: 900, origin: 'sample', analysis: { palette: ['#3d2927', '#707a82', '#f7ead5'] } } };
  const entries = [];
  for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
    const parent = generateComposition({ system, input: source, seed: 11 });
    for (const mode of ['MONOCHROME', 'DUOTONE', 'TRITONE', 'EXTRACTED_PALETTE', 'INK_SYSTEM']) {
      const document = withColour(parent, { mode, intensity: .95, registration: .7, seed: 18 });
      const markup = renderDocument(document);
      const svg = markup.slice(markup.indexOf('<svg')).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replaceAll('/benchmarks/colour/colour-source.svg', embedded);
      const filename = `${system.toLowerCase()}-${mode.toLowerCase()}.svg`;
      await writeFile(resolve(output, filename), svg);
      entries.push({ system, mode, filename, hash: createHash('sha256').update(svg).digest('hex') });
    }
  }
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ count: entries.length, source: 'Recoloured geometric test image; palette anchors are listed in the source document', entries }, null, 2));
  const sections = ['ORDER', 'SILENCE', 'TENSION'].map((system) => `<section><h2>${system}</h2><div class="grid">${entries.filter((entry) => entry.system === system).map((entry) => `<figure><img src="${entry.filename}" alt="${system} ${entry.mode}"><figcaption>${entry.mode.replaceAll('_', ' ')}</figcaption></figure>`).join('')}</div></section>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>STUDY/01 — colour review</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f1eb;color:#22221f;font-family:Helvetica,Arial,sans-serif}header{padding:24px 30px;border-bottom:1px solid #d6d3cb}h1{margin:0;font-size:20px;letter-spacing:-.05em}header p{margin:8px 0 0;color:#777;font-size:11px}section{padding:25px 30px;border-bottom:1px solid #d6d3cb}h2{font-size:13px;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}figure{margin:0;min-width:0}img{width:100%;display:block;background:#fcfbf7;outline:1px solid #d6d3cb}figcaption{font:9px monospace;color:#555;margin-top:8px}@media(max-width:800px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}section{padding:16px}}</style></head><body><header><h1>STUDY/01 — COLOUR REVIEW</h1><p>Three systems × five image-based ink rules / source is a recoloured geometric fixture / <a href="../baseline/index.html">frozen baseline</a></p></header>${sections}</body></html>`;
  await writeFile(resolve(output, 'index.html'), html);
  process.stdout.write(`COLOUR review: ${entries.length} artworks, ${new Set(entries.map((entry) => entry.hash)).size} distinct SVGs\n`);
} finally { await unlink(bundle); }
