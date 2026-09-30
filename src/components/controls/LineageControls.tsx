import type { CompositionDocument } from '../../domain/document';

export function LineageControls({ document }: { document: CompositionDocument }) {
  const lineage = document.lineage;
  return <section className="controls-panel lineage-controls" aria-label="Evolution information">
    <div className="panel-heading"><h2>Visual evolution</h2><span className="panel-index mono">04</span></div>
    <p className="direct-control-intro">Every developed study remembers where it came from. Select an earlier direction to branch, or choose two studies to crossbreed.</p>
    <div className="lineage-facts">
      <div><span>Current generation</span><strong>{String(lineage?.generation ?? 0).padStart(2, '0')}</strong></div>
      <div><span>Born from</span><strong>{lineage?.parentIds.length ? lineage.parentIds.map((id) => id.slice(0, 8)).join(' + ') : 'Source'}</strong></div>
      <div><span>Action</span><strong>{lineage?.event.replaceAll('_', ' ') ?? 'ROOT'}</strong></div>
      <div><span>Origin seed</span><strong>{lineage?.rootSeed ?? document.seed}</strong></div>
    </div>
    <div className="lineage-instructions"><span className="mono">01 / BRANCH</span><p>Select a study in the tree, inspect it, then develop that direction.</p><span className="mono">02 / CROSSBREED</span><p>Choose two circles. The first supplies the image and grid; the second supplies the type relationship.</p></div>
    <p className="field-help lineage-help">The tree includes this session’s document history and saved variations. Save directions you want available after reloading.</p>
  </section>;
}
