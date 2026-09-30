import { build } from 'rolldown';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const output = resolve(root, 'public/benchmarks/crossbreed');
const bundle = resolve(root, 'scripts', `.crossbreed-bundle-${process.pid}.mjs`);
await build({ input: resolve(root, 'scripts/benchmark-entry.tsx'), external: ['react', 'react-dom/server', 'react/jsx-runtime'], output: { file: bundle, format: 'esm' } });
try {
  const { generateComposition, crossbreedCompositions, renderDocument } = await import(pathToFileURL(bundle).href);
  const sampleBytes = await readFile(resolve(root, 'public/sample-study.svg'));
  const embeddedImage = `data:image/svg+xml;base64,${sampleBytes.toString('base64')}`;
  const source = { title: 'A study\nin form.', metadata: 'Visual exploration\n2026 / No. 001', image: { id: 'study-built-in-forms', name: 'Forms / built-in sample', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' } };
  const systems = ['ORDER', 'SILENCE', 'TENSION'];
  const weights = [.35, .75];
  const entries = [];
  await mkdir(output, { recursive: true });
  for (const baseSystem of systems) for (const donorSystem of systems) for (const weight of weights) {
    const base = generateComposition({ system: baseSystem, input: source, seed: 11 });
    const donor = generateComposition({ system: donorSystem, input: source, seed: 18 });
    const document = crossbreedCompositions(base, donor, weight);
    const markup = renderDocument(document);
    const svg = markup.slice(markup.indexOf('<svg')).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replaceAll('/sample-study.svg', embeddedImage);
    const filename = `${baseSystem.toLowerCase()}-${donorSystem.toLowerCase()}-${Math.round(weight * 100)}.svg`;
    await writeFile(resolve(output, filename), svg);
    const title = document.elements.find((element) => element.id === 'title');
    const image = document.elements.find((element) => element.id === 'source-image');
    const relation = title.box.y + title.box.height <= image.box.y ? 'title-above'
      : image.box.y + image.box.height <= title.box.y ? 'image-above'
      : title.box.x + title.box.width <= image.box.x ? 'title-left'
      : image.box.x + image.box.width <= title.box.x ? 'image-left' : 'overlap';
    const signature = `${baseSystem}:${relation}:${title.box.width > document.width * .55 ? 'wide-type' : 'narrow-type'}`;
    entries.push({ baseSystem, donorSystem, weight, filename, signature, titleSize: title.fontSize, imageArea: Number((image.box.width * image.box.height / (document.width * document.height)).toFixed(3)), sha256: createHash('sha256').update(svg).digest('hex') });
  }
  const signatures = [...new Set(entries.map((entry) => entry.signature))];
  const manifest = { count: entries.length, source: 'Built-in sample / same source as frozen baseline', baseSeed: 11, donorSeed: 18, weights, signatureCount: signatures.length, structuralSignatures: signatures, entries };
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const cards = entries.map((entry) => `<figure><img src="${entry.filename}" alt="${entry.baseSystem} image and grid crossed with ${entry.donorSystem} type at ${Math.round(entry.weight * 100)} percent"><figcaption>${entry.baseSystem} × ${entry.donorSystem} <span>${Math.round(entry.weight * 100)}% B</span></figcaption></figure>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>STUDY/01 — crossbreed review</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f1eb;color:#22221f;font-family:Helvetica,Arial,sans-serif}header{padding:24px 30px;border-bottom:1px solid #d6d3cb}h1{margin:0;font-size:20px;letter-spacing:-.05em}header p{margin:8px 0 0;color:#777;font-size:11px}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px;padding:30px}figure{min-width:0;margin:0}img{display:block;width:100%;aspect-ratio:3/4;outline:1px solid #d6d3cb;background:#fcfbf7}figcaption{display:flex;justify-content:space-between;gap:4px;font:9px monospace;margin-top:8px}@media(max-width:1100px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:600px){.grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:16px}}</style></head><body><header><h1>STUDY/01 — CROSSBREED REVIEW</h1><p>18 hybrid studies / fixed source / compared with <a href="../baseline/index.html">frozen baseline</a></p></header><main class="grid">${cards}</main></body></html>`;
  await writeFile(resolve(output, 'index.html'), html);
  const baseline = JSON.parse(await readFile(resolve(root, 'public/benchmarks/baseline/manifest.json'), 'utf8'));
  const comparison = `# Crossbreed artwork review\n\n[18 fixed-source hybrids](index.html) use the same input as the [frozen 18-study baseline](../baseline/index.html). The two parent systems and their contributions are labelled in the contact sheet.\n\n| Signal | Frozen baseline | Crossbreed review |\n| --- | ---: | ---: |\n| Artworks | ${baseline.count} | ${entries.length} |\n| Structural signatures within this review method | ${baseline.signatureCount} | ${signatures.length} |\n| Unique SVG outputs | ${new Set(baseline.entries.map((entry) => entry.sha256)).size} | ${new Set(entries.map((entry) => entry.sha256)).size} |\n\nThe signature methods differ, so the counts are directional. Visually inspect the 18 hybrids beside the baseline: image frame remains from parent A, type follows parent B’s image-relative relationship, and a stronger donor influence fractures the inherited image according to B’s proportions.\n`;
  await writeFile(resolve(output, 'COMPARISON.md'), comparison);
  process.stdout.write(`crossbreed: ${entries.length} artworks, ${signatures.length} signatures, ${new Set(entries.map((entry) => entry.sha256)).size} distinct SVGs\n`);
} finally { await unlink(bundle); }
