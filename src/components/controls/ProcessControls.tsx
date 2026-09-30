import { useState } from 'react';
import type { PassKind, ProcessingPass } from '../../domain/document';
import { PASS_KINDS } from '../../processing/kinds';

interface Preset { name: string; passes: ProcessingPass[]; }
const PRESET_KEY = 'study-01:pass-presets';
function readPresets(): Preset[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PRESET_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item): item is Preset => !!item && typeof item.name === 'string' && Array.isArray(item.passes)) : [];
  }
  catch { return []; }
}

interface ProcessControlsProps {
  passes: ProcessingPass[];
  stage: number;
  busy: boolean;
  error: string;
  canProcess: boolean;
  hasProcessedImage: boolean;
  onChange: (passes: ProcessingPass[]) => void;
  onStageChange: (stage: number) => void;
  onApply: () => void;
  onRestore: () => void;
}

export function ProcessControls({ passes, stage, busy, error, canProcess, hasProcessedImage, onChange, onStageChange, onApply, onRestore }: ProcessControlsProps) {
  const [kind, setKind] = useState<PassKind>('XEROX');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetMessage, setPresetMessage] = useState('');
  const [presets, setPresets] = useState(readPresets);
  const selected = passes.find((pass) => pass.id === selectedId) ?? passes.at(-1);
  const selectedIndex = selected ? passes.findIndex((pass) => pass.id === selected.id) : -1;
  const update = (id: string, patch: Partial<ProcessingPass>) => onChange(passes.map((pass) => pass.id === id ? { ...pass, ...patch } : pass));
  const move = (from: number, by: number) => {
    const next = [...passes], to = from + by;
    if (to < 0 || to >= next.length) return;
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };
  const savePreset = () => {
    const name = presetName.trim();
    if (!name || !passes.length) return;
    const next = [{ name, passes: passes.map((pass) => ({ ...pass })) }, ...presets.filter((preset) => preset.name !== name)].slice(0, 12);
    try { localStorage.setItem(PRESET_KEY, JSON.stringify(next)); setPresets(next); setPresetName(''); setPresetMessage('Preset saved locally.'); }
    catch { setPresetMessage('The preset could not be saved. Browser storage may be unavailable.'); }
  };
  return (
    <section className="controls-panel process-controls" aria-label="PASS controls">
      <div className="panel-heading"><h2>PASS / reproduction</h2><span className="panel-index mono">03</span></div>
      <p className="direct-control-intro">Every pass consumes the image left by the pass before it.</p>
      <div className="process-add">
        <label className="field-label" htmlFor="process-kind">Add a pass</label>
        <select id="process-kind" value={kind} onChange={(event) => setKind(event.target.value as PassKind)}>{PASS_KINDS.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select>
        <button type="button" className="tool-button" disabled={!canProcess} onClick={() => { const pass = { id: crypto.randomUUID(), kind, amount: .65, seed: passes.length + 1, enabled: true }; onChange([...passes, pass]); setSelectedId(pass.id); }}>+ Add</button>
      </div>
      <div className="process-stack" aria-label="Processing stack">
        <span className="mono process-overline">STACK / {passes.length.toString().padStart(2, '0')} PASSES</span>
        {passes.length === 0 ? <p className="field-help">Add a pass to begin a material sequence.</p> : passes.map((pass, index) => <button key={pass.id} type="button" className="process-pass" aria-pressed={selected?.id === pass.id} onClick={() => setSelectedId(pass.id)}><span className="mono">{String(index + 1).padStart(2, '0')}</span><span>{pass.kind.replaceAll('_', ' ')}</span><span className="mono">{pass.enabled ? `${Math.round(pass.amount * 100)}%` : 'OFF'}</span></button>)}
      </div>
      {selected && <div className="process-edit">
        <span className="mono process-overline">EDIT / {selected.kind.replaceAll('_', ' ')}</span>
        <label className="field-label" htmlFor="pass-amount">Amount <output className="mono">{Math.round(selected.amount * 100)}%</output></label>
        <input id="pass-amount" type="range" min="0" max="1" step="0.05" value={selected.amount} onChange={(event) => update(selected.id, { amount: Number(event.target.value) })} />
        <label className="field-label" htmlFor="pass-seed">Seed</label>
        <input id="pass-seed" className="seed-input mono" inputMode="numeric" value={selected.seed} onChange={(event) => { if (/^\d{0,6}$/.test(event.target.value)) update(selected.id, { seed: Number(event.target.value) || 0 }); }} />
        <div className="process-edit-actions"><button type="button" className="tool-button" onClick={() => update(selected.id, { enabled: !selected.enabled })}>{selected.enabled ? 'Disable' : 'Enable'}</button><button type="button" className="tool-button" aria-label="Move pass earlier" title="Move pass earlier" disabled={selectedIndex === 0} onClick={() => move(selectedIndex, -1)}>↑</button><button type="button" className="tool-button" aria-label="Move pass later" title="Move pass later" disabled={selectedIndex === passes.length - 1} onClick={() => move(selectedIndex, 1)}>↓</button><button type="button" className="tool-button" onClick={() => { onChange(passes.filter((pass) => pass.id !== selected.id)); setSelectedId(null); }}>Remove</button></div>
      </div>}
      <div className="process-stage"><label className="field-label" htmlFor="pass-stage">View stage <output className="mono">{stage} / {passes.length}</output></label><input id="pass-stage" type="range" min="0" max={passes.length} step="1" value={Math.min(stage, passes.length)} onChange={(event) => onStageChange(Number(event.target.value))} /><button className="tool-button" type="button" disabled={stage === 0} onClick={() => onStageChange(stage - 1)}>Previous stage</button></div>
      <div className="process-commit"><button className="tool-button direct-apply" type="button" disabled={!canProcess || busy || !!error || stage === 0} onClick={onApply}>{busy ? 'Processing…' : `Apply stage ${stage}`}</button><button className="tool-button" type="button" disabled={!hasProcessedImage || !canProcess} onClick={onRestore}>Restore original</button></div>
      {error && <p className="field-help" role="alert">{error}</p>}
      {!canProcess && <p className="field-help">Generate changed inputs or release the IMAGE lock to process.</p>}
      <div className="process-presets"><span className="mono process-overline">PRESETS / LOCAL</span><div><input className="seed-input" value={presetName} maxLength={32} onChange={(event) => setPresetName(event.target.value)} placeholder="Stack name" aria-label="Stack name" /><button type="button" className="tool-button" disabled={!presetName.trim() || !passes.length} onClick={savePreset}>Save</button></div><p className="field-help" role="status">{presetMessage}</p>{presets.map((preset) => <button type="button" key={preset.name} className="process-preset" onClick={() => onChange(preset.passes.map((pass) => ({ ...pass, id: crypto.randomUUID() })))}>{preset.name}<span className="mono">{preset.passes.length} PASSES</span></button>)}</div>
    </section>
  );
}
