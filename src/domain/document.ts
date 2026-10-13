import type { CompositionInput, CompositionLocks, ImageAsset, SystemId } from './composition.ts';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AffineMatrix = [number, number, number, number, number, number];
export interface ElementPlacement { transform?: AffineMatrix; }

export interface TextElement extends ElementPlacement {
  kind: 'text';
  id: string;
  box: Box;
  lines: string[];
  font: 'sans' | 'mono';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  weight: number;
  opacity?: number;
  tone?: 'ink' | 'paper';
  /** Original type placement when this element is a displaced clipped slice. */
  frame?: Box;
  /** Optional SVG-ready character geometry and vector erasure. */
  glyphs?: GlyphMark[];
  erasures?: Box[];
}

export interface GlyphMark { char: string; x: number; y: number; rotate?: number; scaleX?: number; scaleY?: number; opacity?: number; }

export interface ImageElement extends ElementPlacement {
  material?: { blend: 'normal' | 'multiply' | 'screen' };
  kind: 'image';
  id: string;
  box: Box;
  asset: ImageAsset;
  fit: 'contain' | 'cover';
  focalX: number;
  focalY: number;
  /** Source placement can stay fixed while the visible clip is fractured. */
  frame?: Box;
  opacity?: number;
}

export type OperationKind = 'WITHHOLD' | 'FRACTURE' | 'COMPRESS' | 'INTERRUPT' | 'ECHO' | 'ERODE' | 'DISPLACE' | 'INVERT' | 'ACCIDENT';
export interface OperationRecord { kind: OperationKind; intensity: number; seed: number; }

export type ImageTypeKind = 'TYPE_MASK' | 'TYPE_KNOCKOUT' | 'IMAGE_SLICE' | 'TYPE_SLICE' | 'OVERPRINT' | 'OCCLUSION' | 'DISPLACEMENT' | 'EXTRACT_STRUCTURE';
export interface ImageTypeRecipe { kind: ImageTypeKind; intensity: number; seed: number; }

export type TypographyKind = 'CHARACTER_DISPLACEMENT' | 'REPETITION' | 'VERTICAL_COMPRESSION' | 'HORIZONTAL_STRETCH' | 'LINE_FRAGMENTATION' | 'TRACKING_DISTORTION' | 'BASELINE_SHIFT' | 'GRID_SEPARATION' | 'TYPOGRAPHIC_MASK' | 'PROCEDURAL_EROSION';
export interface TypographyRecipe { kind: TypographyKind; intensity: number; readability: number; seed: number; }

export type FamilyFormat = 'POSTER' | 'SQUARE' | 'EDITORIAL' | 'BANNER' | 'SOCIAL_PORTRAIT' | 'TYPE_ONLY' | 'IMAGE_ONLY';

export type DriftMode = 'SLIP' | 'DECAY' | 'REPEAT';
export type DriftDirection = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
export interface DriftRecipe {
  locks?: CompositionLocks;
  mode: DriftMode;
  duration: number;
  speed: number;
  intensity: number;
  direction: DriftDirection;
  loop: boolean;
  seed: number;
}

export type ColourMode = 'MONOCHROME' | 'DUOTONE' | 'TRITONE' | 'EXTRACTED_PALETTE' | 'INK_SYSTEM';
export interface ColourRecipe { mode: ColourMode; intensity: number; registration: number; seed: number; }

export interface SpaceZone {
  id: string;
  shape: 'rectangle' | 'ellipse' | 'freeform';
  box: Box;
  points?: [number, number][];
  locked: boolean;
}

export type PassKind = 'RAW' | 'THRESHOLD' | 'DITHER' | 'HALFTONE' | 'XEROX' | 'BITMAP' | 'OFFSET' | 'EROSION' | 'SCANNER_DISPLACEMENT' | 'GRAIN' | 'INK_BLEED' | 'CHANNEL_MISREGISTRATION';
export interface ProcessingPass { id: string; kind: PassKind; amount: number; seed: number; enabled: boolean; }

export type EvolutionEvent = 'ROOT' | 'GENERATE' | 'MUTATE' | 'PROOF' | 'DIRECT' | 'IMAGE_TYPE' | 'TYPOGRAPHY' | 'SPACE' | 'PROCESS' | 'RESTORE_SOURCE' | 'RESET' | 'CROSSBREED' | 'FAMILY' | 'DRIFT' | 'COLOUR' | 'ARCHIVE_BRANCH' | 'ARCHIVE_DUPLICATE' | 'CANVAS_EDIT' | 'MATERIAL';
export interface LineageRecord {
  id: string;
  parentIds: string[];
  rootSeed: number;
  generation: number;
  event: EvolutionEvent;
  locks: CompositionLocks;
  createdAt: string;
  crossbreed?: { baseId: string; donorId: string; donorWeight: number };
}

export interface TextureElement extends ElementPlacement {
  kind: 'texture';
  id: string;
  box: Box;
  pattern: 'lines' | 'dots';
  pitch: number;
  opacity: number;
}

export interface RuleElement extends ElementPlacement {
  kind: 'rule';
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BlockElement extends ElementPlacement {
  kind: 'block';
  id: string;
  box: Box;
  fill: 'ink' | 'paper';
  opacity: number;
}

// The `kind` field lets TypeScript identify which properties an element has.
export type CompositionElement = TextElement | ImageElement | RuleElement | TextureElement | BlockElement;

export interface CompositionDocument {
  version: 1;
  /** Engine revision is separate from the persisted schema version. */
  engineRevision?: string;
  system: SystemId;
  seed: number;
  width: number;
  height: number;
  source: CompositionInput;
  grid: { margin: number; columns: number; gutter: number; columnWidth: number };
  hierarchy: string;
  /** Spatial rule family; optional for documents saved before the laboratory expansion. */
  family?: string;
  /** Optional for existing saved compositions. Operations are serialisable recipes. */
  operations?: OperationRecord[];
  canvasEdits?: CanvasEdit[];
  imageType?: ImageTypeRecipe;
  typography?: TypographyRecipe[];
  familyAsset?: { format: FamilyFormat; parentId?: string };
  drift?: DriftRecipe;
  colour?: ColourRecipe;
  processing?: { original: ImageAsset; passes: ProcessingPass[] };
  lineage?: LineageRecord;
  spaceZones?: SpaceZone[];
  elements: CompositionElement[];
}

export interface CanvasEdit { elementId: string; action: 'TRANSFORM' | 'RESET' | 'IMAGE_FIT' | 'MATERIAL' | 'REMOVE_MATERIAL' | 'FRONT' | 'BACK'; matrix?: AffineMatrix; fit?: 'contain' | 'cover'; }
