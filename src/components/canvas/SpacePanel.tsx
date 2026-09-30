import { useEffect, useState } from 'react';
import type { PointerEvent } from 'react';
import type { Box, CompositionDocument, SpaceZone } from '../../domain/document';
import { CompositionRenderer } from './CompositionRenderer';

type Shape = SpaceZone['shape'];
type Point = [number, number];
interface Draft { start: Point; end: Point; points: Point[]; }

function bounds(points: Point[]): Box {
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

interface SpacePanelProps {
  document: CompositionDocument;
  canSpace: boolean;
  error: string;
  focus: boolean;
  onToggleFocus: () => void;
  onApply: (zones: SpaceZone[]) => void;
}

export function SpacePanel({ document, canSpace, error, focus, onToggleFocus, onApply }: SpacePanelProps) {
  const [zones, setZones] = useState<SpaceZone[]>(() => document.spaceZones ?? []);
  const [shape, setShape] = useState<Shape>('rectangle');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => { setZones(document.spaceZones ?? []); }, [document.spaceZones]);
  const selected = zones.find((zone) => zone.id === selectedId);
  const display = { ...document, spaceZones: zones };

  function point(event: PointerEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return [Math.max(0, Math.min(document.width, (event.clientX - rect.left) / rect.width * document.width)), Math.max(0, Math.min(document.height, (event.clientY - rect.top) / rect.height * document.height))];
  }

  function begin(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const start = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft({ start, end: start, points: [start] });
    setSelectedId(null);
  }

  function extend(event: PointerEvent<SVGSVGElement>) {
    if (!draft) return;
    const end = point(event);
    setDraft((current) => {
      if (!current) return null;
      const last = current.points.at(-1)!;
      const points = shape === 'freeform' && Math.hypot(end[0] - last[0], end[1] - last[1]) > 14 ? [...current.points, end] : current.points;
      return { ...current, end, points };
    });
  }

  function finish(event: PointerEvent<SVGSVGElement>) {
    if (!draft) return;
    const end = point(event);
    const points = shape === 'freeform' ? [...draft.points, end] : [draft.start, end];
    const box = bounds(points);
    if (box.width >= 24 && box.height >= 24 && (shape !== 'freeform' || points.length >= 3)) {
      const zone: SpaceZone = { id: crypto.randomUUID(), shape, box, points: shape === 'freeform' ? points : undefined, locked: false };
      setZones((current) => [...current, zone]);
      setSelectedId(zone.id);
    }
    setDraft(null);
  }

  function updateSelected(field: keyof Box, value: number) {
    if (!selected || selected.locked || !Number.isFinite(value)) return;
    setZones((current) => current.map((zone) => {
      if (zone.id !== selected.id) return zone;
      const previous = zone.box;
      const proposed = { ...previous, [field]: value };
      const box: Box = {
        x: Math.max(0, Math.min(document.width - 12, proposed.x)),
        y: Math.max(0, Math.min(document.height - 12, proposed.y)),
        width: Math.max(12, Math.min(document.width - proposed.x, proposed.width)),
        height: Math.max(12, Math.min(document.height - proposed.y, proposed.height)),
      };
      box.x = Math.min(box.x, document.width - box.width);
      box.y = Math.min(box.y, document.height - box.height);
      const points = zone.points?.map(([x, y]): Point => [box.x + (x - previous.x) / previous.width * box.width, box.y + (y - previous.y) / previous.height * box.height]);
      return { ...zone, box, points };
    }));
  }

  return (
    <section className="canvas-panel space-panel" aria-label="Space exclusion zones">
      <div className="canvas-toolbar"><div><h2>Space</h2><p className="proof-intro">Draw where the composition cannot go.</p></div><button type="button" className="tool-button" aria-pressed={focus} onClick={onToggleFocus}>{focus ? 'Exit focus' : 'Focus'}</button></div>
      <div className="space-toolbar"><div role="group" aria-label="Zone shape">{(['rectangle', 'ellipse', 'freeform'] as Shape[]).map((option) => <button type="button" className="tool-button" aria-pressed={shape === option} key={option} onClick={() => setShape(option)}>{option}</button>)}</div><button type="button" className="tool-button direct-apply" disabled={!canSpace} onClick={() => onApply(zones)}>Recompose around space</button></div>
      <div className="space-body">
        <div className="space-stage"><div className="artboard-frame"><div className="composition-paper space-paper" style={{ aspectRatio: `${document.width} / ${document.height}` }}><CompositionRenderer document={display} showZones /><svg className="space-draw-layer" viewBox={`0 0 ${document.width} ${document.height}`} aria-label="Draw an exclusion zone" onPointerDown={begin} onPointerMove={extend} onPointerUp={finish} onPointerCancel={() => setDraft(null)}>
          {draft && (shape === 'ellipse' ? <ellipse cx={(draft.start[0] + draft.end[0]) / 2} cy={(draft.start[1] + draft.end[1]) / 2} rx={Math.abs(draft.end[0] - draft.start[0]) / 2} ry={Math.abs(draft.end[1] - draft.start[1]) / 2} /> : shape === 'freeform' ? <polyline points={draft.points.map(([x, y]) => `${x},${y}`).join(' ')} /> : <rect {...bounds([draft.start, draft.end])} />)}
        </svg></div></div></div>
        <aside className="space-inspector" aria-label="Zone inspector"><div className="mono space-index">{String(zones.length).padStart(2, '0')} ZONES</div><p className="space-help">Drag on the paper. The preview outline is a guide; recompose moves the artwork away from it.</p><div className="space-zone-list">{zones.map((zone, index) => <div className={`space-zone-row${selectedId === zone.id ? ' is-selected' : ''}`} key={zone.id}><button type="button" onClick={() => setSelectedId(zone.id)}>{String(index + 1).padStart(2, '0')} / {zone.shape}</button><button type="button" onClick={() => setZones((current) => current.map((item) => item.id === zone.id ? { ...item, locked: !item.locked } : item))}>{zone.locked ? 'Unlock' : 'Lock'}</button><button type="button" disabled={zone.locked} aria-label={`Delete zone ${index + 1}`} onClick={() => { setZones((current) => current.filter((item) => item.id !== zone.id)); setSelectedId(null); }}>×</button></div>)}</div>
          {selected && <div className="space-coordinates"><span className="mono">{selected.locked ? 'LOCKED ZONE' : 'EDIT ZONE'}</span>{(['x', 'y', 'width', 'height'] as (keyof Box)[]).map((field) => <label className="mono" key={field}>{field.toUpperCase()}<input type="number" min="0" max={field === 'x' || field === 'width' ? document.width : document.height} value={Math.round(selected.box[field])} disabled={selected.locked} onChange={(event) => updateSelected(field, Number(event.target.value))} /></label>)}</div>}
          {error && <p className="input-error" role="alert">{error}</p>}
        </aside>
      </div>
    </section>
  );
}
