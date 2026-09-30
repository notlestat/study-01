import type { ArchiveFilter, ArchivePeriod } from '../../engine/archive';
import { SYSTEM_IDS } from '../../domain/composition';

interface ArchiveControlsProps { total: number; visible: number; filter: ArchiveFilter; operations: string[]; onChange: (filter: ArchiveFilter) => void; }

export function ArchiveControls({ total, visible, filter, operations, onChange }: ArchiveControlsProps) {
  const update = <K extends keyof ArchiveFilter>(key: K, value: ArchiveFilter[K]) => onChange({ ...filter, [key]: value });
  return <section className="controls-panel archive-controls" aria-label="Archive filters">
    <div className="panel-heading"><h2>Research archive</h2><span className="panel-index mono">08</span></div>
    <p className="direct-control-intro">Your saved studies, locally held. Filter and compare before reopening a direction.</p>
    <div className="archive-count mono"><strong>{String(visible).padStart(2, '0')}</strong><span>VISIBLE / {String(total).padStart(2, '0')} SAVED</span></div>
    <div className="archive-fields">
      <label className="field-label" htmlFor="archive-system">SYSTEM</label><select id="archive-system" value={filter.system} onChange={(event) => update('system', event.target.value as ArchiveFilter['system'])}><option value="ALL">ALL SYSTEMS</option>{SYSTEM_IDS.map((system) => <option key={system} value={system}>{system}</option>)}</select>
      <label className="field-label" htmlFor="archive-operation">OPERATION</label><select id="archive-operation" value={filter.operation} onChange={(event) => update('operation', event.target.value)}><option value="ALL">ALL OPERATIONS</option>{operations.map((operation) => <option key={operation} value={operation}>{operation.replaceAll('_', ' ')}</option>)}</select>
      <label className="field-label" htmlFor="archive-period">DATE</label><select id="archive-period" value={filter.period} onChange={(event) => update('period', event.target.value as ArchivePeriod)}><option value="ALL">ALL DATES</option><option value="TODAY">TODAY</option><option value="7_DAYS">LAST 7 DAYS</option><option value="30_DAYS">LAST 30 DAYS</option></select>
      <label className="field-label" htmlFor="archive-order">ORDER</label><select id="archive-order" value={filter.order} onChange={(event) => update('order', event.target.value as ArchiveFilter['order'])}><option value="NEWEST">NEWEST FIRST</option><option value="OLDEST">OLDEST FIRST</option></select>
    </div>
    <p className="field-help lineage-help">The archive stays in this browser. Export a contact sheet to keep an external record.</p>
  </section>;
}
