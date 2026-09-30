# STUDY/01 development record

## Existing system audit — 29 September 2026

The application currently has a Vite/React/TypeScript shell with source controls, a responsive SVG canvas, a variations rail, and four mutation locks. `src/domain/document.ts` defines a 900×1200 `CompositionDocument` containing text, image, rule, and texture elements. The ORDER, SILENCE, and TENSION generators in `src/engine/` use a local seeded random sequence. `mutateComposition` searches subsequent seeds, preserving selected layers and rejecting title/image collisions. One renderer displays the document in the main canvas and thumbnails. Browser-only modules decode an uploaded image, save variation snapshots and image Blobs in IndexedDB, and export embedded-image SVG or PNG. The existing Node tests and production build pass.

The code has no image-derived structure, processing pipeline, operation history, exclusion zones, lineage, motion, or additional workspace modes. Saved documents use version 1. New fields must be optional or migrated when older IndexedDB records are loaded.

## Frozen visual benchmark

[Open the 18-composition contact sheet](public/benchmarks/baseline/index.html) or run `npm run benchmark:current` and compare `public/benchmarks/current/index.html` against it. The fixed source is the built-in geometric sample, with seeds 1, 4, 7, 11, 18, and 26 for each system. Each SVG embeds the source image and uses the production renderer. The manifest records the full documents, geometry, structural signatures, and SVG hashes. `npm run benchmark:baseline` refuses to overwrite the frozen capture.

Observed baseline: 18 outputs yield eight coarse structural signatures, but three signatures account for 13 studies. ORDER places the title below the image in five of six examples. SILENCE places the image to the right in five of six. TENSION places the image to the right in five of six. Every study has one image and one title; none intersects image and type, fragments either, or lets source-image content affect placement. Seed variation changes margins, spans, crop, and scale more often than the compositional relationship. This is the specific repetition new features must break.

The sample holds source content constant so layout differences are visible. It is geometric, so it cannot judge whether effects work on a photograph. A second photographic review source should be added before image-processing quality is declared complete.

After each visual phase:

1. Render the same 18 current outputs, preserving the baseline.
2. Compare sheets at the same size and inspect at least one enlarged study per system.
3. Record genuinely new spatial relationships, typographic relationships, and image treatments. A higher signature count alone is insufficient.
4. Check long copy, extreme image ratios, exports, locks, accessibility, mobile layout, tests, and build.
5. Keep new controls only if they produce a distinct creative result.

## Architecture plan

Keep one serialisable composition document as the source of truth across workspaces. Generators and operations remain pure functions of document, input, settings, and seed. `src/engine/` owns layout, collision resolution, analysis-derived decisions, operations, and inheritance. React owns draft state, selection, previews, and history controls. The SVG renderer owns visual interpretation of document elements; PNG/SVG output must use the same renderer. Browser modules own pixel processing, storage, and downloads. Processing and motion modules can be loaded only when needed.

Represent creative operations as serialisable records rather than arbitrary callbacks. The current result records operation settings; later lineage work will add parent IDs and lock snapshots. New document fields stay optional so existing version-1 variation records remain loadable. Undo/redo moves among immutable document snapshots; it does not attempt to invert destructive effects.

The final interface groups the instruments into COMPOSE, DIRECT, DEVELOP, ARCHIVE, and OUTPUT over the same document. PROOF sits within COMPOSE; SPACE within DIRECT; PROCESS, GENETICS, FAMILY, DRIFT, and COLOUR within DEVELOP. The canvas remains central.

## Progressive implementation sequence

| Stage | Main work | Visual gate |
| --- | --- | --- |
| 01 | Audit, frozen benchmark, canvas focus/zoom, restrained workspace navigation | Canvas stays dominant; benchmark is reviewable |
| 02 | PROOF contact sheets, selection, keep/reject/develop, comparison | Same renderer; studies reveal more than repeated templates |
| 03 | DIRECT operations with preview/apply/undo and seeded records | Every command yields a distinguishable spatial/material effect |
| 04 | SPACE exclusion zones and collision-aware regeneration | Absence changes layout rather than covering it |
| 05 | Image × type interactions and image-derived structure | Photograph participates in composition decisions |
| 06 | Deterministic PASS processing stack | Repeated reproduction changes image material, not just tone |
| 07 | Lineage and crossbreeding | Offspring inherit identifiable traits from both parents |
| 08 | ACCIDENT and typography as material | Deliberate rule breaks produce controlled surprises |
| 09 | FAMILY recomposition across formats | Shared visual DNA survives different aspect ratios |
| 10 | DRIFT temporal studies and export | Motion changes the system, not merely its entrance |
| 11 | Colour, archive, and advanced export | Colour/metadata/output remain faithful to the visible art |
| 12 | Regression, performance, responsive and accessibility polish | No broken previous workflow |

Each stage is built and verified before the next. The benchmark gate can change implementation priority when an operation adds controls without new artwork.

## Stage 01 and 02 — implemented

The spatial grammar now has three families within each system, chosen by seed. The same 18-study sample produces 14 coarse structural signatures versus eight in the frozen baseline; the three most common signatures account for six studies versus 13. This supports greater layout diversity, while the coarse metric cannot establish artistic quality by itself.

The canvas has focus and zoom controls. PROOF makes 4, 9, 12, or 16 studies from one parent, respects locks, and renders with the same SVG component as Compose. Studies can be selected and compared, kept in the existing local variation store, rejected from the active sheet, or developed as the next parent. Desktop and 390 px layouts were inspected; the narrow sheet had no horizontal overflow. Keep, reject, compare, and develop were exercised in the running app.

## Stage 03 — DIRECT initial implementation and visual gate

`src/engine/operations.ts` applies eight seeded, serialisable transformations to immutable documents. The interface provides intensity, seed, preview, apply, undo, redo, and reset. Transformations respect the four locks. FRACTURE clips several slices from the same underlying image placement, so it breaks the photograph rather than repeating the whole source. ECHO creates offset layers. COMPRESS and DISPLACE bring type into the image field; INTERRUPT places a solid bar across an established relationship. These effects render in the production SVG component and therefore flow into both exports.

[Review the 27-artwork DIRECT sheet](public/benchmarks/direct/index.html): one fixed parent from each system followed by all eight operations at identical settings. The first render showed COMPRESS, INTERRUPT, and DISPLACE looking too close to the parent. They were strengthened, rendered again, and inspected at contact-sheet and enlarged scale. WITHHOLD, FRACTURE, ECHO, ERODE, and INVERT already produced clear changes. The second render shows overlapping typography, image fragmentation, repeated forms, an interruption bar, and shifted image/type hierarchy. The work is intentionally imperfect, but not eight recolourings of one layout.

The next visual gate needs a fixed photograph in addition to the geometric sample. The current study cannot prove portrait crop quality, tonal response, or material processing.

## Stage 04 — SPACE implemented and reviewed

SPACE lets the user draw rectangle, ellipse, or freeform exclusion zones over the composition, then edit bounds, lock, or delete each zone. The engine tests intersections against the actual zone geometry and searches grid-aligned placements and sizes for eligible elements. It rejects conflicts with locked elements. The zone outline appears only in editing previews; the exported artwork contains moved elements rather than a paper-coloured cover shape. Accepted zones persist in the document and constrain later mutation and proof studies.

[Review the SPACE 18-study sheet](public/benchmarks/space/index.html) beside the current sheet. One fixed central zone changed all 18 compositions, moving all 18 images and 11 titles. The first solver concentrated images into similar top/bottom positions and left some texture behind. After considering smaller side placements, reserving header/footer text, and keeping texture attached to its image, the sheet has 13 coarse signatures. This is slightly below the unconstrained sheet's 14, which is expected when a central area is forbidden; it remains above the original baseline's eight. Tiny images in a few studies are an open quality concern and will inform further development of constraints and image relationships.

## Stage 05 — IMAGE × TYPE and image-derived structure

The browser now samples an uploaded image at 64×64 and passes its RGBA pixels to a pure analysis function. It estimates luminance, contrast, edge density, broad visual balance, a focal region, and a quiet region. No photograph leaves the browser or requires an AI API. EXTRACT STRUCTURE uses those measurements to choose crop focus, title position/tone, and grid density. This is an approximation of visual structure, not subject recognition.

DIRECT has a second, compact method group for seven image/type relationships plus EXTRACT STRUCTURE. The effects change document elements that the shared SVG renderer can draw: type masks, knockout masks, independently clipped image/type slices, overlapping type, occlusion, and displaced image strips. Relevant locks disable modes that would alter locked layers. Preview derives from the same pure function as Apply; applying stores a new snapshot for Undo/Redo.

[Review the 24-artwork image/type sheet](public/benchmarks/image-type/index.html): three original studies, each followed by seven relationships at the same intensity and seed. The first sheet showed the same relationship overwhelming system identity; the next iteration anchored its geometry to each original image and title. The current sheet keeps different ORDER, SILENCE, and TENSION structures while producing distinct masks, fragments, overlaps, and displacement. A regression test checks that five modes retain three different system geometries. The deliberately broken TYPE SLICE can sacrifice easy reading; it is an experimental output rather than a default composition.

A local photographic check used an existing portfolio image without adding that image to this repository. The browser estimated focus at 74:51 and a quiet region at 13:63, then placed white title text in that quieter area while retaining the photographic subject. Apply, Undo, SVG, and PNG were exercised in the running app. The browser showed download confirmation for both exports; this check did not inspect their downloaded bytes. At 390 px, the composition remained dominant and the method controls moved below it. Processing quality across a wider range of photographs remains unproven.

## Stage 06 — PASS material processing

`src/processing/passes.ts` contains twelve deterministic raster transformations with no React or DOM dependency. A stack calls each pass on the previous pass's pixels. The browser adapter decodes and scales the source to a maximum 1400 px side, applies the stack, and encodes a local WebP result for the shared renderer and exports. The original remains in the document for comparison, editing, and restoration. A saved variation stores both the processed image and a local original Blob when necessary; both restored correctly after a browser reload in the photographic check.

PROCESS exposes one selected pass at a time for amount/seed editing, reorder, disable, and removal. A stage slider previews earlier steps and allows that stage to be committed. Compare original toggles the source image without changing the document. Named stacks can be saved in local browser storage. The visual canvas remains central; on a 390 px viewport it appears before the controls.

The first twelve-treatment photographic contact sheet was reviewed locally and not added to the repository because the image belongs to an existing portfolio. THRESHOLD and BITMAP initially collapsed this dark photograph into nearly solid black; HALFTONE filled the page; OFFSET looked too close to CHANNEL MISREGISTRATION; EROSION and INK BLEED both became neutral gray. The second iteration uses source-relative tonal thresholds, cell averages, limited ink-dot radii, separate subtractive colour screens, and opposite erosion/bleed behaviour. The revised treatments now show distinct silhouettes, dot screens, coarse bitmap structure, xerographic noise, scanner displacement, and colour misregistration. RAW intentionally leaves the original image unchanged. Material quality on portraits and lighter photographs still needs review.

## Stage 07 — EVOLVE lineage and crossbreeding

Each committed document now records an ID, parent IDs, root seed, generation, action, lock snapshot, and creation time. Crossbred studies additionally record which parent supplied the image/grid, which supplied the type hierarchy, and the donor weighting. The EVOLVE tree draws from undo/redo history and saved variations. Selecting an earlier study and developing it restores that document identity; the next mutation becomes its child. Comparing two studies produces a live hybrid preview. The hybrid transplants B's title-to-image geometry into A's image frame and grid, blends typography by weight, and at stronger weights fractures A's image using B's proportions. The pure engine clamps new geometry to the paper and never imports React.

Existing saved records without lineage are hydrated as legacy roots; in-memory documents from an older hot-reloaded session are also migrated. Saved records retain their IDs and processed/original image data. The running app was used to create ORDER → SILENCE → TENSION, crossbreed ORDER with TENSION, inspect both parent IDs, return to the ORDER root, and mutate into a separate generation-one branch.

[Review the 18-hybrid crossbreed sheet](public/benchmarks/crossbreed/index.html) beside the frozen baseline. All 18 SVGs are distinct. A coarse signature method finds seven relationships in the crossbreed sheet versus eight in the baseline; the methods are not identical, so this is not an improvement claim. Visually, stronger donor influence adds separated image planes, and different donor systems alter title placement and scale. Some results still cluster around the base image frame and some collisions need art-direction judgment. The next stages should push further on structural diversity rather than add weighting controls. This sheet holds seeds 11 and 18 fixed to expose inheritance; later photographic and varied-parent reviews remain useful.

At Stage 07, session history was bounded to 40 snapshots and only saved variations persisted. Stage 12 adds recovery of that bounded history and the current session. A saved child keeps its parent IDs even if those parent artworks are unavailable; save directions you want to inspect later. The lineage view combines available session snapshots and saved records; missing ancestors retain their IDs rather than fabricated artwork.

## Stage 08 — ACCIDENT and typography as material

ACCIDENT is a seeded DIRECT operation with four severities. ORDER breaks alignment by a grid-aware step, then introduces a rule and a second type scale at stronger settings. SILENCE progressively withholds the image into a sliver and moves the title into open space. TENSION presses type into the image, repeats a displaced image remnant, and can culminate in a black interruption with white type. These are different failure rules for each system, not one global random-position command. Locks prevent changes to held layers.

Type Material provides character displacement, repetition, vertical compression, horizontal stretch, line fragmentation, tracking distortion, baseline shifts, grid separation, typographic masking, and procedural erosion. A readability parameter constrains the effective distortion. The engine stores individual glyph positions and vector erasure rectangles in the document. The shared SVG renderer paints those marks as text and masks, so they appear in preview, saved variations, SVG, and PNG. The source text remains in the document for later generation. SPACE can remap the treated glyph geometry if a zone moves the title; CROSSBREED can inherit a parent's type material.

[The 15-artwork ACCIDENT sheet](public/benchmarks/accident/index.html) was compared with the frozen baseline. The first render let ORDER's image obscure low-severity type and made TENSION's severe type too pale; painting order and contrast were corrected. High and extreme outcomes now diverge structurally, especially TENSION's blackout. [The 33-artwork typography sheet](public/benchmarks/typography/index.html) shows the source plus ten treatments for each system. It exposed GRID SEPARATION spilling into metadata on shorter title boxes; a cell-size constraint brought the characters back within their typographic field. Some intentionally broken treatments sacrifice reading at low readability, while the default 60% keeps more letter structure.

In the running app, GRID SEPARATION was previewed and applied. Its SVG download parsed as a 900×1200 document with 18 text nodes and one embedded image; the PNG download was 1800×2400 and visually matched the treated preview. Static SVG reviews confirmed actual mask elements for TYPOGRAPHIC MASK and PROCEDURAL EROSION. These are local checks with the geometric sample; typography across other fonts and languages needs further review.

## Engineering concepts

The document is a value: a generator returns a new description of the artwork instead of moving DOM elements directly. That makes the same seed reproducible, allows several UI views to render the same composition, and gives undo a stable snapshot. A renderer converts that value into SVG. The browser can then scale it for preview or export it without a second layout implementation.

An operation record is a recipe: `{ kind, intensity, seed }`. Keeping the recipe alongside the resulting document makes a study explainable and repeatable. Locks are constraints applied during that recipe, rather than controls that modify artwork by themselves.

React holds a history of document values for undo and redo. Moving between snapshots is safer than attempting to mathematically reverse image or typography effects. A DIRECT preview is calculated from the current snapshot and recipe without replacing the current document until Apply is pressed.

PASS follows the same boundary. `Raster` is a plain typed array plus width and height; a pure function transforms it according to serialisable pass records. The browser adapter alone uses `Image`, `Canvas`, and a data URL. This separation lets Node tests verify ordering and determinism without pretending that a React component is the image engine. The session preserves the original image alongside the processed document, so a saved result can be compared or rebuilt from its recipe.

Lineage IDs make the document history a graph instead of an ordered list. `parentIds` stores one ID for a normal transformation and two for a crossbreed. The artwork remains an immutable value; the UI can preview a pure hybrid before committing it as a new node. Legacy records gain a root identity when loaded, which is a small schema migration without rewriting existing browser data.

Type Material demonstrates a useful React/TypeScript boundary: the UI stores only recipe controls, while the pure engine turns the recipe into serialisable glyph and mask geometry. The renderer has one responsibility—turning that geometry into SVG. Preview and Apply use the same engine function; they differ only in whether React commits the returned document to session history.

## Stage 09 — FAMILY recomposition

FAMILY derives seven documents from one parent: poster, square, editorial, banner, social portrait, type only, and image only. Each output uses its own width, height, margins, image field, and title hierarchy; the landscape banner is a horizontal composition rather than a scaled poster. The recomposition retains the parent's system, source image and processed version, focal placement, typographic scale, and last Type Material recipe where the format has a title. A developed family asset keeps its dimensions through Generate and Mutate. A type-only or image-only asset can generate a new full family using its stored source.

[Review the 21-artwork FAMILY sheet](public/benchmarks/family/index.html) beside the frozen poster baseline. It contains the three systems across all seven formats, with 21 distinct SVGs. The image-only and type-only studies change the structure most; the three square/editorial/social formats remain recognisably related, which is appropriate for a visual family but can feel formulaic with the simple geometric source. More varied photographic input and art-directed parents are needed to judge whether the family truly keeps a strong identity across contexts.

In the running app, the selected banner developed into a 1600×600 Compose document and mutation kept it at 1600×600. Batch export produced a valid ZIP with seven SVGs at the intended dimensions. Images were embedded in the six formats that use them. One asynchronous export check caught callback refs changing during a React busy-state render; snapshotting the thumbnail references before export fixed it. React owns which format is selected and the export status, while the pure family function owns all artwork geometry.

## Stage 10 — DRIFT temporal studies

`src/engine/drift.ts` turns a document, serialisable motion recipe and time value into a new SVG-ready document. SLIP separates image bands and moves the title/grid in opposition. DECAY breaks image continuity and adds seeded absence marks. REPEAT shrinks the image and propagates type at contrasting scales and positions. Duration, speed, intensity, spatial direction, loop and seed are recipe data; there is no runtime randomness. Scrubbing, playback and reset use the same `driftFrame` function. Attaching a recipe stores it on the document so local saved variations can retain it.

[Review the 27-frame DRIFT sheet](public/benchmarks/drift/index.html) beside the frozen still baseline. The three systems retain their initial composition identities, then diverge by temporal structure. SLIP and DECAY change the image surface strongly; REPEAT explores typographic accumulation. The sheet exposed REPEAT acting too much like a faint shadow, so its spacing and image-field type mass were increased. The fixed geometric source still cannot establish how photographic deterioration reads over time.

WebM export records the SVG preview through a browser canvas and reports progress or errors. A one-second clip downloaded and parsed as WebM, but the background browser recorded about 1.4 seconds with fewer frames than requested. This is a browser capture timing limitation, so the duration control is approximate for WebM; preview scrubbing and still export remain exact. The browser UI was checked at desktop width. The Stage 12 check subsequently verified this panel at 390×844, with no horizontal page overflow.

## Stage 11 — COLOUR, ARCHIVE, OUTPUT

COLOUR adds monochrome, duotone, tritone, extracted palette, and separated ink systems. The 64×64 image analysis now extracts a three-colour palette locally. Colour recipes resolve into SVG colour tables and seeded ink offsets. The interface remains monochrome. [The 15-artwork colour review](public/benchmarks/colour/index.html) holds geometry constant to expose tonal differences; it does not claim greater structural diversity. The source is a recoloured geometric fixture with declared palette anchors. Review found MONOCHROME bypassing its filter on coloured input and the registration layer whitening the image. Monochrome now filters that source, and the separated ink layer has luminance-derived transparency rather than a second paper surface. Further photographic review remains necessary.

ARCHIVE filters saved studies by system, date, operation, and ordering. Selecting two studies compares their actual SVGs. Reopen restores a document, Branch creates a child, Duplicate saves a new descendant, and deletion requires a second action. The large artwork leads the panel, with its thumbnail gallery below. Archive and PROOF contact sheets clone production SVGs and embed images; beyond 12 studies they produce paginated ZIPs. Legacy archive documents without lineage become stable roots at hydration; their artwork geometry is preserved. The existing IndexedDB archive stays at version 1 with optional new document fields.

OUTPUT exposes native document dimensions, 1×/2×/3× PNG resolution, native SVG, and transparent paper. Transparency removes only the background rectangle; deliberate paper-coloured erasure and knockout marks remain. SVG metadata records source text, system, seed, dimensions, operation recipes, processing passes, colour, motion, and lineage. Source image URLs and image bytes are not copied into metadata; image elements separately embed their assets. The same renderer powers artwork, thumbnails, family exports, contact sheets, and video frames. SVG text remains editable, with the known system-font limitation.

## Stage 12 — recovery, interaction, performance, verification

The header now uses the five requested workspaces and a compact second row for their instruments. Command search is a native modal dialog with keyboard focus management. Global shortcuts avoid stealing ordinary input editing. Compose supports fit/zoom, focus, native fullscreen, safe areas, grid guides, before/after comparison, and selected-element bounds. Guides and indicators are marked preview-only and stripped during export. Existing reduced-motion CSS remains in force; artwork playback starts only when requested.

Local recovery uses its own versioned IndexedDB database, leaving archived studies untouched. It stores the document, draft source controls, lock values, seed text, and up to 40 undo/redo snapshots. Uploaded originals and processed images are deduplicated across that history, stored as Blobs, and rebound to new object URLs on recovery. Writes are debounced and serialised so an older slow write cannot replace a newer snapshot. A visibility change requests a save. The status distinguishes unsaved, saving, saved, and unavailable recovery. A forced close before a completed write can still lose the newest changes; generated sheets and unapplied previews remain temporary. Multiple tabs use the same recovery slot.

PASS algorithms now run in a module Web Worker. The browser adapter is lazy-loaded, obsolete workers are terminated, and four processed previews are cached. The 1400 px source bound remains deliberate. This keeps expensive pixel loops away from React's rendering thread. Runtime APIs stay at the browser boundary; the pure raster functions remain independently testable in Node.

Stabilisation also closed fractional-speed DRIFT loops, applied held-layer constraints to motion, preserved linked image/type masks during motion, and carried compatible image/type and colour recipes into recomposed family formats. FAMILY does not replay all DIRECT geometry or exclusion zones; this is documented rather than concealed.

Verification at this stage:

- 51 Node tests pass: deterministic systems/mutation, locks, bounds, operations, exclusions, image analysis, processing, inheritance, family, motion, colour, archive filtering, legacy hydration, recovery image bytes, history, dimensions, and ZIP headers.
- Production TypeScript/Vite build passes, with separate processing/worker chunks.
- The development-only `/scripts/verify-export.html` runs six real production-renderer SVG/PNG cases. It checks native and 2× sizes, transparent corner alpha, monochrome on coloured input, 14 embedded fractured image planes plus colour filters, vector text masks, metadata, absence of guides, and 1600×600 landscape output.
- Browser reload recovered identical composition metadata. Keyboard undo changed the snapshot; redo restored it. Worker-backed XEROX preview finished and enabled Apply.
- Archive duplication produced a second saved study with a new lineage generation. System filtering showed an empty view then restored both studies; comparison displayed A/B artworks. Branch produced the correct parent ID and ARCHIVE_BRANCH event, and undo returned to the prior current study. Its export action completed; the current automated browser could not expose the downloaded contact-sheet file path for byte inspection. The earlier seven-file family ZIP was parsed and verified. Browser checks never deleted saved user work.
- Compose and DRIFT were visually checked at 390×844 with the five-workspace navigation and no horizontal overflow. Command search filtered and opened OUTPUT through Enter. Narrow layouts keep the artwork ahead of controls. The embedded browser did not enter native fullscreen; that path now reports the limitation and enables Focus instead.
- Current 18-study geometry still gives 14 coarse signatures versus eight in the frozen baseline, with the three most common signatures covering six rather than 13 studies. These counts are not a quality score. Updated 21-asset FAMILY, 27-frame DRIFT, and 15-artwork COLOUR sheets remain reviewable alongside the baseline.

The engine/document/rendering boundary is the main design-engineering lesson: React coordinates intent and selected snapshots; TypeScript unions define valid recipes; pure functions produce immutable artwork data; the renderer paints that data; browser adapters handle pixels, storage, and files. A Worker changes where a calculation runs, not what the recipe means. A recovery database preserves the document rather than trying to reconstruct it from UI controls. Schema version and engine revision are separate: the current engine records `study-lab-01`, while legacy snapshots retain their original geometry. There is no claim that a current seed alone reconstructs an older engine build.
