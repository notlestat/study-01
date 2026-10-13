import { build } from 'rolldown';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const output = resolve(root, 'public/benchmarks/transform');
const bundle = resolve(root, 'scripts', `.transform-bundle-${process.pid}.mjs`);
await build({ input: resolve(root, 'scripts/benchmark-entry.tsx'), external: ['react', 'react-dom/server', 'react/jsx-runtime'], output: { file: bundle, format: 'esm' } });
try {
  const { generateComposition, applyTypography, transformElement, elementPose, addMaterial, updateMaterial, orderElement, renderDocument } = await import(pathToFileURL(bundle).href);
  const sampleBytes = await readFile(resolve(root, 'public/sample-study.svg'));
  const embeddedImage = `data:image/svg+xml;base64,${sampleBytes.toString('base64')}`;
  const input = { title: 'A study\nin form.', metadata: 'Visual exploration\n2026 / No. 001', image: { id: 'study-built-in-forms', name: 'Forms / built-in sample', src: '/sample-study.svg', width: 1200, height: 900, origin: 'sample' } };
  const unlocked = { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false };
  const systems = ['ORDER', 'SILENCE', 'TENSION'];
  const kinds = ['SOURCE', 'IMAGE_OFFSET', 'TYPE_ROTATION', 'IMAGE_STRETCH', 'GLYPH_PLACEMENT', 'LOCAL_MATERIAL'];
  const materialSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#e1d9c9"/>'+Array.from({length:240},(_,i)=>`<rect x="${(i*137)%900}" y="${(i*211)%1200}" width="${3+i%43}" height="${1+i%3}" fill="#504f45" opacity="${.15+i%5*.1}"/>`).join('')+'</svg>';
  const material = { id: 'original-review-material', name: 'Original procedural scan study', src: 'data:image/svg+xml;base64,'+Buffer.from(materialSvg).toString('base64'), width:900,height:1200,origin:'sample' };
  const entries = [];
  await mkdir(output, { recursive: true });
  for (const system of systems) {
    const parent = generateComposition({ system, input, seed: 11 });
    for (const kind of kinds) {
      let document = parent;
      const imagePose = elementPose(parent.elements.find(item=>item.id==='source-image'));
      const typePose = elementPose(parent.elements.find(item=>item.id==='title'));
      if(kind==='IMAGE_OFFSET') document=transformElement(parent,unlocked,'source-image',{...imagePose,x:85,y:310,width:540,height:405,rotation:-12});
      if(kind==='TYPE_ROTATION') document=transformElement(parent,unlocked,'title',{...typePose,x:85,y:550,width:600,height:220,rotation:24});
      if(kind==='IMAGE_STRETCH') document=transformElement(parent,unlocked,'source-image',{...imagePose,x:365,y:130,width:470,height:900,rotation:0});
      if(kind==='GLYPH_PLACEMENT') {
        document=applyTypography(parent,unlocked,{kind:'GRID_SEPARATION',intensity:.7,readability:.35,seed:18});
        document=transformElement(document,unlocked,'title',{...elementPose(document.elements.find(item=>item.id==='title')),x:120,y:480,width:620,height:460,rotation:-17});
      }
      if(kind==='LOCAL_MATERIAL') document=addMaterial(parent,unlocked,material);

      if(kind==='TYPE_ROTATION'||kind==='GLYPH_PLACEMENT') document=orderElement(document,unlocked,'title','FRONT');
      const markup = renderDocument(document);
      const svg = markup.slice(markup.indexOf('<svg')).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replaceAll('/sample-study.svg', embeddedImage);
      const filename = `${system.toLowerCase()}-${kind.toLowerCase()}.svg`;
      await writeFile(resolve(output, filename), svg);
      entries.push({ system, kind, filename, sha256: createHash('sha256').update(svg).digest('hex') });
    }
  }
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ count: entries.length, parentSeed: 11, treatmentSeed: 18, intensity: .7, readability: .35, entries }, null, 2));
  const sections = systems.map((system) => `<section><h2>${system}</h2><div class="grid">${entries.filter((entry) => entry.system === system).map((entry) => `<figure><img src="${entry.filename}" alt="${system} ${entry.kind}"><figcaption>${entry.kind.replaceAll('_', ' ')}</figcaption></figure>`).join('')}</div></section>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>STUDY/01 — transform review</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f1eb;color:#22221f;font-family:Helvetica,Arial,sans-serif}header{padding:24px 30px;border-bottom:1px solid #d6d3cb}h1{margin:0;font-size:20px;letter-spacing:-.05em}header p{margin:8px 0 0;color:#777;font-size:11px}section{padding:24px 30px}h2{font-size:13px;margin:0 0 15px}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}figure{min-width:0;margin:0}img{display:block;width:100%;aspect-ratio:3/4;outline:1px solid #d6d3cb;background:#fcfbf7}figcaption{font:8px monospace;margin-top:8px}@media(max-width:1100px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:600px){section{padding:16px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}</style></head><body><header><h1>STUDY/01 — CANVAS REFINEMENT REVIEW</h1><p>18 studies / 3 systems × source and five manual refinements / compare with <a href="../baseline/index.html">frozen baseline</a></p></header>${sections}</body></html>`;
  await writeFile(resolve(output, 'index.html'), html);
  process.stdout.write(`CANVAS REFINEMENT review: ${entries.length} artworks, ${new Set(entries.map((entry) => entry.sha256)).size} distinct SVGs\n`);
} finally { await unlink(bundle); }
