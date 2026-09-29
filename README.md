# STUDY/01

A local composition instrument for exploring three visual systems with one image, a title, and metadata. The interface is built with Vite, React, TypeScript, and CSS. The composition engine is plain TypeScript and does not import React or browser APIs.

Source: [github.com/notlestat/study-01](https://github.com/notlestat/study-01)

The current build includes ORDER, SILENCE, and TENSION generators, seed-based variation, selective mutation locks, browser-saved compositions, and PNG/SVG export.

## Run

Node 26.8.1 is the verified development runtime. The tests import TypeScript directly through Node's native support, so older Node versions may need an upgrade. No API key or backend is needed.

```sh
git clone https://github.com/notlestat/study-01.git
cd study-01
npm ci
npm run dev
```

Open the local address printed by Vite. From the repository root, run these checks. Build before previewing:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

## Try it

1. Start with the built-in image or choose a PNG, JPEG, WebP, or AVIF file under 20 MB. Local files stay in your browser.
2. Edit the title and metadata, choose ORDER, SILENCE, or TENSION, and press **Generate**. The current paper stays visible while you edit; Generate applies the draft.
3. Change the seed to reproduce or explore a result. **Next seed** generates a fresh composition at the next seed.
4. Toggle any locks, then press **Mutate**. Mutation searches for a new seed while preserving the locked parts and avoiding title/image collisions. It is unavailable while draft inputs differ from the current paper or when all four parts are locked.
5. Press **Save variation** to keep a snapshot in this browser. Select a thumbnail to restore it, including a locally chosen image. Saved variations survive reload. The unsaved draft and current paper reset on reload.
6. Use **PNG** for a 1800×2400 raster export or **SVG** for a 900×1200 vector document. The source image is embedded in the exported file. Preview grid guides are omitted.

Saved variations live in this browser's IndexedDB. They are not part of the GitHub repository and will not appear on another device. Clearing this site's browser data removes them; export a composition you want to keep outside the browser.

**Generate** and **Next seed** create a fresh document from the source, system, and seed. Locks apply only to **Mutate**:

| Lock | Preserved during mutation |
| --- | --- |
| GRID | Element positions, sizes, and rule endpoints |
| TYPE | Title and metadata text, typography, and boxes |
| IMAGE | Image frame, fit, and crop position |
| TEXTURE | Pattern, pitch, opacity, and placement |

The seed and edition annotations still update when TYPE is locked. Some combinations require the engine to skip seeds until the fixed parts leave a clear arrangement. If all parts are locked, mutation has nothing to change.

## Architecture

```text
src/domain/       Shared input, document, and element types
src/engine/       Pure, deterministic rules for each system and mutation
src/lib/          Browser image decoding, IndexedDB storage, and export
src/app/          React session hook and panel wiring
src/components/   Controls, canvas renderer, shell, and variations rail
src/styles/       Design tokens and responsive CSS
```

The engine returns a `CompositionDocument` in a fixed 900×1200 coordinate space. SVG uses its `viewBox` to scale that same document for the large canvas, saved thumbnails, and export. No generator measures the browser window or changes the supplied input. Text width uses conservative estimates, so exact shaping can vary with the installed fonts.

The document's `kind` field is a TypeScript discriminant: a renderer can safely handle a text, image, rule, or texture element according to its properties. `SystemId` and `LockKey` are unions derived from constant arrays, so invalid names are caught during type checking. The React hook holds a draft session and a generated document separately; a controlled textarea updates the draft, while Generate creates a new snapshot. `useRef` holds the SVG element for export and tracks temporary image URLs without triggering a render. `useEffect` releases those URLs when no draft, paper, or saved thumbnail uses them.

IndexedDB stores each saved document plus a Blob for a local image. Restoring creates a new temporary URL for that Blob. SVG export embeds image bytes as a data URL, which makes the file portable without depending on the temporary browser URL. Exported text remains editable SVG text, so recipients may see a fallback font if their system lacks the font used in the preview.

## Development checks

`npm test` runs pure engine tests in Node. They check reproducibility, variation across seeds, paper bounds, text fitting, collision avoidance, and preservation under individual and mixed locks. `npm run build` includes strict TypeScript checking and a production Vite build.

## GitHub updates

The public repository tracks `origin/main`. To publish changes to the source code:

```sh
git status
git add .
git commit -m "Describe your update"
git push
```
