import type { ColourMode, ColourRecipe, CompositionDocument } from '../../domain/document';
import { COLOUR_MODES, resolveColour, withColour } from '../../engine/colour';

interface ColourControlsProps { document: CompositionDocument; recipe: ColourRecipe; onChange: (recipe: ColourRecipe) => void; onApply: () => void; }
const descriptions: Record<ColourMode, string> = {
  MONOCHROME: 'Original paper, black type and unaltered image.',
  DUOTONE: 'Two tonal endpoints constrain image and type.',
  TRITONE: 'A third ink adds a controlled middle register.',
  EXTRACTED_PALETTE: 'The uploaded image supplies all three colour anchors.',
  INK_SYSTEM: 'A restrained ink impression with channel misregistration.',
};

export function ColourControls({ document, recipe, onChange, onApply }: ColourControlsProps) {
  const update = <K extends keyof ColourRecipe>(key: K, value: ColourRecipe[K]) => onChange({ ...recipe, [key]: value });
  const palette = resolveColour(withColour(document, recipe));
  return <section className="controls-panel colour-controls" aria-label="Artwork colour controls">
    <div className="panel-heading"><h2>Artwork colour</h2><span className="panel-index mono">07</span></div>
    <p className="direct-control-intro">The instrument stays neutral. Colour belongs to the artwork and follows its image.</p>
    <div className="colour-mode-list" role="group" aria-label="Colour system">{COLOUR_MODES.map((mode) => <button type="button" key={mode} aria-pressed={recipe.mode === mode} disabled={mode === 'EXTRACTED_PALETTE' && !document.source.image?.analysis?.palette} onClick={() => update('mode', mode)}>{mode.replaceAll('_', ' ')}</button>)}</div>
    <p className="direct-description">{descriptions[recipe.mode]}</p>
    <div className="colour-swatches" aria-label="Artwork palette"><span style={{ background: palette.ink }} title="Ink" /><span style={{ background: palette.stops[1] }} title="Middle tone" /><span style={{ background: palette.stops[2] }} title="Light tone" /><span style={{ background: palette.paper }} title="Paper" /></div>
    <div className="colour-fields">
      <label className="field-label" htmlFor="colour-strength">STRENGTH <span>{Math.round(recipe.intensity * 100)}%</span></label><input id="colour-strength" type="range" min="0" max="100" value={Math.round(recipe.intensity * 100)} onChange={(event) => update('intensity', Number(event.target.value) / 100)} />
      <label className="field-label" htmlFor="colour-registration">MISREGISTRATION <span>{Math.round(recipe.registration * 100)}%</span></label><input id="colour-registration" type="range" min="0" max="100" value={Math.round(recipe.registration * 100)} onChange={(event) => update('registration', Number(event.target.value) / 100)} />
      <label className="field-label" htmlFor="colour-seed">SEED</label><input id="colour-seed" type="number" min="0" max="999999" step="1" value={recipe.seed} onChange={(event) => update('seed', Math.max(0, Math.min(999999, Number(event.target.value) || 0)))} />
    </div>
    <button type="button" className="tool-button direct-apply colour-apply" onClick={onApply}>Apply colour to study</button>
    <p className="field-help lineage-help">Image-derived colour uses a local 64×64 sample. Nothing is uploaded.</p>
  </section>;
}
