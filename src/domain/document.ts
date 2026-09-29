import type { CompositionInput, ImageAsset } from './composition.ts';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextElement {
  kind: 'text';
  id: string;
  box: Box;
  lines: string[];
  font: 'sans' | 'mono';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  weight: number;
}

export interface ImageElement {
  kind: 'image';
  id: string;
  box: Box;
  asset: ImageAsset;
  fit: 'contain' | 'cover';
}

export interface RuleElement {
  kind: 'rule';
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// The `kind` field lets TypeScript identify which properties an element has.
export type CompositionElement = TextElement | ImageElement | RuleElement;

export interface CompositionDocument {
  version: 1;
  system: 'ORDER';
  seed: number;
  width: number;
  height: number;
  source: CompositionInput;
  grid: { margin: number; columns: number; gutter: number; columnWidth: number };
  hierarchy: 'Title first' | 'Image first';
  elements: CompositionElement[];
}
