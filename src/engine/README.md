# Composition engine

`generateComposition({ system, input, seed })` dispatches to ORDER, SILENCE, or TENSION. Each generator is a deterministic, browser-independent function returning a `CompositionDocument`. The same input and seed produce the same geometry, type, crop, and texture decisions.

All systems use a 900×1200 paper. ORDER alternates image/title hierarchy on a four- or six-column grid. SILENCE holds a smaller image and title apart in a wide open field. TENSION opposes a dense image column with a narrow, large title and a strong horizontal division. The rules calculate arrangements rather than selecting complete poster presets. `random.ts` owns seeded choices; `text.ts` estimates wrapping and fitting; `shared.ts` validates and frames the image.

`mutateComposition(current, locks)` generates candidates from successive seeds and merges the locked parts from the current document. GRID holds all geometry and the grid description; TYPE holds the title and metadata; IMAGE holds the image element; TEXTURE holds the texture element. A candidate is accepted only when its title and image boxes do not collide. With all locks enabled, the current document is returned unchanged.

The engine imports only domain types and its own helpers. Image decoding, storage, SVG drawing, and export belong outside it. This boundary allows tests to run in Node and allows a future renderer or worker to reuse the composition rules.
