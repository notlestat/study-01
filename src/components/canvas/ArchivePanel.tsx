import { useRef, useState } from 'react';
import type { SavedVariation } from '../../lib/variations';
import { archiveTags } from '../../engine/archive';
import { exportArchiveContactSheet } from '../../lib/exportArchive';
import { CompositionRenderer } from './CompositionRenderer';

interface ArchivePanelProps {
  items: SavedVariation[];
  focus: boolean;
  onToggleFocus: () => void;
  onReopen: (item: SavedVariation) => void;
  onBranch: (item: SavedVariation) => void;
  onDuplicate: (item: SavedVariation) => void;
  onDelete: (id: string) => void;
}

export function ArchivePanel({ items, focus, onToggleFocus, onReopen, onBranch, onDuplicate, onDelete }: ArchivePanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const refs = useRef(new Map<string, SVGSVGElement>());
  const selected = selectedIds.map((id) => items.find((item) => item.id === id)).filter((item): item is SavedVariation => !!item);
  const featured = selected.length ? selected : items.slice(0, 1);
  const inspected = selected.at(-1) ?? items[0];

  function toggle(id: string) {
    setDeleteArmed(false);
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current.slice(-1), id]);
  }

  async function contactSheet() {
    if (busy || !items.length) return;
    const artwork = new Map(refs.current);
    setBusy(true); setMessage('Preparing contact sheet…');
    try {
      const pages = await exportArchiveContactSheet(items, artwork, `study-01_archive_${new Date().toISOString().slice(0, 10)}`);
      setMessage(pages === 1 ? 'Contact sheet SVG downloaded' : `${pages} contact sheet pages downloaded as ZIP`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Contact sheet export failed.'); }
    finally { setBusy(false); }
  }

  return <section className="canvas-panel archive-panel" aria-label="Saved study archive">
    <div className="canvas-toolbar"><div><h2>Archive</h2><p className="proof-intro">{items.length} visible studies / select two to compare</p></div><button type="button" className="tool-button" aria-pressed={focus} onClick={onToggleFocus}>{focus ? 'Exit focus' : 'Focus'}</button></div>
    {!items.length ? <div className="proof-empty"><p>No studies match this view.</p><span className="mono">SAVE A VARIATION OR CHANGE FILTERS</span></div> : <div className="archive-body">
      <div className={`archive-featured${featured.length === 2 ? ' is-comparing' : ''}`}>{featured.map((item, index) => <div className="archive-large" key={item.id} style={{ '--archive-ratio': item.document.width / item.document.height } as React.CSSProperties}><div className="composition-paper" style={{ aspectRatio: `${item.document.width} / ${item.document.height}` }}><CompositionRenderer document={item.document} /></div><span className="mono">{featured.length === 2 ? index === 0 ? 'A / ' : 'B / ' : ''}{item.document.system} / {String(item.document.seed).padStart(6, '0')} / {item.document.width}×{item.document.height}</span></div>)}</div>
      <div className="archive-inspector"><span className="mono">STUDY RECORD</span>{inspected && <><dl><div><dt>DATE</dt><dd>{new Date(inspected.createdAt).toLocaleDateString()}</dd></div><div><dt>SYSTEM</dt><dd>{inspected.document.system}</dd></div><div><dt>SEED</dt><dd>{String(inspected.document.seed).padStart(6, '0')}</dd></div><div><dt>GENERATION</dt><dd>{inspected.document.lineage?.generation ?? 0}</dd></div><div><dt>OPERATIONS</dt><dd>{archiveTags(inspected.document).join(' / ').replaceAll('_', ' ')}</dd></div><div><dt>SOURCE</dt><dd>{inspected.document.source.image?.name ?? 'None'}</dd></div></dl><div className="archive-study-actions"><button type="button" className="tool-button direct-apply" onClick={() => onReopen(inspected)}>Reopen</button><button type="button" className="tool-button" onClick={() => onBranch(inspected)}>Branch</button><button type="button" className="tool-button" onClick={() => onDuplicate(inspected)}>Duplicate</button>{deleteArmed ? <><button type="button" className="tool-button" onClick={() => { onDelete(inspected.id); setDeleteArmed(false); setSelectedIds((current) => current.filter((id) => id !== inspected.id)); }}>Confirm delete</button><button type="button" className="tool-button" onClick={() => setDeleteArmed(false)}>Cancel</button></> : <button type="button" className="tool-button" onClick={() => setDeleteArmed(true)}>Delete</button>}</div></>}</div>
      <div className="archive-gallery" aria-label="Archive studies">{items.map((item) => <button type="button" key={item.id} className="archive-card" aria-pressed={selectedIds.includes(item.id)} onClick={() => toggle(item.id)}><span className="composition-paper" style={{ aspectRatio: `${item.document.width} / ${item.document.height}` }}><CompositionRenderer document={item.document} svgRef={(node) => { if (node) refs.current.set(item.id, node); else refs.current.delete(item.id); }} /></span><span className="mono">{item.document.system} / {String(item.document.seed).padStart(6, '0')}</span><span className="mono archive-card-date">{new Date(item.createdAt).toLocaleDateString()}</span></button>)}</div>
      <div className="archive-export"><button type="button" className="tool-button" disabled={busy} onClick={contactSheet}>Export contact sheet</button><span className="mono" role="status">{message || 'SVG / ALL VISIBLE STUDIES'}</span></div>
    </div>}
  </section>;
}
