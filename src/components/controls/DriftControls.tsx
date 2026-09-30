import type { CompositionDocument, DriftDirection, DriftMode, DriftRecipe } from '../../domain/document';
import { DRIFT_DIRECTIONS, DRIFT_MODES } from '../../engine/drift';

interface DriftControlsProps {
  document: CompositionDocument;
  recipe: DriftRecipe;
  onChange: (recipe: DriftRecipe) => void;
  onAttach: () => void;
}

const descriptions: Record<DriftMode, string> = {
  SLIP: 'Grid and image bands move against the typography.',
  DECAY: 'The image loses continuity, exposure and material.',
  REPEAT: 'Type compounds across the page while the image contracts.',
};

export function DriftControls({ document, recipe, onChange, onAttach }: DriftControlsProps) {
  const update = <K extends keyof DriftRecipe>(key: K, value: DriftRecipe[K]) => onChange({ ...recipe, [key]: value });
  return <section className="controls-panel drift-controls" aria-label="Motion controls">
    <div className="panel-heading"><h2>Temporal composition</h2><span className="panel-index mono">06</span></div>
    <p className="direct-control-intro">Time alters the artwork's structure. These are three different motion rules, not entrance effects.</p>
    <div className="drift-mode-list" role="group" aria-label="Motion structure">{DRIFT_MODES.map((mode) => <button type="button" key={mode} aria-pressed={recipe.mode === mode} onClick={() => update('mode', mode)}>{mode}</button>)}</div>
    <p className="direct-description">{descriptions[recipe.mode]}</p>
    <div className="drift-fields">
      <label className="field-label" htmlFor="drift-duration">DURATION <span>{recipe.duration.toFixed(1)} S</span></label>
      <input id="drift-duration" type="range" min="1" max="12" step=".5" value={recipe.duration} onChange={(event) => update('duration', Number(event.target.value))} />
      <label className="field-label" htmlFor="drift-speed">SPEED <span>{recipe.speed.toFixed(2)}×</span></label>
      <input id="drift-speed" type="range" min=".25" max="3" step=".05" value={recipe.speed} onChange={(event) => update('speed', Number(event.target.value))} />
      <label className="field-label" htmlFor="drift-intensity">INTENSITY <span>{Math.round(recipe.intensity * 100)}%</span></label>
      <input id="drift-intensity" type="range" min="0" max="100" step="1" value={Math.round(recipe.intensity * 100)} onChange={(event) => update('intensity', Number(event.target.value) / 100)} />
      <label className="field-label" htmlFor="drift-direction">DIRECTION</label>
      <select id="drift-direction" value={recipe.direction} onChange={(event) => update('direction', event.target.value as DriftDirection)}>{DRIFT_DIRECTIONS.map((direction) => <option key={direction} value={direction}>{direction}</option>)}</select>
      <label className="field-label" htmlFor="drift-seed">SEED</label>
      <input id="drift-seed" type="number" min="0" max="999999" step="1" value={recipe.seed} onChange={(event) => update('seed', Math.max(0, Math.min(999999, Number(event.target.value) || 0)))} />
      <label className="drift-loop"><input type="checkbox" checked={recipe.loop} onChange={(event) => update('loop', event.target.checked)} /> <span>Controlled loop</span></label>
    </div>
    <button type="button" className="tool-button direct-apply drift-attach" onClick={onAttach}>Attach motion to study</button>
    <p className="field-help lineage-help">{document.drift ? 'This study has a saved motion recipe. Attach changes to update it.' : 'Attach to save this motion recipe with the study. The still composition stays intact.'}</p>
  </section>;
}
