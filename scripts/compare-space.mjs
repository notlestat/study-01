import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const current = JSON.parse(await readFile(resolve(root, 'public/benchmarks/current/manifest.json'), 'utf8'));
const spaced = JSON.parse(await readFile(resolve(root, 'public/benchmarks/space/manifest.json'), 'utf8'));
let changed = 0, movedTitle = 0, movedImage = 0;
for (let index = 0; index < current.entries.length; index++) {
  const before = current.entries[index].document;
  const after = spaced.entries[index].document;
  const box = (document, id) => document.elements.find((element) => element.id === id)?.box;
  if (JSON.stringify(before.elements) !== JSON.stringify(after.elements)) changed++;
  if (JSON.stringify(box(before, 'title')) !== JSON.stringify(box(after, 'title'))) movedTitle++;
  if (JSON.stringify(box(before, 'source-image')) !== JSON.stringify(box(after, 'source-image'))) movedImage++;
}
const report = `# SPACE visual review

The [current 18-study sheet](../current/index.html) and [SPACE sheet](index.html) use identical sources, systems and seeds. SPACE adds one fixed 300×300 central exclusion zone (x 300, y 350). Its outline is an editing guide, not part of the exported artwork.

| Measure | Result |
| --- | ---: |
| Compositions with changed elements | ${changed} / ${spaced.count} |
| Titles repositioned or resized | ${movedTitle} / ${spaced.count} |
| Images repositioned or resized | ${movedImage} / ${spaced.count} |

The document solver moves or reduces eligible elements onto grid-aligned candidates, rejects zones that collide with locked elements, and checks rectangle, ellipse and freeform geometry. Visually inspect whether the new absence produces intentional compositions rather than merely a hole.
`;
await writeFile(resolve(root, 'public/benchmarks/space/COMPARISON.md'), report);
process.stdout.write(report);
