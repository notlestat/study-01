import type { CompositionDocument } from '../../domain/document';
import type { ExportFormat, ExportOptions } from '../../lib/exportComposition';
import { exportDimensions } from '../../lib/exportComposition';

interface Props {
  document: CompositionDocument;
  options: ExportOptions;
  busy: boolean;
  message: string;
  onChange: (options: ExportOptions) => void;
  onExport: (format: ExportFormat) => void;
}

export function OutputControls({ document, options, busy, message, onChange, onExport }: Props) {
  const [width, height] = exportDimensions(document.width, document.height, options.scale);
  return <aside className="controls-panel" aria-label="Output settings">
    <div className="panel-heading"><h2>Output</h2><span className="mono">05 / EXPORT</span></div>
    <div className="controls-content output-controls">
      <label className="field-label" htmlFor="export-resolution">PNG resolution</label>
      <select id="export-resolution" className="proof-count" value={options.scale} onChange={(event) => onChange({ ...options, scale: Number(event.target.value) as ExportOptions['scale'] })}>
        <option value="1">1× / Native size</option><option value="2">2× / High resolution</option><option value="3">3× / Large format</option>
      </select>
      <p className="mono output-size">{width} × {height} PX</p>
      <label className="grid-control"><input type="checkbox" checked={options.transparent} onChange={(event) => onChange({ ...options, transparent: event.target.checked })} /> Transparent paper</label>
      <p className="field-help">Removes the paper background. Paper-coloured knockouts and erosion remain part of the artwork.</p>
      <div className="output-actions"><button type="button" className="tool-button direct-apply" disabled={busy} onClick={() => onExport('png')}>Export PNG</button><button type="button" className="tool-button" disabled={busy} onClick={() => onExport('svg')}>Export SVG</button></div>
      <p className="field-help">SVG includes embedded imagery, filters and study metadata. Text stays editable and uses system fonts.</p>
      <p className="mono output-status" role="status">{message || 'LOCAL DOWNLOAD / NO UPLOAD'}</p>
      <p className="field-help">Contact sheets live in PROOF and ARCHIVE. Batch assets live in FAMILY. Motion export lives in DRIFT.</p>
    </div>
  </aside>;
}
