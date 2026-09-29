import type { CompositionInput, SystemId } from '../../domain/composition';
import { SystemSelector } from './SystemSelector';
import { ImageInput } from './ImageInput';
import { GenerationControls } from './GenerationControls';

interface ControlsPanelProps {
  input: CompositionInput;
  system: SystemId;
  onSelectSystem: (system: SystemId) => void;
  onUpdateInput: (field: 'title' | 'metadata', value: string) => void;
  seed: string;
  onSeedChange: (seed: string) => void;
  onGenerate: (nextSeed?: boolean) => void;
  canGenerate: boolean;
  imageLoading: boolean;
  error: string;
  onSelectImage: (file: File) => void;
  onRemoveImage: () => void;
  onUseSample: () => void;
}

export function ControlsPanel({ input, system, onSelectSystem, onUpdateInput, seed, onSeedChange, onGenerate, canGenerate, imageLoading, error, onSelectImage, onRemoveImage, onUseSample }: ControlsPanelProps) {
  return (
    <aside className="controls-panel" aria-label="Composition controls">
      <div className="panel-heading"><h2>Source material</h2><span className="mono panel-index">01</span></div>
      <div className="controls-content">
      <div className="source-fields">
        <ImageInput image={input.image} loading={imageLoading} onSelect={onSelectImage} onRemove={onRemoveImage} onUseSample={onUseSample} />
        <div className="text-control">
          <label className="field-label" htmlFor="study-title">Title</label>
          <textarea id="study-title" className="title-input" rows={2} maxLength={70} value={input.title} onChange={(event) => onUpdateInput('title', event.target.value)} placeholder="Give your study a title" spellCheck={false} />
        </div>
        <div className="text-control">
          <label className="field-label" htmlFor="study-metadata">Metadata</label>
          <textarea id="study-metadata" className="metadata-input mono" rows={3} maxLength={140} value={input.metadata} onChange={(event) => onUpdateInput('metadata', event.target.value)} placeholder="Context, date, edition…" spellCheck={false} />
        </div>
      </div>
      <SystemSelector value={system} onChange={onSelectSystem} />
      </div>
      <GenerationControls seed={seed} system={system} canGenerate={canGenerate} hasImage={!!input.image} loading={imageLoading} onSeedChange={onSeedChange} onGenerate={onGenerate} />
      {error && <p className="input-error" role="alert">{error}</p>}
    </aside>
  );
}
