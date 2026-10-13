import { useEffect, useRef, useState } from 'react';
import type { Ref } from 'react';
import type { CompositionDocument } from '../../domain/document';
import { CanvasEditor } from './CanvasEditor';
import type { CompositionLocks } from '../../domain/composition';
import { CompositionRenderer } from './CompositionRenderer';

interface CompositionCanvasProps {
  document: CompositionDocument;
  locks: CompositionLocks;
  canEdit: boolean;
  canUndo: boolean;
  canRedo: boolean;
  materialLoading: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onEdit: (document: CompositionDocument) => void;
  onMaterial: (file: File) => void;
  previous?: CompositionDocument;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  dirty: boolean;
  generationCount: number;
  svgRef: Ref<SVGSVGElement>;
  focus: boolean;
  onToggleFocus: () => void;
}

export function CompositionCanvas({ document, locks, canEdit, canUndo, canRedo, onUndo, onRedo, onEdit, onMaterial, materialLoading, previous, zoom, onZoomChange, dirty, generationCount, svgRef, focus, onToggleFocus }: CompositionCanvasProps) {
  const panelRef = useRef<HTMLElement>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  useEffect(() => { const update = () => setFullScreen(globalThis.document.fullscreenElement === panelRef.current); globalThis.document.addEventListener('fullscreenchange', update); return () => globalThis.document.removeEventListener('fullscreenchange', update); }, []);
  async function toggleFullscreen() {
    let timeout = 0;
    try {
      const request = globalThis.document.fullscreenElement ? globalThis.document.exitFullscreen() : panelRef.current?.requestFullscreen();
      await Promise.race([request, new Promise<void>((_, reject) => { timeout = window.setTimeout(() => reject(new Error('Fullscreen unavailable')), 1500); })]);
      if (!globalThis.document.fullscreenElement && !fullScreen) throw new Error('Fullscreen unavailable');
      setFullscreenError('');
    } catch {
      if (!focus) onToggleFocus();
      setFullscreenError('Native fullscreen unavailable. Focus view enabled.');
    } finally { window.clearTimeout(timeout); }
  }
  const [showGrid, setShowGrid] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [showSafe, setShowSafe] = useState(false);
  const [before, setBefore] = useState(false);
  const displayed = before && previous ? previous : document;
  return (
    <section ref={panelRef} className="canvas-panel" id="composition" tabIndex={-1} aria-label="Composition preview">
      <div className="canvas-toolbar"><h2>Composition</h2><div className="canvas-tools"><span className="mono">{document.width}×{document.height} <span className="toolbar-divider">/</span> {document.familyAsset?.format.replaceAll('_', ' ') ?? 'PORTRAIT'}</span><button className="tool-button" type="button" disabled={zoom <= .75} onClick={() => onZoomChange(Math.max(.75, zoom - .25))} aria-label="Zoom out">−</button><button type="button" className="tool-button" onClick={() => onZoomChange(1)} title="Reset zoom / 0">Fit</button><span className="mono zoom-label">{Math.round(zoom * 100)}%</span><button className="tool-button" type="button" disabled={zoom >= 2} onClick={() => onZoomChange(Math.min(2, zoom + .25))} aria-label="Zoom in">+</button><button className="tool-button" type="button" aria-pressed={fullScreen} onClick={toggleFullscreen}>{fullScreen ? 'Exit full screen' : 'Full screen'}</button><button className="tool-button" type="button" aria-pressed={focus} onClick={onToggleFocus}>{focus ? 'Exit focus' : 'Focus'}</button></div></div>
      {before && previous ? <div className="canvas-stage"><div className="artboard-frame" style={{ zoom, '--artboard-ratio': displayed.width/displayed.height } as React.CSSProperties}><div className="composition-paper" style={{ aspectRatio: `${displayed.width} / ${displayed.height}` }}><CompositionRenderer document={displayed} showGrid={showGrid} showSafe={showSafe} showZones={showZones} /></div></div></div>
        : <CanvasEditor document={document} locks={locks} editable={canEdit} zoom={zoom} showGrid={showGrid} showSafe={showSafe} showZones={showZones} svgRef={svgRef} canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} onCommit={onEdit} onMaterial={onMaterial} materialLoading={materialLoading} />}
      <div className="canvas-caption">
        {previous && <button type="button" className="tool-button" aria-pressed={before} onClick={() => setBefore((value) => !value)}>{before ? 'Return to current' : 'Before / after'}</button>}
        <label className="grid-control"><input type="checkbox" checked={showSafe} onChange={(event) => setShowSafe(event.target.checked)} /> Safe area</label>
        <label className="grid-control"><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} /> Show grid</label>
        {document.spaceZones?.length ? <label className="grid-control"><input type="checkbox" checked={showZones} onChange={(event) => setShowZones(event.target.checked)} /> Show space</label> : null}
        <span className="generation-status" role="status" aria-live="polite">
          {fullscreenError || (dirty ? 'Inputs changed. Generate to apply.' : `${document.system} / Seed ${document.seed}`)}
          <span className="sr-only"> Generation {generationCount}.</span>
        </span>
      </div>
    </section>
  );
}
