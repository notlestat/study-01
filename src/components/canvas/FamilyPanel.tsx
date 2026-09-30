import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CompositionDocument, FamilyFormat } from '../../domain/document';
import { exportComposition } from '../../lib/exportComposition';
import type { ExportFormat } from '../../lib/exportComposition';
import { exportFamilyArchive } from '../../lib/exportFamily';
import { CompositionRenderer } from './CompositionRenderer';

interface FamilyPanelProps { family: CompositionDocument[]; selected: FamilyFormat; focus: boolean; onToggleFocus: () => void; onSelect: (format: FamilyFormat) => void; onDevelop: (document: CompositionDocument) => void; }

export function FamilyPanel({ family, selected, focus, onToggleFocus, onSelect, onDevelop }: FamilyPanelProps) {
  const selectedRef = useRef<SVGSVGElement>(null);
  const thumbnailRefs = useRef(new Map<FamilyFormat, SVGSVGElement>());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const document = family.find((item) => item.familyAsset?.format === selected);

  async function exportSelected(format: ExportFormat) {
    if (!document || !selectedRef.current || busy) return;
    setBusy(true); setMessage('Preparing artwork…');
    try {
      await exportComposition(selectedRef.current, format, `study-01_${document.system.toLowerCase()}_${selected.toLowerCase()}_${String(document.seed).padStart(6, '0')}`);
      setMessage(`${format.toUpperCase()} downloaded`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Export failed.'); }
    finally { setBusy(false); }
  }

  async function exportBatch() {
    if (!document || busy) return;
    // React reattaches callback refs on the busy-state render. Export a stable
    // snapshot so the asynchronous SVG embedding never iterates a changing Map.
    const artwork = new Map(thumbnailRefs.current);
    setBusy(true); setMessage('Preparing family…');
    try {
      await exportFamilyArchive(artwork, `study-01_${document.system.toLowerCase()}_${String(document.seed).padStart(6, '0')}`);
      setMessage('Seven SVGs downloaded as ZIP');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Batch export failed.'); }
    finally { setBusy(false); }
  }

  return <section className="canvas-panel family-panel" aria-label="Visual family">
    <div className="canvas-toolbar"><div><h2>Family</h2><p className="proof-intro">{document ? `${family.length} formats / ${selected.replaceAll('_', ' ')} / ${document.width}×${document.height}` : 'Generate a format family from the current study.'}</p></div><button type="button" className="tool-button" aria-pressed={focus} onClick={onToggleFocus}>{focus ? 'Exit focus' : 'Focus'}</button></div>
    {!document ? <div className="proof-empty"><p>No family generated.</p><span className="mono">CREATE FAMILY IN THE LEFT PANEL</span></div>
      : <div className="family-body">
        <div className="family-featured"><div className="family-main-art" style={{ aspectRatio: `${document.width} / ${document.height}`, '--family-max-width': `${Math.min(445, 405 * document.width / document.height)}px` } as CSSProperties}><CompositionRenderer document={document} svgRef={selectedRef} /></div><div className="family-featured-caption mono"><span>{document.system} / {selected.replaceAll('_', ' ')}</span><span>{document.width}×{document.height}</span></div></div>
        <div className="family-samples" aria-label="Family studies">{family.map((item) => {
          const format = item.familyAsset!.format;
          return <button type="button" className="family-sample" aria-pressed={selected === format} key={format} onClick={() => onSelect(format)}><span className="family-sample-art" style={{ aspectRatio: `${item.width} / ${item.height}` }}><CompositionRenderer document={item} svgRef={(node) => { if (node) thumbnailRefs.current.set(format, node); else thumbnailRefs.current.delete(format); }} /></span><span className="mono">{format.replaceAll('_', ' ')}</span></button>;
        })}</div>
        <div className="family-actions"><button type="button" className="tool-button direct-apply" onClick={() => onDevelop(document)}>Develop selected</button><button type="button" className="tool-button" disabled={busy} onClick={() => exportSelected('png')}>PNG</button><button type="button" className="tool-button" disabled={busy} onClick={() => exportSelected('svg')}>SVG</button><button type="button" className="tool-button" disabled={busy} onClick={exportBatch}>Batch SVG ZIP</button></div>
        {message && <p className="family-message mono" role="status">{message}</p>}
      </div>}
  </section>;
}
