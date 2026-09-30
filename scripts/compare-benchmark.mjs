import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const baseline = JSON.parse(await readFile(resolve(root, 'public/benchmarks/baseline/manifest.json'), 'utf8'));
const current = JSON.parse(await readFile(resolve(root, 'public/benchmarks/current/manifest.json'), 'utf8'));
const countBy = (entries, key) => entries.reduce((counts, entry) => {
  const value = key(entry);
  counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}, {});
const concentration = (manifest) => Object.values(countBy(manifest.entries, (entry) => entry.signature))
  .sort((a, b) => b - a).slice(0, 3).reduce((sum, count) => sum + count, 0);
const baselineSignatures = new Set(baseline.structuralSignatures);
const newSignatures = current.structuralSignatures.filter((signature) => !baselineSignatures.has(signature));
const familyCounts = countBy(current.entries, (entry) => `${entry.system} / ${entry.document.family ?? 'Legacy'}`);
const text = `# Current composition review

The two sheets use the same built-in source, systems, and six seeds per system. Compare [baseline](../baseline/index.html) with [current](index.html) at the same display size. These metrics are coarse indicators, not a substitute for looking at the artwork.

| Measure | Frozen baseline | Current |
| --- | ---: | ---: |
| Studies | ${baseline.count} | ${current.count} |
| Spatial signatures | ${baseline.signatureCount} | ${current.signatureCount} |
| Studies in three most common signatures | ${concentration(baseline)} | ${concentration(current)} |

New spatial signatures: ${newSignatures.length ? newSignatures.join(', ') : 'none'}.

Current rule families: ${Object.entries(familyCounts).map(([family, count]) => `${family} (${count})`).join(', ')}.

Manual review remains necessary for typographic quality, photographic crops, meaningful image/type relationships, export fidelity, and whether differences are expressive rather than merely metric changes.
`;
await writeFile(resolve(root, 'public/benchmarks/current/COMPARISON.md'), text);
process.stdout.write(text);
