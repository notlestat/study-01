import type { SystemId } from '../../domain/composition';
import { SYSTEMS } from '../../domain/systems';

interface SystemSelectorProps { value: SystemId; onChange: (system: SystemId) => void; }

function SystemDiagram({ system }: { system: SystemId }) {
  return (
    <svg className="system-diagram" viewBox="0 0 40 40" aria-hidden="true">
      {system === 'ORDER' && [9, 18, 27].flatMap((x) => [9, 18, 27].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill="currentColor" />))}
      {system === 'SILENCE' && <rect x="18" y="18" width="4" height="4" fill="currentColor" />}
      {system === 'TENSION' && <><path d="M9 29 29 9" stroke="currentColor" strokeWidth="1" /><rect x="6" y="26" width="6" height="6" fill="currentColor" /><rect x="27" y="6" width="6" height="6" fill="currentColor" /></>}
    </svg>
  );
}

export function SystemSelector({ value, onChange }: SystemSelectorProps) {
  const selected = SYSTEMS.find((system) => system.id === value)!;
  return (
    <fieldset className="system-selector" aria-describedby="system-description">
      <legend className="section-label mono">System</legend>
      <div className="system-options">
        {SYSTEMS.map((system) => (
          <label className={`system-option${value === system.id ? ' is-selected' : ''}`} key={system.id}>
            <input type="radio" name="system" value={system.id} checked={value === system.id} onChange={() => onChange(system.id)} aria-description={system.description} />
            <SystemDiagram system={system.id} />
            <span className="system-name mono">{system.id}</span>
            <span className="selection-mark" aria-hidden="true" />
          </label>
        ))}
      </div>
      <p className="system-description" id="system-description">{selected.description}</p>
    </fieldset>
  );
}
