import type { CompositionDocument } from '../../domain/document';
import { CompositionRenderer } from './CompositionRenderer';

interface ProcessCanvasProps { document: CompositionDocument; busy: boolean; stage: number; originalShown: boolean; onToggleOriginal: () => void; focus: boolean; onToggleFocus: () => void; }

export function ProcessCanvas({ document, busy, stage, originalShown, onToggleOriginal, focus, onToggleFocus }: ProcessCanvasProps) {
  return <section className="canvas-panel process-canvas" aria-label="Processed composition preview">
    <div className="canvas-toolbar"><div><h2>{originalShown ? 'Original / comparison' : 'Material study'}</h2><p className="proof-intro">{busy ? 'Rendering the pass sequence…' : originalShown ? 'Source image before reproduction.' : `Stage ${stage} / each pass acts on the previous result.`}</p></div><div className="process-canvas-actions"><button type="button" className="tool-button" aria-pressed={originalShown} onClick={onToggleOriginal}>{originalShown ? 'Show process' : 'Compare original'}</button><button type="button" className="tool-button" aria-pressed={focus} onClick={onToggleFocus}>{focus ? 'Exit focus' : 'Focus'}</button></div></div>
    <div className="canvas-stage"><div className="artboard-frame"><span className="artboard-coordinate coordinate-top mono" aria-hidden="true">{originalShown ? 'ORIGINAL / SOURCE' : `PASS / STAGE ${String(stage).padStart(2, '0')}`}</span><div className="composition-paper" style={{ aspectRatio: `${document.width} / ${document.height}` }}><CompositionRenderer document={document} /></div><span className="artboard-coordinate coordinate-bottom mono" aria-hidden="true">{document.system} / {String(document.seed).padStart(6, '0')}</span></div></div>
    <div className="canvas-caption mono">{originalShown ? 'COMPARISON / SOURCE IMAGE' : 'PREVIEW / APPLY STAGE TO KEEP THIS RESULT'}</div>
  </section>;
}
