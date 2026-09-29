import { LOCK_KEYS } from '../../domain/composition';
import type { CompositionLocks, LockKey } from '../../domain/composition';
import { Icon } from '../ui/Icon';

interface LockControlsProps { locks: CompositionLocks; onToggleLock: (key: LockKey) => void; }

export function LockControls({ locks, onToggleLock }: LockControlsProps) {
  const count = LOCK_KEYS.filter((key) => locks[key]).length;
  return (
    <footer className="lock-bar">
      <div className="lock-intro"><span className="mono">Preserve</span><span className="lock-hint">Lock for future mutations</span></div>
      <div className="lock-toggles" role="group" aria-label="Composition locks">
        {LOCK_KEYS.map((key) => (
          <button className={`lock-toggle${locks[key] ? ' is-locked' : ''}`} key={key} aria-pressed={locks[key]} onClick={() => onToggleLock(key)} title={`Keep ${key.toLowerCase()} fixed during future mutations`}>
            <Icon name={locks[key] ? 'lock' : 'unlock'} size={14} /><span className="mono">{key}</span>
          </button>
        ))}
      </div>
      <span className="lock-count mono" role="status">{count}/4 LOCKED</span>
      <button className="mutate-button" disabled title="Mutation will be available in a later phase">Mutate <Icon name="arrow" size={16} /></button>
    </footer>
  );
}
