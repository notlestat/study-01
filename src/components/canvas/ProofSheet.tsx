import { useRef, useState } from 'react';
import type { ProofStudy } from '../../app/useStudySession';
import { PROOF_SIZES } from '../../engine/proof';
import type { ProofSize } from '../../engine/proof';
import { exportArchiveContactSheet } from '../../lib/exportArchive';
import { CompositionRenderer } from './CompositionRenderer';

interface ProofSheetProps {
  proofs: ProofStudy[];
  selectedIds: Set<string>;
  canProof: boolean;
  storageReady: boolean;
  saving: boolean;
  focus: boolean;
  onToggleFocus: () => void;
  onGenerate: (size: ProofSize) => void;
  onSelect: (id: string) => void;
  onKeep: (id: string) => void;
  onReject: (id: string) => void;
  onDevelop: (id: string) => void;
}

export function ProofSheet({ proofs, selectedIds, canProof, storageReady, saving, focus, onToggleFocus, onGenerate, onSelect, onKeep, onReject, onDevelop }: ProofSheetProps) {
  const refs = useRef(new Map<string, SVGSVGElement>());
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [size, setSize] = useState<ProofSize>(9);
  const [comparing, setComparing] = useState(false);
  const selected = proofs.filter((proof) => selectedIds.has(proof.id));
  const visible = comparing ? selected : proofs;
  async function exportSheet() {
    const artwork = new Map(refs.current);
    setExporting(true); setExportMessage('Preparing contact sheet…');
    try {
      await exportArchiveContactSheet(visible.map((item) => ({ ...item, createdAt: item.document.lineage?.createdAt ?? new Date().toISOString() })), artwork, 'study-01_proof');
      setExportMessage('Contact sheet downloaded');
    } catch (cause) { setExportMessage(cause instanceof Error ? cause.message : 'Export failed.'); }
    finally { setExporting(false); }
  }
  return (
    <section className="canvas-panel proof-panel" aria-label="Proof contact sheet">
      <div className="canvas-toolbar proof-toolbar">
        <div><h2>Proof</h2><p className="proof-intro">Study several directions from the current composition.</p></div>
        <div className="proof-toolbar-actions">
          <label className="sr-only" htmlFor="proof-count">Studies per proof</label>
          <select id="proof-count" className="proof-count mono" value={size} onChange={(event) => setSize(Number(event.target.value) as ProofSize)}>
            {PROOF_SIZES.map((count) => <option key={count} value={count}>{count} studies</option>)}
          </select>
          <button type="button" className="tool-button" disabled={!canProof} onClick={() => { setComparing(false); onGenerate(size); }}>Generate proof</button>
          <button type="button" className="tool-button" aria-pressed={focus} onClick={onToggleFocus}>{focus ? 'Exit focus' : 'Focus'}</button>
        </div>
      </div>
      <div className="proof-subbar"><button type="button" className="tool-button" disabled={exporting || !visible.length} onClick={exportSheet}>Export contact sheet</button><span className="mono" role="status">{exportMessage}</span>
        <span className="mono">{proofs.length} ACTIVE / {selectedIds.size} SELECTED</span>
        <button type="button" className="tool-button" disabled={selected.length < 2 && !comparing} onClick={() => setComparing((current) => !current)}>{comparing ? 'Contact sheet' : `Compare ${selected.length || ''}`}</button>
      </div>
      {proofs.length === 0 ? <div className="proof-empty"><p>Generate a proof to see related studies together.</p><span className="mono">Locks preserve selected parts across the sheet.</span></div> : (
        <div className={`proof-grid${comparing ? ' is-comparing' : ''}`}>
          {visible.map((proof) => (
            <article className={`proof-card${selectedIds.has(proof.id) ? ' is-selected' : ''}`} key={proof.id}>
              <label className="proof-select"><input type="checkbox" checked={selectedIds.has(proof.id)} onChange={() => onSelect(proof.id)} aria-label={`Select ${proof.document.system} seed ${proof.document.seed} for comparison`} /><span className="mono">{proof.document.system} / {String(proof.document.seed).padStart(6, '0')}</span></label>
              <div className="composition-paper" style={{ aspectRatio: `${proof.document.width} / ${proof.document.height}` }} aria-hidden="true"><CompositionRenderer document={proof.document} svgRef={(node) => { if (node) refs.current.set(proof.id, node); else refs.current.delete(proof.id); }} /></div>
              <div className="proof-card-actions">
                <button type="button" disabled={proof.kept || !storageReady || saving} onClick={() => onKeep(proof.id)}>{proof.kept ? 'Kept' : 'Keep'}</button>
                <button type="button" onClick={() => onReject(proof.id)}>Reject</button>
                <button type="button" onClick={() => { setComparing(false); onDevelop(proof.id); }}>Develop</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
