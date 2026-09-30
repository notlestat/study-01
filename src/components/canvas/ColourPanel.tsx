import type { CompositionDocument } from '../../domain/document';
import { CompositionRenderer } from './CompositionRenderer';

interface ColourPanelProps { document: CompositionDocument; original: CompositionDocument; comparing: boolean; onToggleCompare: () => void; focus: boolean; onToggleFocus: () => void; }

export function ColourPanel({ document, original, comparing, onToggleCompare, focus, onToggleFocus }: ColourPanelProps) {
  return <section className="canvas-panel colour-panel" aria-label="Artwork colour preview">
    <div className="canvas-toolbar"><div><h2>Colour</h2><p className="proof-intro">{document.colour?.mode.replaceAll('_', ' ')} / {document.width}×{document.height}</p></div><div className="canvas-tools"><button type="button" className="tool-button" aria-pressed={comparing} onClick={onToggleCompare}>{comparing ? 'Close compare' : 'Compare original'}</button><button type="button" className="tool-button" aria-pressed={focus} onClick={onToggleFocus}>{focus ? 'Exit focus' : 'Focus'}</button></div></div>
    <div className={`colour-stage${comparing ? ' is-comparing' : ''}`}>
      {comparing && <div className="colour-art"><div className="composition-paper" style={{ aspectRatio: `${original.width} / ${original.height}` }}><CompositionRenderer document={{ ...original, colour: undefined }} /></div><span className="mono">ORIGINAL</span></div>}
      <div className="colour-art"><div className="composition-paper" style={{ aspectRatio: `${document.width} / ${document.height}` }}><CompositionRenderer document={document} /></div><span className="mono">{document.colour?.mode.replaceAll('_', ' ')}</span></div>
    </div>
    <div className="canvas-caption mono">LIVE PREVIEW / APPLY IN THE LEFT PANEL</div>
  </section>;
}
