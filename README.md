# STUDY/01

A generative composition instrument for exploring visual systems. Phase 02 adds the first working system, ORDER, to the Phase 01 workspace.

## Run locally

Node 26.8.1 is the verified development runtime. The test command imports TypeScript directly through Node's native support, so older Node releases may require an upgrade even if they can run Vite. No API key or backend is needed.

```sh
git clone https://github.com/notlestat/study-01.git
cd study-01
npm ci
npm run dev
```

Run these checks from the repository root. Build before previewing:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

## Push updates to GitHub

From this project folder, save your changes, then run:

```sh
git status
git add .
git commit -m "Describe your update"
git push
```

Use a commit message that describes what changed. Dependencies, build output, local environment files, and verification artifacts are ignored by Git.

## Try Phase 02

Start with the built-in geometric image, which was authored for this project. Press Next seed to explore other ORDER compositions. Seeds 1, 4, and 5 make useful comparisons. Turn on Show grid to inspect the alignments.

Replace the sample with one local PNG, JPEG, WebP, or AVIF under 20 MB. Edit the title or metadata, choose a seed from 0 to 999999, and press Generate ORDER. The current result remains visible while editing. The canvas and thumbnail render the same generated document.

SILENCE and TENSION have no generators yet. Selecting them disables generation and leaves the current ORDER result visible. Mutation, saving, and export remain disabled. Locks record intent for future mutations and do not constrain fresh generation or Next seed.

Images stay in the browser; no upload endpoint, analytics, or remote image request is used. Local URLs remain available while either the draft or current document needs them and are revoked afterwards. Session state resets on reload. The rail count describes saved variations and stays at zero.

## File map

```text
src/
  main.tsx                         React entry point
  app/
    App.tsx                        Connects state to panels
    useStudySession.ts             Draft state, generated result, image lifecycle
  domain/
    composition.ts                 Input, system, lock, and session types
    document.ts                    Engine output and typed element union
    sample.ts                      Built-in sample image description
    systems.ts                     System names and descriptive copy
  engine/
    order.ts                       Pure ORDER generator
    random.ts                      Repeatable seeded random sequence
    text.ts                        Text wrapping and fitting
    README.md                      ORDER rules and engine boundary
  lib/
    loadLocalImage.ts              Browser-only validation and image decoding
  components/
    shell/                         Header and workspace layout
    controls/                      Inputs, system selector, seed, generation, locks
    canvas/                        Responsive frame and SVG document renderer
    variations/                    Current thumbnail and empty saved state
    ui/                            Shared SVG icons
  styles/
    tokens.css                     Color, type, and panel-width tokens
    app.css                        Components and responsive layouts
public/sample-study.svg            Authored geometric sample, not a photograph
tests/order.test.mjs               Engine tests with Node's built-in test runner
```

## React and TypeScript concepts in this phase

### Components and props

A component is a function that returns JSX, the markup-like syntax used to describe the interface. `ControlsPanel` receives the current input and system as props. Its TypeScript interface states the values it expects and the callbacks it may call. A wrong system name or missing callback fails the type check.

`Workspace` uses named `ReactNode` props as slots. It places panels without knowing their state. Changing the workspace layout does not require rewriting input logic.

### State and controlled inputs

`useStudySession` is a custom hook. It groups React's `useState` with the functions that update the session. Calling a setter asks React to render the affected interface again.

The title textarea is controlled: its `value` comes from draft state, and `onChange` writes back to that state. Generate calls the engine and stores a document snapshot. The large canvas and current thumbnail receive that same document. Editing the draft does not overwrite the result until you generate again.

### Immutable updates

State updates use a functional setter, such as `setSession(current => ...)`, to work from the latest state. Object spreads create new objects instead of mutating the existing session. Nested objects need their own spread. Toggling GRID copies both the session and its locks.

### Union types and records

`as const` preserves the exact strings in `SYSTEM_IDS`. `SystemId` derives the union `'ORDER' | 'SILENCE' | 'TENSION'` from that tuple. `Record<LockKey, boolean>` requires a boolean for every lock key. These constraints catch invalid names before runtime.

`satisfies` checks the system definitions against their intended shape without discarding their exact values. `import type` marks imports that only exist for TypeScript checking and disappear from browser JavaScript.

### Rendering collections

The system options and lock buttons use `.map()` to render lists. Each item has a stable `key`, its system or lock name, so React can identify it across updates. Native radio inputs provide arrow-key navigation. Lock buttons use `aria-pressed` to expose toggle state.

### The engine boundary

`domain/` contains plain TypeScript. It imports neither React nor browser APIs. `generateOrder` is a pure function: the same input and seed return the same document, with no changes to input. It works directly in Node, independent of React.

The document uses a discriminated union. Each element has a `kind` of `text`, `image`, or `rule`. The renderer switches on that kind, and TypeScript narrows the available properties. An image has an asset and a fit mode; a text element has lines and typography.

### SVG and reproducible geometry

The document uses a 900×1200 coordinate space. SVG's `viewBox` scales that space to the paper's displayed size. Both the large paper and small thumbnail render the exact same geometry, without a separate CSS composition layout.

The seed initializes a local pseudorandom sequence. ORDER uses that sequence to choose margins, column counts, spans, hierarchy, and type sizes within constraints. It never calls `Math.random`, reads screen dimensions, or imports React. Image aspect ratio affects the frame and crop treatment; title length affects wrapping and fitting.

### Effects, refs, and image ownership

Image decoding uses browser APIs in `lib/`, outside the engine. `useEffect` handles URL cleanup after React commits a change. `useRef` holds the owned URL set and request counter without causing renders. The request counter rejects late results after another file is chosen or the component unmounts. Old image URLs remain alive while a previous generated document still displays them.

No store library, router, API, or database is needed for this phase.

## Visual decisions

Warm off-white workspace, almost-black type, square edges, 1px rules. System grotesk and monospace stacks avoid external font requests. CSS Grid allocates the desktop canvas the remaining space after two restrained side panels. On narrow screens the canvas comes first, controls stack below it, and the rail becomes a horizontal section.

The paper keeps a 3:4 ratio. SVG scales typography and image geometry together. On desktop, the paper fits the stage's available height. Inputs and the variations rail can scroll independently, while generation controls and bottom locks remain visible. On mobile, sections scroll vertically.

Text wrapping uses conservative character-width estimates rather than exact font measurements. It preserves non-empty explicit lines, wraps long words, and reduces type size to fit. Exact shaping for every font and script remains future work. Very wide or tall images are shown whole; moderate aspect differences use a centered crop. There is no focal-point control, texture generation, or image processing.

The frontend-design skill informed the token palette, hierarchy, and canvas-first layout. The emil-design-eng skill informed immediate state feedback, visible keyboard focus, pointer-only hover states, and reduced-motion behavior. The pick-ui-library skill was consulted for component choices. This phase uses native radios, textareas, and buttons; it has no dialogs, menus, or popovers needing a component library. Base UI is the suggested option when those controls are introduced.

## Phase 01 verification

Verified on 28 September 2026:

- Production build and strict TypeScript checks pass.
- Browser checks at 1440×900, 1280×720, 768×1024, 390×844, and 320×740 show no horizontal page overflow. The paper retains its 3:4 ratio. Desktop locks fit within the viewport; smaller layouts scroll vertically.
- Title and metadata edits reach both previews. Empty fields display fallback text.
- Native radio arrow keys select SILENCE and TENSION. Mouse and keyboard interactions toggle locks, including the four-lock state.
- Image input, saving, mutation, and export are disabled.
- Reload restores the initial session. The inspected browser console contains no warnings or errors.

These are build and browser checks, not a unit-test suite. No generative behavior exists to test in this phase.

Phase 02 verification is recorded below; the Phase 01 section above is a historical record.

## Phase 02 verification

Verified on 29 September 2026:

- Seven engine tests pass, including 800 documents across seeds and image orientations, reproducibility without input mutation, column alignment, non-overlapping title/image regions, long text, extreme aspect ratios, empty input, and invalid inputs.
- Native Node TypeScript support runs engine tests without React or a test framework dependency. Tested with Node 26.8.1.
- Production build and strict TypeScript checks pass.
- Browser file selection successfully decodes local landscape and portrait PNGs. Corrupt images and unsupported types report errors while retaining the last valid source.
- Same local image, title, metadata, and seed reproduce the same rendered SVG. Replacement inputs retain the previous result until generation.
- Invalid seeds and missing images disable generation. Next seed wraps from 999999 to 0. SILENCE disables generation and leaves the ORDER result visible.
- Grid guides toggle by keyboard. The longest permitted unbroken title stays inside the rendered paper.
- Browser checks at widths 320, 390, 768, 1280, and 1440 show no horizontal page overflow and retain the 3:4 paper. Desktop Generate and bottom locks remain visible; smaller layouts scroll vertically.
- The final fresh page load contains no browser warnings or errors.

This phase validates the first rule set and its UI. It does not prove the creative quality of every possible source image or replace visual judgment.
