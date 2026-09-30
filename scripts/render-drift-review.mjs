import { build } from 'rolldown';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const output = resolve(root, 'public/benchmarks/drift');
const bundle = resolve(root, 'scripts', `.drift-bundle-${process.pid}.mjs`);
await build({ input: resolve(root, 'scripts/benchmark-entry.tsx'), external: ['react', 'react-dom/server', 'react/jsx-runtime'], output: { file: bundle, format: 'esm' } });
try {
  const { generateComposition, driftFrame, renderDocument } = await import(pathToFileURL(bundle).href);
  const sample = `data:image/svg+xml;base64,${(await readFile(resolve(root, 'public/sample-study.svg'))).toString('base64')}`;
  const source = { title: 'A study\nin form.', metadata: 'Visual exploration\n2026 / No. 001', image: { id: 'study-built-in-forms', name: 'Forms / built-in sample', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' } };
  const entries = [];
  await mkdir(output, { recursive: true });
  for (const system of ['ORDER', 'SILENCE', 'TENSION']) {
    const parent = generateComposition({ system, input: source, seed: 11 });
    for (const mode of ['SLIP', 'DECAY', 'REPEAT']) {
      for (const [index, seconds] of [0, 2, 4].entries()) {
        const document = driftFrame(parent, { mode, duration: 4, speed: 1, intensity: .8, direction: 'RIGHT', loop: false, seed: 18 }, seconds);
        const markup = renderDocument(document);
        const svg = markup.slice(markup.indexOf('<svg')).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replaceAll('/sample-study.svg', sample);
        const filename = `${system.toLowerCase()}-${mode.toLowerCase()}-${index}.svg`;
        await writeFile(resolve(output, filename), svg);
        entries.push({ system, mode, seconds, filename, hash: createHash('sha256').update(svg).digest('hex') });
      }
    }
  }
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ count: entries.length, entries }, null, 2));
  const sections = ['ORDER', 'SILENCE', 'TENSION'].map((system) => `<section><h2>${system}</h2>${['SLIP', 'DECAY', 'REPEAT'].map((mode) => `<div class="sequence"><span>${mode}</span>${entries.filter((entry) => entry.system === system && entry.mode === mode).map((entry) => `<figure><img src="${entry.filename}" alt="${system} ${mode} at ${entry.seconds} seconds"><figcaption>${entry.seconds.toFixed(1)} S</figcaption></figure>`).join('')}</div>`).join('')}</section>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>STUDY/01 — DRIFT review</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f1eb;color:#22221f;font-family:Helvetica,Arial,sans-serif}header{padding:24px 30px;border-bottom:1px solid #d6d3cb}h1{margin:0;font-size:20px;letter-spacing:-.05em}header p{margin:8px 0 0;color:#777;font-size:11px}section{padding:25px 30px;border-bottom:1px solid #d6d3cb}h2{font-size:13px;margin:0 0 20px}.sequence{display:grid;grid-template-columns:95px repeat(3,minmax(0,1fr));gap:14px;align-items:start;max-width:1000px;margin-bottom:25px}.sequence>span{font:10px monospace;padding-top:4px}figure{margin:0;min-width:0}img{width:100%;display:block;background:#fcfbf7;outline:1px solid #d6d3cb}figcaption{font:8px monospace;color:#777;margin-top:6px}@media(max-width:600px){section{padding:16px}.sequence{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.sequence>span{grid-column:1/-1}}</style></head><body><header><h1>STUDY/01 — DRIFT REVIEW</h1><p>Three systems × three temporal structures × three instants / <a href="../baseline/index.html">frozen baseline</a></p></header>${sections}</body></html>`;
  await writeFile(resolve(output, 'index.html'), html);
  process.stdout.write(`DRIFT review: ${entries.length} frames, ${new Set(entries.map((entry) => entry.hash)).size} distinct SVGs\n`);
} finally { await unlink(bundle); }
