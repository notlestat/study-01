import { build } from 'rolldown';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, access, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const mode = process.argv[2];
if (!['baseline', 'current', 'space'].includes(mode)) {
  throw new Error('Use: node scripts/render-benchmark.mjs baseline|current|space');
}

const root = process.cwd();
const output = resolve(root, 'public/benchmarks', mode);
if (mode === 'baseline') {
  try {
    await access(resolve(output, 'manifest.json'));
    throw new Error('The frozen baseline already exists. Remove it deliberately before recapturing.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const bundle = resolve(root, 'scripts', `.benchmark-bundle-${process.pid}.mjs`);
await build({
  input: resolve(root, 'scripts/benchmark-entry.tsx'),
  external: ['react', 'react-dom/server', 'react/jsx-runtime'],
  output: { file: bundle, format: 'esm' },
});
try {
  const { generateComposition, applySpaceZones, renderDocument } = await import(pathToFileURL(bundle).href);
  const sampleBytes = await readFile(resolve(root, 'public/sample-study.svg'));
  const embeddedImage = `data:image/svg+xml;base64,${sampleBytes.toString('base64')}`;
  const source = {
    title: 'A study\nin form.',
    metadata: 'Visual exploration\n2026 / No. 001',
    image: { id: 'study-built-in-forms', name: 'Forms / built-in sample', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' },
  };
  const systems = ['ORDER', 'SILENCE', 'TENSION'];
  const seeds = [1, 4, 7, 11, 18, 26];
  const zone = { id: 'benchmark-center', shape: 'rectangle', box: { x: 300, y: 350, width: 300, height: 300 }, locked: false };
  const entries = [];
  await mkdir(output, { recursive: true });
  for (const system of systems) {
    for (const seed of seeds) {
      const generated = generateComposition({ system, input: source, seed });
      const document = mode === 'space'
        ? applySpaceZones(generated, [zone], { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false })
        : generated;
      const markup = renderDocument(document);
      const svg = markup.slice(markup.indexOf('<svg'))
        .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
        .replaceAll('/sample-study.svg', embeddedImage);
      const filename = `${system.toLowerCase()}-${String(seed).padStart(6, '0')}.svg`;
      await writeFile(resolve(output, filename), svg);
      const title = document.elements.find((element) => element.id === 'title');
      const image = document.elements.find((element) => element.kind === 'image');
      const relation = title.box.y + title.box.height <= image.box.y ? 'title-above'
        : image.box.y + image.box.height <= title.box.y ? 'image-above'
        : title.box.x + title.box.width <= image.box.x ? 'title-left'
        : 'image-left';
      const imageSide = image.box.x + image.box.width / 2 < document.width * .45 ? 'left'
        : image.box.x + image.box.width / 2 > document.width * .55 ? 'right' : 'center';
      entries.push({ system, seed, filename, hierarchy: document.hierarchy,
        signature: `${system}:${relation}:${imageSide}`,
        titleSize: title.fontSize,
        imageArea: Number((image.box.width * image.box.height / (document.width * document.height)).toFixed(3)),
        sha256: createHash('sha256').update(svg).digest('hex'),
        document,
      });
    }
  }
  const signatures = [...new Set(entries.map((entry) => entry.signature))];
  const manifest = { mode, source: 'Built-in geometric sample; one source held constant to isolate composition rules', systems, seeds,
    ...(mode === 'space' ? { exclusionZone: zone } : {}),
    count: entries.length, structuralSignatures: signatures, signatureCount: signatures.length, entries };
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const cards = entries.map((entry) => `<figure><img src="${entry.filename}" alt="${entry.system} seed ${entry.seed}"><figcaption><span>${entry.system} / ${String(entry.seed).padStart(6, '0')}</span><span>${entry.hierarchy}</span></figcaption></figure>`).join('\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>STUDY/01 — ${mode} contact sheet</title><style>
    *{box-sizing:border-box}body{margin:0;background:#f3f1eb;color:#22221f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}header{display:flex;align-items:end;justify-content:space-between;gap:20px;padding:25px 30px;border-bottom:1px solid #d6d3cb}h1{margin:0;font-size:20px;letter-spacing:-.05em;font-weight:600}p{margin:0;color:#686860;font-size:11px}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:22px;padding:30px}figure{min-width:0;margin:0}img{display:block;width:100%;aspect-ratio:3/4;background:#fcfbf7;outline:1px solid #d6d3cb}figcaption{display:flex;justify-content:space-between;gap:6px;padding-top:8px;font:9px 'SFMono-Regular',Consolas,monospace}figcaption span:last-child{color:#686860;text-align:right}@media(max-width:1100px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:600px){.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:16px}header{padding:18px 16px}header p{max-width:130px;text-align:right}}
  </style></head><body><header><h1>STUDY/01 — ${mode.toUpperCase()}</h1><p>18 studies / 3 systems / fixed source</p></header><main class="grid">${cards}</main></body></html>`;
  await writeFile(resolve(output, 'index.html'), html);
  process.stdout.write(`${mode}: ${entries.length} compositions, ${signatures.length} structural signatures\n${output}\n`);
} finally {
  await unlink(bundle);
}
