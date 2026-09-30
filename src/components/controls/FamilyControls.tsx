import type { CompositionDocument, FamilyFormat } from '../../domain/document';
import { FAMILY_FORMATS, FAMILY_SIZES } from '../../engine/family';

interface FamilyControlsProps { document: CompositionDocument; family: CompositionDocument[]; selected: FamilyFormat; error: string; onGenerate: () => void; onSelect: (format: FamilyFormat) => void; }

export function FamilyControls({ document, family, selected, error, onGenerate, onSelect }: FamilyControlsProps) {
  return <section className="controls-panel family-controls" aria-label="Visual family controls">
    <div className="panel-heading"><h2>Visual family</h2><span className="panel-index mono">05</span></div>
    <p className="direct-control-intro">One visual direction, recomposed for seven different surfaces. Image crop, title scale, material treatment, and the current system guide the family.</p>
    <div className="lineage-facts"><div><span>PARENT</span><strong>{document.system} / {String(document.seed).padStart(6, '0')}</strong></div><div><span>IMAGE</span><strong>{document.source.image?.name ?? 'NO IMAGE'}</strong></div><div><span>TYPE MATERIAL</span><strong>{document.typography?.at(-1)?.kind.replaceAll('_', ' ') ?? 'SOURCE'}</strong></div></div>
    <button type="button" className="tool-button direct-apply family-generate" disabled={!document.source.image} onClick={onGenerate}>{family.length ? 'Regenerate family' : 'Create family'}</button>
    {error && <p className="field-help" role="alert">{error}</p>}
    {family.length > 0 && <div className="family-format-list" role="group" aria-label="Family formats">{FAMILY_FORMATS.map((format, index) => <button type="button" key={format} aria-pressed={selected === format} onClick={() => onSelect(format)}><span className="mono">{String(index + 1).padStart(2, '0')}</span><span>{format.replaceAll('_', ' ')}</span><span className="mono">{FAMILY_SIZES[format].join('×')}</span></button>)}</div>}
    <p className="field-help lineage-help">Develop any result in Compose to refine it further. Family exports use each format’s own dimensions.</p>
  </section>;
}
