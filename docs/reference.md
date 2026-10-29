# STUDY/01 reference

See [the repository overview](../README.md) for setup and [Make and export a study](make-a-study.md) for the workflow.

## Workspaces

Five workspaces share one document:

| Workspace | Instruments |
| --- | --- |
| COMPOSE | Composition, PROOF contact sheets |
| DIRECT | Creative operations, Image × Type, Type Material, SPACE |
| DEVELOP | PROCESS / PASS, GENETICS, CROSSBREED, FAMILY, DRIFT, COLOUR |
| ARCHIVE | Saved studies, filters, comparison, branching, contact sheets |
| OUTPUT | Still export, resolution, transparency |

## Keyboard and locks

 ⌘/Ctrl K opens command search. G generates, M mutates, F toggles focus, Escape exits focus, +/− changes zoom, and 0 fits the canvas. ⌘/Ctrl S saves a variation; ⌘/Ctrl Z and ⌘/Ctrl Shift Z undo/redo. Text fields keep their normal editing shortcuts. Compose has native fullscreen, safe-area/grid overlays, before/after comparison, and element inspection.

Saved variations live in this browser's IndexedDB. They are not part of the GitHub repository and will not appear on another device. Clearing this site's browser data removes them; export a composition you want to keep outside the browser.

**Generate** and **Next seed** create a fresh document from the source, system, and seed. Locks constrain mutation and experimental operations. Generate deliberately starts a fresh composition:

| Lock | Preserved during mutation |
| --- | --- |
| GRID | Element positions, sizes, and rule endpoints |
| TYPE | Title and metadata text, typography, and boxes |
| IMAGE | Image frame, fit, and crop position |
| TEXTURE | Pattern, pitch, opacity, and placement |

The seed and edition annotations still update when TYPE is locked. Some combinations require the engine to skip seeds until the fixed parts leave a clear arrangement. If all parts are locked, mutation, proof, and direct transformation are unavailable.

## Architecture

```text
src/domain/       Shared input, document, and element types
src/engine/       Pure, deterministic systems, mutation, proof, operations, genetics, and image analysis
src/processing/   Pure pixel transformations and the PASS Web Worker
src/lib/          Image decoding, archive/recovery storage, portable exports, ZIP
src/app/          React session hook and panel wiring
src/components/   Controls, canvas renderer, shell, and variations rail
src/styles/       Design tokens and responsive CSS
```

The document stores concrete geometry. Its `version` describes the storage schema; `engineRevision` separately records the generation code revision. Seeds reproduce artwork within that revision. Older saved artwork is rendered from its stored geometry, without substituting newer generation rules.

The engine returns a `CompositionDocument` in a 900×1200 coordinate space for the three base systems; FAMILY documents use their own format dimensions. SVG uses its `viewBox` to scale the same document for the large canvas, saved thumbnails, and export. No generator measures the browser window or changes the supplied input. Text width uses conservative estimates, so exact shaping can vary with the installed fonts.

The document's `kind` field is a TypeScript discriminant: a renderer can safely handle a text, image, rule, or texture element according to its properties. `SystemId` and `LockKey` are unions derived from constant arrays, so invalid names are caught during type checking. The React hook holds a draft session and a generated document separately; a controlled textarea updates the draft, while Generate creates a new snapshot. `useRef` holds the SVG element for export and tracks temporary image URLs without triggering a render. `useEffect` releases those URLs when no draft, paper, or saved thumbnail uses them.

IndexedDB stores each saved document plus Blobs for a local image and its unprocessed original. A separate, versioned recovery database holds the active session and bounded history, deduplicating repeated image sources. Existing archive records keep their original schema; missing lineage is hydrated as a stable legacy root. Restoring creates a new temporary URL for that Blob. SVG export embeds image bytes as a data URL, which makes the file portable without depending on the temporary browser URL. Exported text remains editable SVG text, so recipients may see a fallback font if their system lacks the font used in the preview.

## Development checks

`npm test` runs pure engine tests in Node. They check reproducibility, variation across seeds, paper bounds, text fitting, collision avoidance, proof generation, operation serialisation, exclusion geometry, pixel analysis, image/type relationships, pass determinism and ordering, genetic inheritance, typographic geometry, and preservation under locks. `npm run build` includes strict TypeScript checking and a production Vite build. `npm run benchmark:current` recreates the comparison sheet without overwriting the frozen baseline; the other `benchmark:*` scripts recreate the feature review sheets.

The previous implementation review reported 51 Node tests and six browser export cases. Run `npm test` to obtain results for your checkout. The browser observations below are historical evidence, not a new compatibility claim. With Vite running, open `/scripts/verify-export.html` and choose **Run export checks** to verify production SVG embedding/metadata/guides, PNG dimensions, transparency, fragmented imagery, colour filters, vector type masks, and landscape output. This development tool is omitted from the production build. Mobile Compose, DRIFT, navigation, and command search were checked at 390 px. Recovery, undo/redo, archive duplication/filtering, and worker-backed PASS previews were also exercised in the browser.

## Known limits

- Some embedded browsers block native fullscreen. STUDY falls back to its panel-free Focus view.
- WebM uses browser capture timing. Duration and frame rate can vary, particularly in background tabs. MP4/GIF export is not included.
- SVG retains editable system-font text rather than bundled glyph outlines. Font substitution and non-Latin shaping need further review.
- PASS processes at a maximum 1400 px image side. Larger PNG export cannot recover source detail removed during processing.
- FAMILY recomposes the system, crop, colour, processing, image/type recipe, and last type-material recipe. It does not replay every DIRECT operation or SPACE zone across formats. Type-only/image-only outputs omit incompatible image/type relationships.
- Crossbreeding remains biased toward the base image/grid. Family formats can feel formulaic with the sample. The visual reviews document these weaknesses; control count does not establish artwork quality.
- Recovery and archive are local to the browser origin. Changing ports or clearing site storage changes access to the studies. Simultaneous tabs share one recovery record; the latest write wins. Save important directions and export external records.
- Undo history is bounded to 40 snapshots. A saved child remembers parent IDs even when older parent artworks are unavailable. Unapplied previews and generated sheets are not autosaved.
- The colour benchmark uses geometric material. The photographic PASS review covered a dark image; lighter photographs, portraits, and more varied art-directed inputs remain a quality review task.

See [DEVELOPMENT.md](../DEVELOPMENT.md) for architecture, implementation evidence, and visual decisions.

## AI-assisted development

The operator sets the art direction and selects the work. Codex implements the engine and interface, creates repeatable review sheets, and checks behaviour against the brief. The frozen benchmark makes changes inspectable. Diversity counts are clues; type relationships, crop decisions, and material character need visual judgment. DEVELOPMENT.md explains the React/TypeScript boundaries used by the application.
