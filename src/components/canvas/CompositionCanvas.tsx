import { useState } from 'react';
import type { Ref } from 'react';
import type { CompositionDocument } from '../../domain/document';
import { CompositionRenderer } from './CompositionRenderer';

interface CompositionCanvasProps {
  document: CompositionDocument;
  dirty: boolean;
  generationCount: number;
  svgRef: Ref<SVGSVGElement>;
}

export function CompositionCanvas({ document, dirty, generationCount, svgRef }: CompositionCanvasProps) {
  const [showGrid, setShowGrid] = useState(false);
  return (
    <section className="canvas-panel" id="composition" tabIndex={-1} aria-label="Composition preview">
      <div className="canvas-toolbar"><h2>Composition</h2><span className="mono">3:4 <span className="toolbar-divider">/</span> PORTRAIT</span></div>
      <div className="canvas-stage">
        <div className="artboard-frame">
          <span className="artboard-coordinate coordinate-top mono" aria-hidden="true">000,000</span>
          <div className="composition-paper"><CompositionRenderer document={document} showGrid={showGrid} svgRef={svgRef} /></div>
          <span className="artboard-coordinate coordinate-bottom mono" aria-hidden="true">{document.system} / {String(document.seed).padStart(6, '0')}</span>
        </div>
      </div>
      <div className="canvas-caption">
        <label className="grid-control"><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} /> Show grid</label>
        <span className="generation-status" role="status" aria-live="polite">
          {dirty ? 'Inputs changed. Generate to apply.' : `${document.system} / Seed ${document.seed}`}
          <span className="sr-only"> Generation {generationCount}.</span>
        </span>
      </div>
    </section>
  );
}
