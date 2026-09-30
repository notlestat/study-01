import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CompositionDocument } from '../../domain/document';
import type { SavedVariation } from '../../lib/variations';
import { CompositionRenderer } from './CompositionRenderer';
import { crossbreedCompositions } from '../../engine/crossbreed';

interface LineagePanelProps { document: CompositionDocument; history: CompositionDocument[]; variations: SavedVariation[]; onDevelop: (document: CompositionDocument) => void; onCrossbreed: (base: CompositionDocument, donor: CompositionDocument, donorWeight: number) => void; focus: boolean; onToggleFocus: () => void; }

function lineageOrder(documents: CompositionDocument[]): CompositionDocument[] {
  const byId = new Map(documents.map((document) => [document.lineage?.id, document]));
  const children = new Map<string, CompositionDocument[]>();
  for (const document of documents) {
    const parent = document.lineage?.parentIds[0];
    if (!parent) continue;
    children.set(parent, [...(children.get(parent) ?? []), document]);
  }
  const sort = (a: CompositionDocument, b: CompositionDocument) => (a.lineage?.createdAt ?? '').localeCompare(b.lineage?.createdAt ?? '');
  const roots = documents.filter((document) => !document.lineage?.parentIds[0] || !byId.has(document.lineage.parentIds[0])).sort(sort);
  const ordered: CompositionDocument[] = [], visited = new Set<string>();
  const visit = (document: CompositionDocument) => {
    const id = document.lineage?.id;
    if (!id || visited.has(id)) return;
    visited.add(id); ordered.push(document);
    for (const child of (children.get(id) ?? []).sort(sort)) visit(child);
  };
  roots.forEach(visit);
  documents.filter((document) => !visited.has(document.lineage?.id ?? '')).sort(sort).forEach(visit);
  return ordered;
}

export function LineagePanel({ document, history, variations, onDevelop, onCrossbreed, focus, onToggleFocus }: LineagePanelProps) {
  const nodes = useMemo(() => {
    const byId = new Map<string, CompositionDocument>();
    for (const item of [...history, ...variations.map((variation) => variation.document), document]) if (item.lineage) byId.set(item.lineage.id, item);
    return lineageOrder([...byId.values()]);
  }, [document, history, variations]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [donorWeight, setDonorWeight] = useState(.65);
  const selected = nodes.find((node) => node.lineage?.id === selectedId) ?? document;
  const compared = compareIds.map((id) => nodes.find((node) => node.lineage?.id === id)).filter((item): item is CompositionDocument => !!item);
  const displayed = compared.length === 2 ? compared : [selected];
  const hybrid = useMemo(() => {
    if (compared.length !== 2) return null;
    try { return crossbreedCompositions(compared[0], compared[1], donorWeight); }
    catch { return null; }
  }, [compared[0], compared[1], donorWeight]);
  const savedIds = new Set(variations.map((variation) => variation.document.lineage?.id));
  const toggleCompare = (id: string) => setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current.slice(-1), id]);
  return <section className="canvas-panel lineage-panel" aria-label="Composition lineage">
    <div className="canvas-toolbar"><div><h2>Lineage</h2><p className="proof-intro">{nodes.length} studies in view / choose two to compare and crossbreed, or develop an earlier branch.</p></div><button type="button" className="tool-button" aria-pressed={focus} onClick={onToggleFocus}>{focus ? 'Exit focus' : 'Focus'}</button></div>
    <div className="lineage-body">
      <div className={`lineage-featured${displayed.length === 2 ? ' is-comparing' : ''}`}>
        {displayed.map((item, index) => <div className="lineage-artwork" key={item.lineage?.id ?? item.seed}><div className="composition-paper" style={{ aspectRatio: `${item.width} / ${item.height}` }}><CompositionRenderer document={item} /></div><div className="lineage-artwork-caption mono"><span>{displayed.length === 2 ? index === 0 ? 'A / IMAGE + GRID' : 'B / TYPE' : `${item.system} / ${String(item.seed).padStart(6, '0')}`}</span><span>GEN {String(item.lineage?.generation ?? 0).padStart(2, '0')}</span></div></div>)}
        {hybrid && <div className="lineage-crossbreed"><div className="lineage-crossbreed-heading mono"><span>HYBRID PREVIEW</span><span>{Math.round(donorWeight * 100)}% B</span></div><div className="lineage-artwork hybrid-artwork"><div className="composition-paper" style={{ aspectRatio: `${hybrid.width} / ${hybrid.height}` }}><CompositionRenderer document={hybrid} /></div></div><label className="lineage-weight mono" htmlFor="crossbreed-weight">TYPE INFLUENCE <input id="crossbreed-weight" type="range" min="0" max="100" value={Math.round(donorWeight * 100)} onChange={(event) => setDonorWeight(Number(event.target.value) / 100)} /><span>{Math.round(donorWeight * 100)}%</span></label><button type="button" className="tool-button direct-apply" onClick={() => onCrossbreed(compared[0], compared[1], donorWeight)}>Crossbreed studies</button></div>}
        {displayed.length === 1 && <div className="lineage-inspector"><div><span>METHOD</span><strong>{selected.lineage?.event.replaceAll('_', ' ') ?? 'ROOT'}</strong></div><div><span>PARENTS</span><strong>{selected.lineage?.parentIds.map((id) => id.slice(0, 8)).join(' + ') || 'SOURCE'}</strong></div><div><span>OPERATIONS</span><strong>{selected.operations?.map((operation) => operation.kind).join(' / ') || '—'}</strong></div><div><span>PASS</span><strong>{selected.processing?.passes.map((pass) => pass.kind).join(' / ') || '—'}</strong></div><div><span>LOCKS</span><strong>{Object.entries(selected.lineage?.locks ?? {}).filter(([, held]) => held).map(([key]) => key).join(' / ') || 'NONE'}</strong></div><button type="button" className="tool-button direct-apply" onClick={() => onDevelop(selected)}>Develop this direction</button></div>}
      </div>
      <div className="lineage-tree" aria-label="Generation tree">
        <div className="lineage-tree-heading mono">GENERATION TREE <span>{compareIds.length} / 2 COMPARED</span></div>
        {nodes.map((item) => {
          const id = item.lineage?.id ?? '';
          return <div className="lineage-node" key={id} style={{ '--lineage-depth': Math.min(item.lineage?.generation ?? 0, 7) } as CSSProperties}>
            <button type="button" className="lineage-node-select" aria-pressed={selected.lineage?.id === id && compared.length !== 2} onClick={() => { setSelectedId(id); setCompareIds([]); }}><span className="mono">{String(item.lineage?.generation ?? 0).padStart(2, '0')}</span><span>{item.system} / {item.lineage?.event.replaceAll('_', ' ') ?? 'ROOT'}</span><span className="mono">{savedIds.has(id) ? 'SAVED' : item.lineage?.id === document.lineage?.id ? 'CURRENT' : ''}</span></button>
            <button type="button" className="lineage-compare" aria-pressed={compareIds.includes(id)} aria-label={`Compare ${item.system} generation ${item.lineage?.generation ?? 0}`} onClick={() => toggleCompare(id)}>◎</button>
          </div>;
        })}
      </div>
    </div>
  </section>;
}
