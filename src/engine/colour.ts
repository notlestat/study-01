import type { ColourMode, ColourRecipe, CompositionDocument } from '../domain/document.ts';
import { assertSeed } from './random.ts';
import { createRandom } from './random.ts';

export const COLOUR_MODES: ColourMode[] = ['MONOCHROME', 'DUOTONE', 'TRITONE', 'EXTRACTED_PALETTE', 'INK_SYSTEM'];
export interface ResolvedColour { paper: string; ink: string; stops: [string, string, string]; accent: string; registration: number; offset: [number, number]; }
const NEUTRAL: ResolvedColour = { paper: '#fcfbf7', ink: '#22221f', stops: ['#22221f', '#aaa9a3', '#fcfbf7'], accent: '#22221f', registration: 0, offset: [0, 0] };
const FALLBACK: [string, string, string] = ['#6a332b', '#657884', '#dcc9b4'];

const channel = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
const asHex = (rgb: number[]) => `#${rgb.map((value) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: string, b: string, amount: number) => asHex(channel(a).map((value, index) => value + (channel(b)[index] - value) * amount));

export function validateColour(recipe: ColourRecipe): void {
  if (!COLOUR_MODES.includes(recipe.mode) || !Number.isFinite(recipe.intensity) || recipe.intensity < 0 || recipe.intensity > 1
    || !Number.isFinite(recipe.registration) || recipe.registration < 0 || recipe.registration > 1) throw new Error('Choose a valid colour treatment.');
  assertSeed(recipe.seed);
}

/** Art colour is derived from the image, then constrained by a five-mode ink grammar. */
export function resolveColour(document: CompositionDocument): ResolvedColour {
  const recipe = document.colour;
  if (!recipe || recipe.mode === 'MONOCHROME' || recipe.intensity === 0) return NEUTRAL;
  validateColour(recipe);
  const [dark, middle, light] = document.source.image?.analysis?.palette ?? FALLBACK;
  const ink = mix(dark, '#161614', .38);
  const paper = recipe.mode === 'EXTRACTED_PALETTE' ? mix('#fcfbf7', light, .13) : NEUTRAL.paper;
  const palette: [string, string, string] = recipe.mode === 'DUOTONE'
    ? [ink, mix(ink, paper, .52), paper]
    : recipe.mode === 'TRITONE'
      ? [ink, middle, paper]
      : recipe.mode === 'EXTRACTED_PALETTE'
        ? [ink, middle, mix(light, paper, .25)]
        : [ink, mix(ink, paper, .64), paper];
  const registration = recipe.mode === 'INK_SYSTEM' ? recipe.registration * recipe.intensity : recipe.registration * recipe.intensity * .5;
  const random = createRandom(recipe.seed);
  return {
    paper: mix(NEUTRAL.paper, paper, recipe.intensity),
    ink: mix(NEUTRAL.ink, ink, recipe.intensity),
    stops: palette.map((stop, index) => mix(NEUTRAL.stops[index], stop, recipe.intensity)) as [string, string, string],
    accent: mix(NEUTRAL.ink, middle, recipe.intensity),
    registration,
    offset: [(random() < .5 ? -1 : 1) * registration * (15 + 25 * random()), (random() < .5 ? -1 : 1) * registration * (9 + 18 * random())],
  };
}

export function withColour(document: CompositionDocument, recipe: ColourRecipe): CompositionDocument {
  validateColour(recipe);
  return { ...document, colour: { ...recipe } };
}
