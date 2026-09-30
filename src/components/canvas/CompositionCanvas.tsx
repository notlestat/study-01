import { useEffect, useRef, useState } from 'react';
import type { Ref } from 'react';
import type { CompositionDocument } from '../../domain/document';
import { CompositionRenderer } from './CompositionRenderer';

interface CompositionCanvasProps {
  document: CompositionDocument;
  previous?: CompositionDocument;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  dirty: boolean;
  generationCount: number;
  svgRef: Ref<SVGSVGElement>;
  focus: boolean;
  onToggleFocus: () => void;
}

export function CompositionCanvas({ document, previous, zoom, onZoomChange, dirty, generationCount, svgRef, focus, onToggleFocus }: CompositionCanvasProps) {
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
  const [selectedElement, setSelectedElement] = useState('');
  const displayed = before && previous ? previous : document;
  return (
    <section ref={panelRef} className="canvas-panel" id="composition" tabIndex={-1} aria-label="Composition preview">
      <div className="canvas-toolbar"><h2>Composition</h2><div className="canvas-tools"><span className="mono">{document.width}×{document.height} <span className="toolbar-divider">/</span> {document.familyAsset?.format.replaceAll('_', ' ') ?? 'PORTRAIT'}</span><button className="tool-button" type="button" disabled={zoom <= .75} onClick={() => onZoomChange(Math.max(.75, zoom - .25))} aria-label="Zoom out">−</button><button type="button" className="tool-button" onClick={() => onZoomChange(1)} title="Reset zoom / 0">Fit</button><span className="mono zoom-label">{Math.round(zoom * 100)}%</span><button className="tool-button" type="button" disabled={zoom >= 2} onClick={() => onZoomChange(Math.min(2, zoom + .25))} aria-label="Zoom in">+</button><button className="tool-button" type="button" aria-pressed={fullScreen} onClick={toggleFullscreen}>{fullScreen ? 'Exit full screen' : 'Full screen'}</button><button className="tool-button" type="button" aria-pressed={focus} onClick={onToggleFocus}>{focus ? 'Exit focus' : 'Focus'}</button></div></div>
      <div className="canvas-stage">
        <div className="artboard-frame" style={{ zoom, '--artboard-ratio': displayed.width / displayed.height } as React.CSSProperties}>
          <span className="artboard-coordinate coordinate-top mono" aria-hidden="true">000,000</span>
          <div className="composition-paper" style={{ aspectRatio: `${displayed.width} / ${displayed.height}` }} onClick={(event) => { const element = (event.target as Element).closest('[data-element]'); setSelectedElement(element?.getAttribute('data-element') ?? ''); }}><CompositionRenderer document={displayed} showGrid={showGrid} showSafe={showSafe} selectedElement={selectedElement} showZones={showZones} svgRef={svgRef} /></div>
          <span className="artboard-coordinate coordinate-bottom mono" aria-hidden="true">{document.system} / {String(document.seed).padStart(6, '0')}</span>
        </div>
      </div>
      <div className="canvas-caption">
        {previous && <button type="button" className="tool-button" aria-pressed={before} onClick={() => setBefore((value) => !value)}>{before ? 'Return to current' : 'Before / after'}</button>}
        <label className="grid-control"><input type="checkbox" checked={showSafe} onChange={(event) => setShowSafe(event.target.checked)} /> Safe area</label>
        <label className="sr-only" htmlFor="inspect-element">Inspect element</label><select className="element-select mono" id="inspect-element" aria-label="Inspect element" value={selectedElement} onChange={(event) => setSelectedElement(event.target.value)}><option value="">Inspect element</option>{displayed.elements.map((element) => <option key={element.id} value={element.id}>{element.id.replaceAll('-', ' ')}</option>)}</select>
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
