import type { SystemId } from '../../domain/composition';
import { Icon } from '../ui/Icon';

interface GenerationControlsProps {
  seed: string;
  system: SystemId;
  canGenerate: boolean;
  hasImage: boolean;
  loading: boolean;
  onSeedChange: (seed: string) => void;
  onGenerate: (nextSeed?: boolean) => void;
}

export function GenerationControls({ seed, system, canGenerate, hasImage, loading, onSeedChange, onGenerate }: GenerationControlsProps) {
  const seedValid = /^\d{1,6}$/.test(seed);
  const help = loading ? 'Reading your image…'
    : !hasImage ? 'Add an image or use the sample to generate.'
    : !seedValid ? 'Enter a whole number from 0 to 999999.'
    : 'Same inputs and seed, same composition.';

  return (
    <div className="generation-controls">
      <div className="seed-control">
        <label className="field-label" htmlFor="study-seed">Seed</label>
        <input id="study-seed" className="seed-input mono" type="text" inputMode="numeric" maxLength={6} value={seed} onChange={(event) => onSeedChange(event.target.value)} aria-invalid={!seedValid} aria-describedby="generation-help" />
        <button className="next-seed-button" type="button" disabled={!canGenerate} onClick={() => onGenerate(true)}>Next seed <Icon name="arrow" size={14} /></button>
      </div>
      <button className="generate-button" type="button" disabled={!canGenerate} onClick={() => onGenerate()}>Generate {system} <Icon name="arrow" size={16} /></button>
      <p className="field-help generation-help" id="generation-help">{help}</p>
    </div>
  );
}
