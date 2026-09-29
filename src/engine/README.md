# ORDER engine

`generateOrder({ input, seed })` returns a plain `CompositionDocument`. The engine imports only domain types and its own helpers. It does not import React, create SVG elements, read the browser, or mutate its inputs.

## Starting rules

- A 900×1200 paper with an equal outer margin of 60, 72, or 84 units.
- Four or six columns, with a 24-unit gutter.
- Shared left alignment for the edition, title, rule, and metadata.
- Title-first or image-first hierarchy, with a consistent gap between the two.
- Image edges align to column boundaries. Portrait sources use narrower spans.
- Moderate aspect-ratio differences use a centered crop; extreme differences preserve the full image.
- Headline size starts at 88, 100, or 112 units, then reduces if the wrapped text needs more space.
- Metadata remains below the rule in a fixed bottom region.

These are provisional design rules to judge against real images. Seeds vary choices inside the rules. The engine calculates geometry rather than selecting complete preset posters.

`random.ts` owns the local pseudorandom sequence. `text.ts` owns wrapping and conservative width estimates. Font measurement is approximate; exact font shaping is not part of this phase.

The renderer reads this description and creates SVG. Grid guides are a UI overlay and do not alter the document. An eventual export renderer can use the same document, but local blob URLs will need asset packaging for portable output.

SILENCE, TENSION, mutation, locks, texture, persistence, and export are not implemented here. Phase 02 generation always creates a fresh ORDER document.
