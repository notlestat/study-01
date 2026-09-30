import type { ImageTypeKind, ImageTypeRecipe, OperationKind, OperationRecord, TypographyKind, TypographyRecipe } from '../../domain/document';
import type { ImageAnalysis } from '../../domain/composition';
import { IMAGE_TYPE_KINDS } from '../../engine/imageType';
import { OPERATION_KINDS } from '../../engine/operations';
import { TYPOGRAPHY_KINDS } from '../../engine/typography';

const DESCRIPTIONS: Record<OperationKind, string> = {
  WITHHOLD: 'Remove information and open the field.',
  FRACTURE: 'Separate image and type into displaced fragments.',
  COMPRESS: 'Pull elements into a denser relationship.',
  INTERRUPT: 'Break one alignment with a decisive rule.',
  ECHO: 'Repeat form at controlled offsets.',
  ERODE: 'Lose pieces of type and surface.',
  DISPLACE: 'Move image and title against one another.',
  INVERT: 'Exchange hierarchy and reverse the crop.',
  ACCIDENT: 'Break a rule in the language of the current system.',
};

const RELATION_DESCRIPTIONS: Record<ImageTypeKind, string> = {
  TYPE_MASK: 'Let the photograph exist only inside the letters.',
  TYPE_KNOCKOUT: 'Cut the title out of the photographic field.',
  IMAGE_SLICE: 'Separate the image into a shifting sequence of strips.',
  TYPE_SLICE: 'Dislocate sections of the title across its original frame.',
  OVERPRINT: 'Place type into the image as an active visual layer.',
  OCCLUSION: 'Let the image hide part of the title.',
  DISPLACEMENT: 'Disturb image strips where they meet the title.',
  EXTRACT_STRUCTURE: 'Use the photograph’s focus and quiet regions to direct the layout.',
};

const TYPOGRAPHY_DESCRIPTIONS: Record<TypographyKind, string> = {
  CHARACTER_DISPLACEMENT: 'Move individual characters away from their setting.',
  REPETITION: 'Repeat letterforms as registration ghosts.',
  VERTICAL_COMPRESSION: 'Press letterforms into a condensed vertical rhythm.',
  HORIZONTAL_STRETCH: 'Stretch the letters beyond the measured line.',
  LINE_FRAGMENTATION: 'Break the text into shifted groups.',
  TRACKING_DISTORTION: 'Replace even spacing with a seeded irregular cadence.',
  BASELINE_SHIFT: 'Make characters depart from a shared baseline.',
  GRID_SEPARATION: 'Distribute characters across the document grid.',
  TYPOGRAPHIC_MASK: 'Cut broad vector bands from the title.',
  PROCEDURAL_EROSION: 'Remove small seeded fragments of letterforms.',
};

export type DirectCategory = 'operation' | 'relation' | 'typography';

interface DirectControlsProps {
  category: DirectCategory;
  relationKind: ImageTypeKind;
  typographyKind: TypographyKind;
  readability: number;
  analysis?: ImageAnalysis;
  error: string;
  kind: OperationKind;
  intensity: number;
  seedText: string;
  canDirect: boolean;
  canRelate: (recipe: ImageTypeRecipe) => boolean;
  canTypography: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasDirectBase: boolean;
  previewing: boolean;
  onKindChange: (kind: OperationKind) => void;
  onCategoryChange: (category: DirectCategory) => void;
  onRelationChange: (kind: ImageTypeKind) => void;
  onTypographyChange: (kind: TypographyKind) => void;
  onReadabilityChange: (value: number) => void;
  onIntensityChange: (intensity: number) => void;
  onSeedChange: (text: string) => void;
  onPreview: () => void;
  onApply: (recipe: OperationRecord) => void;
  onApplyRelation: (recipe: ImageTypeRecipe) => void;
  onApplyTypography: (recipe: TypographyRecipe) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
}

export function DirectControls({ category, relationKind, typographyKind, readability, analysis, error, kind, intensity, seedText, canDirect, canRelate, canTypography, canUndo, canRedo, hasDirectBase, previewing, onCategoryChange, onRelationChange, onTypographyChange, onReadabilityChange, onKindChange, onIntensityChange, onSeedChange, onPreview, onApply, onApplyRelation, onApplyTypography, onUndo, onRedo, onReset }: DirectControlsProps) {
  const seed = /^\d{1,6}$/.test(seedText) ? Number(seedText) : null;
  const relationRecipe = seed === null ? null : { kind: relationKind, intensity, seed };
  const canApply = category === 'operation' ? canDirect : category === 'relation' ? !!relationRecipe && canRelate(relationRecipe) : canTypography;
  return (
    <section className="controls-panel direct-controls" aria-label="Direct controls">
      <div className="panel-heading"><h2>Direct the study</h2><span className="panel-index mono">02</span></div>
      <div className="direct-category" role="group" aria-label="Direction method">
        <button type="button" aria-pressed={category === 'operation'} onClick={() => onCategoryChange('operation')}>OPERATIONS</button>
        <button type="button" aria-pressed={category === 'relation'} onClick={() => onCategoryChange('relation')}>IMAGE × TYPE</button>
        <button type="button" aria-pressed={category === 'typography'} onClick={() => onCategoryChange('typography')}>TYPE MATERIAL</button>
      </div>
      <p className="direct-control-intro">{category === 'operation' ? 'Choose a rule to disturb, then decide how far it goes.' : category === 'relation' ? 'Make image and typography act on one another.' : 'Treat letterforms as physical material. The result stays in the exported SVG.'}</p>
      <div className="direct-operation-list" role="group" aria-label="Creative operation">
        {category === 'operation'
          ? OPERATION_KINDS.map((option) => <button key={option} type="button" aria-pressed={kind === option} onClick={() => onKindChange(option)}>{option}</button>)
          : category === 'relation'
            ? IMAGE_TYPE_KINDS.map((option) => <button key={option} type="button" aria-pressed={relationKind === option} disabled={option === 'EXTRACT_STRUCTURE' && !analysis} onClick={() => onRelationChange(option)}>{option.replaceAll('_', ' ')}</button>)
            : TYPOGRAPHY_KINDS.map((option) => <button key={option} type="button" aria-pressed={typographyKind === option} onClick={() => onTypographyChange(option)}>{option.replaceAll('_', ' ')}</button>)}
      </div>
      <p className="direct-description">{category === 'operation' ? DESCRIPTIONS[kind] : category === 'relation' ? RELATION_DESCRIPTIONS[relationKind] : TYPOGRAPHY_DESCRIPTIONS[typographyKind]}</p>
      {category === 'relation' && <div className="direct-analysis mono" aria-label="Image analysis">
        {analysis
          ? <><span>IMAGE READ / LOCAL</span><span>CONTRAST {Math.round(analysis.contrast * 100)} · DETAIL {Math.round(analysis.edgeDensity * 100)}</span><span>FOCUS {Math.round(analysis.focalX * 100)}:{Math.round(analysis.focalY * 100)} · QUIET {Math.round(analysis.quietX * 100)}:{Math.round(analysis.quietY * 100)}</span></>
          : <span>Upload a photograph to activate EXTRACT STRUCTURE.</span>}
      </div>}
      <div className="direct-control-fields">
        {category === 'operation' && kind === 'ACCIDENT'
          ? <><span className="field-label">Severity</span><div className="accident-severity" role="group" aria-label="Accident severity">{[['LOW', .25], ['MEDIUM', .5], ['HIGH', .75], ['EXTREME', 1]].map(([label, value]) => <button key={label} type="button" aria-pressed={intensity === value} onClick={() => onIntensityChange(value as number)}>{label}</button>)}</div></>
          : <><label className="field-label" htmlFor="direct-intensity">Intensity <output className="mono">{Math.round(intensity * 100)}%</output></label><input id="direct-intensity" type="range" min="0.1" max="1" step="0.05" value={intensity} onChange={(event) => onIntensityChange(Number(event.target.value))} /></>}
        {category === 'typography' && <><label className="field-label" htmlFor="direct-readability">Readability <output className="mono">{Math.round(readability * 100)}%</output></label><input id="direct-readability" type="range" min="0" max="1" step="0.05" value={readability} onChange={(event) => onReadabilityChange(Number(event.target.value))} /></>}
        <label className="field-label" htmlFor="direct-seed">Seed</label>
        <input id="direct-seed" className="seed-input mono" inputMode="numeric" value={seedText} onChange={(event) => onSeedChange(event.target.value)} aria-invalid={seed === null} />
        <span className="field-help">Same source, method and seed reproduce the same result.</span>
      </div>
      <div className="direct-control-actions">
        <button type="button" className="tool-button" disabled={!canApply || seed === null} onClick={onPreview}>{previewing ? 'Refresh preview' : 'Preview'}</button>
        <button type="button" className="tool-button direct-apply" disabled={!canApply || seed === null} onClick={() => { if (seed === null) return; if (category === 'operation') onApply({ kind, intensity, seed }); else if (category === 'relation') onApplyRelation({ kind: relationKind, intensity, seed }); else onApplyTypography({ kind: typographyKind, intensity, readability, seed }); }}>Apply</button>
      </div>
      <div className="direct-history"><span className="mono">HISTORY</span><div><button type="button" className="tool-button" disabled={!canUndo} onClick={onUndo}>Undo</button><button type="button" className="tool-button" disabled={!canRedo} onClick={onRedo}>Redo</button><button type="button" className="tool-button" disabled={!hasDirectBase} onClick={onReset}>Reset</button></div></div>
      {error && <p className="field-help" role="alert">{error}</p>}
      {!canApply && <p className="field-help">{category === 'relation' && relationKind === 'EXTRACT_STRUCTURE' && !analysis ? 'Upload and generate with a photograph to enable this relationship.' : 'Generate changed source inputs or release the relevant locks to continue.'}</p>}
    </section>
  );
}
