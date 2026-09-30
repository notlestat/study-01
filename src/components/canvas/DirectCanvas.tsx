import type { CompositionDocument } from '../../domain/document';
import type { DirectCategory } from '../controls/DirectControls';
import { CompositionRenderer } from './CompositionRenderer';

interface DirectCanvasProps {
  document: CompositionDocument;
  previewing: boolean;
  method: DirectCategory;
  focus: boolean;
  onToggleFocus: () => void;
}

export function DirectCanvas({ document, previewing, method, focus, onToggleFocus }: DirectCanvasProps) {
  return (
    <section className="canvas-panel direct-canvas" aria-label="Directed composition preview">
      <div className="canvas-toolbar"><div><h2>{previewing ? method === 'relation' ? 'Relationship preview' : method === 'typography' ? 'Typography preview' : 'Operation preview' : 'Composition'}</h2><p className="proof-intro">{previewing ? 'Unapplied / review the effect before committing it.' : 'Apply a recipe to develop this study.'}</p></div><button type="button" className="tool-button" aria-pressed={focus} onClick={onToggleFocus}>{focus ? 'Exit focus' : 'Focus'}</button></div>
      <div className="canvas-stage"><div className="artboard-frame"><span className="artboard-coordinate coordinate-top mono" aria-hidden="true">{previewing ? 'PREVIEW / UNAPPLIED' : 'CURRENT / APPLIED'}</span><div className="composition-paper" style={{ aspectRatio: `${document.width} / ${document.height}` }}><CompositionRenderer document={document} /></div><span className="artboard-coordinate coordinate-bottom mono" aria-hidden="true">{document.system} / {String(document.seed).padStart(6, '0')}</span></div></div>
      <div className="canvas-caption mono">{previewing ? 'PREVIEW ONLY / APPLY TO KEEP THIS RESULT' : document.typography?.length ? `TYPE MATERIAL / ${document.typography.at(-1)?.kind.replaceAll('_', ' ')}` : document.imageType ? `IMAGE × TYPE / ${document.imageType.kind.replaceAll('_', ' ')}` : `${document.operations?.length ?? 0} OPERATIONS IN THIS DOCUMENT`}</div>
    </section>
  );
}
