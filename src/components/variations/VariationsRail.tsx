import type { CompositionDocument } from '../../domain/document';
import { CompositionRenderer } from '../canvas/CompositionRenderer';
import { Icon } from '../ui/Icon';

export function VariationsRail({ document }: { document: CompositionDocument }) {
  const image = document.elements.find((element) => element.kind === 'image');
  return (
    <aside className="variations-rail" aria-label="Variations">
      <div className="panel-heading"><h2>Variations</h2><span className="mono panel-index">00</span></div>
      <div className="current-variation">
        <div className="variation-thumbnail" aria-hidden="true"><div className="composition-paper"><CompositionRenderer document={document} /></div></div>
        <div className="variation-label mono"><span>{String(document.seed).padStart(6, '0')}</span><span>Current</span></div>
      </div>
      <button className="save-variation" disabled title="Saving variations will be available in a later phase"><Icon name="plus" size={14} /> Save variation</button>
      <p className="variations-empty">No saved variations.<br />Your explorations will<br className="desktop-break" /> appear here.</p>
      <dl className="composition-details">
        <div><dt>System</dt><dd>ORDER</dd></div>
        <div><dt>Grid</dt><dd>{document.grid.columns} columns</dd></div>
        <div><dt>Hierarchy</dt><dd>{document.hierarchy}</dd></div>
        <div><dt>Image</dt><dd>{image?.kind === 'image' && image.fit === 'contain' ? 'Whole image' : 'Centered crop'}</dd></div>
      </dl>
      <p className="rail-footer mono">ROOM FOR POSSIBILITY</p>
    </aside>
  );
}
