import type { CompositionDocument } from '../../domain/document';
import { CompositionRenderer } from '../canvas/CompositionRenderer';
import { Icon } from '../ui/Icon';
import type { SavedVariation } from '../../lib/variations';

interface VariationsRailProps {
  document: CompositionDocument;
  variations: SavedVariation[];
  storageReady: boolean;
  saving: boolean;
  onSave: () => void;
  onRestore: (variation: SavedVariation) => void;
  onRemove: (id: string) => void;
}

export function VariationsRail({ document, variations, storageReady, saving, onSave, onRestore, onRemove }: VariationsRailProps) {
  const image = document.elements.find((element) => element.kind === 'image');
  return (
    <aside className="variations-rail" aria-label="Variations">
      <div className="panel-heading"><h2>Variations</h2><span className="mono panel-index">{String(variations.length).padStart(2, '0')}</span></div>
      <div className="current-variation">
        <div className="variation-thumbnail" aria-hidden="true"><div className="composition-paper"><CompositionRenderer document={document} /></div></div>
        <div className="variation-label mono"><span>{document.system} / {String(document.seed).padStart(6, '0')}</span><span>Current</span></div>
      </div>
      <button className="save-variation" type="button" disabled={!storageReady || saving} onClick={onSave}><Icon name="plus" size={14} /> {saving ? 'Saving…' : 'Save variation'}</button>
      {variations.length === 0 ? <p className="variations-empty">Save a composition to compare it with later mutations.</p> : (
        <div className="saved-variations" aria-label="Saved compositions">
          {variations.map((variation) => (
            <div className="saved-variation" key={variation.id}>
              <button type="button" className="saved-variation-select" onClick={() => onRestore(variation)} aria-label={`Restore ${variation.document.system} seed ${variation.document.seed}, ${variation.document.source.image?.name ?? 'no image'}`}>
                <div className="composition-paper" aria-hidden="true"><CompositionRenderer document={variation.document} /></div>
                <span className="mono">{variation.document.system} / {String(variation.document.seed).padStart(6, '0')}</span>
                <span className="saved-source-name">{variation.document.source.image?.name}</span>
              </button>
              <button type="button" className="saved-variation-remove" onClick={() => onRemove(variation.id)} aria-label={`Remove saved ${variation.document.system} seed ${variation.document.seed}`}>×</button>
            </div>
          ))}
        </div>
      )}
      <dl className="composition-details">
        <div><dt>System</dt><dd>{document.system}</dd></div>
        <div><dt>Grid</dt><dd>{document.grid.columns} columns</dd></div>
        <div><dt>Hierarchy</dt><dd>{document.hierarchy}</dd></div>
        <div><dt>Image</dt><dd>{image?.kind === 'image' && image.fit === 'contain' ? 'Whole image' : 'Variable crop'}</dd></div>
      </dl>
      <p className="rail-footer mono">SAVED IN THIS BROWSER</p>
    </aside>
  );
}
