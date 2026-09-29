import { LOCK_KEYS } from '../../domain/composition';
import type { CompositionLocks, LockKey } from '../../domain/composition';
import { Icon } from '../ui/Icon';

interface LockControlsProps { locks: CompositionLocks; onToggleLock: (key: LockKey) => void; onMutate: () => void; canMutate: boolean; }

export function LockControls({ locks, onToggleLock, onMutate, canMutate }: LockControlsProps) {
  const count = LOCK_KEYS.filter((key) => locks[key]).length;
  const descriptions: Record<LockKey, string> = {
    GRID: 'Keep positions and sizes fixed during mutation',
    TYPE: 'Keep title and metadata typography fixed during mutation',
    IMAGE: 'Keep the image frame and crop fixed during mutation',
    TEXTURE: 'Keep the pattern and its placement fixed during mutation',
  };
  return (
    <footer className="lock-bar">
      <div className="lock-intro"><span className="mono">Preserve</span><span className="lock-hint">Lock for future mutations</span></div>
      <div className="lock-toggles" role="group" aria-label="Composition locks">
        {LOCK_KEYS.map((key) => (
          <button className={`lock-toggle${locks[key] ? ' is-locked' : ''}`} key={key} type="button" aria-pressed={locks[key]} onClick={() => onToggleLock(key)} title={descriptions[key]}>
            <Icon name={locks[key] ? 'lock' : 'unlock'} size={14} /><span className="mono">{key}</span>
          </button>
        ))}
      </div>
      <span className="lock-count mono" role="status">{count}/4 LOCKED</span>
      <button className="mutate-button" type="button" disabled={!canMutate || count === 4} onClick={onMutate} title={count === 4 ? 'Unlock at least one part to mutate' : 'Generate another composition while preserving locked parts'}>Mutate <Icon name="arrow" size={16} /></button>
    </footer>
  );
}
