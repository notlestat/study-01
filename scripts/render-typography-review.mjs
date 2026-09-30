import { build } from 'rolldown';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const output = resolve(root, 'public/benchmarks/typography');
const bundle = resolve(root, 'scripts', `.typography-bundle-${process.pid}.mjs`);
await build({ input: resolve(root, 'scripts/benchmark-entry.tsx'), external: ['react', 'react-dom/server', 'react/jsx-runtime'], output: { file: bundle, format: 'esm' } });
try {
  const { generateComposition, applyTypography, renderDocument } = await import(pathToFileURL(bundle).href);
  const sampleBytes = await readFile(resolve(root, 'public/sample-study.svg'));
  const embeddedImage = `data:image/svg+xml;base64,${sampleBytes.toString('base64')}`;
  const input = { title: 'A study\nin form.', metadata: 'Visual exploration\n2026 / No. 001', image: { id: 'study-built-in-forms', name: 'Forms / built-in sample', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' } };
  const unlocked = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };
  const systems = ['ORDER', 'SILENCE', 'TENSION'];
  const kinds = ['SOURCE', 'CHARACTER_DISPLACEMENT', 'REPETITION', 'VERTICAL_COMPRESSION', 'HORIZONTAL_STRETCH', 'LINE_FRAGMENTATION', 'TRACKING_DISTORTION', 'BASELINE_SHIFT', 'GRID_SEPARATION', 'TYPOGRAPHIC_MASK', 'PROCEDURAL_EROSION'];
  const entries = [];
  await mkdir(output, { recursive: true });
  for (const system of systems) {
    const parent = generateComposition({ system, input, seed: 11 });
    for (const kind of kinds) {
      const document = kind === 'SOURCE' ? parent : applyTypography(parent, unlocked, { kind, intensity: .7, readability: .35, seed: 18 });
      const markup = renderDocument(document);
      const svg = markup.slice(markup.indexOf('<svg')).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replaceAll('/sample-study.svg', embeddedImage);
      const filename = `${system.toLowerCase()}-${kind.toLowerCase()}.svg`;
      await writeFile(resolve(output, filename), svg);
      entries.push({ system, kind, filename, sha256: createHash('sha256').update(svg).digest('hex') });
    }
  }
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ count: entries.length, parentSeed: 11, treatmentSeed: 18, intensity: .7, readability: .35, entries }, null, 2));
  const sections = systems.map((system) => `<section><h2>${system}</h2><div class="grid">${entries.filter((entry) => entry.system === system).map((entry) => `<figure><img src="${entry.filename}" alt="${system} ${entry.kind}"><figcaption>${entry.kind.replaceAll('_', ' ')}</figcaption></figure>`).join('')}</div></section>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>STUDY/01 — typography review</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f1eb;color:#22221f;font-family:Helvetica,Arial,sans-serif}header{padding:24px 30px;border-bottom:1px solid #d6d3cb}h1{margin:0;font-size:20px;letter-spacing:-.05em}header p{margin:8px 0 0;color:#777;font-size:11px}section{padding:24px 30px}h2{font-size:13px;margin:0 0 15px}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}figure{min-width:0;margin:0}img{display:block;width:100%;aspect-ratio:3/4;outline:1px solid #d6d3cb;background:#fcfbf7}figcaption{font:8px monospace;margin-top:8px}@media(max-width:1100px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:600px){section{padding:16px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}</style></head><body><header><h1>STUDY/01 — TYPOGRAPHY REVIEW</h1><p>3 systems × source and ten typographic treatments / compare with <a href="../baseline/index.html">frozen baseline</a></p></header>${sections}</body></html>`;
  await writeFile(resolve(output, 'index.html'), html);
  process.stdout.write(`TYPOGRAPHY review: ${entries.length} artworks, ${new Set(entries.map((entry) => entry.sha256)).size} distinct SVGs\n`);
} finally { await unlink(bundle); }
