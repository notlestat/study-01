# Composition engine

The engine generates and transforms composition documents without React or browser APIs. [The repository overview](../../README.md) describes setup and [the reference](../../docs/reference.md#architecture) describes its boundaries.

`generateComposition({ system, input, seed })` in [generate.ts](generate.ts) dispatches to ORDER, SILENCE, or TENSION. The same input and seed reproduce a result within the engine revision. `engineRevision` identifies generation code separately from the document storage version.

Base documents use a 900×1200 coordinate space. FAMILY documents use their format dimensions. [random.ts](random.ts) owns seeded choices, [text.ts](text.ts) estimates text wrapping, and [shared.ts](shared.ts) frames the image.

`mutateComposition(current, locks)` in [mutate.ts](mutate.ts) searches candidate seeds and preserves the locked parts. GRID retains geometry, TYPE retains title and metadata, IMAGE retains the image element, and TEXTURE retains the texture element. Seed and edition annotations can change while TYPE is locked. If every part is locked, mutation returns the current document. If the bounded search finds no valid arrangement, it throws an error.

Image decoding, browser storage, SVG rendering, and exports belong outside the engine. Pure pixel transformations live in `src/processing/`. Run `npm test` from the repository root to check the engine contracts.
