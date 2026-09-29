import { Icon } from '../ui/Icon';
import type { ExportFormat } from '../../lib/exportComposition';

interface HeaderProps { onExport: (format: ExportFormat) => void; exporting: boolean; exportMessage: string; }

export function Header({ onExport, exporting, exportMessage }: HeaderProps) {
  return (
    <header className={`app-header${exportMessage ? ' has-export-message' : ''}`}>
      <h1 className="wordmark">STUDY<span className="wordmark-divider">/</span><span className="wordmark-edition">01</span></h1>
      <p className="header-description">A composition instrument</p>
      <div className="header-actions">
        <span className="phase-label mono" role="status">{exportMessage || 'LOCAL INSTRUMENT'}</span>
        <div className="export-actions" role="group" aria-label="Export composition">
          <button className="export-button" type="button" disabled={exporting} onClick={() => onExport('png')}>PNG <Icon name="arrow" size={14} /></button>
          <button className="export-button export-svg" type="button" disabled={exporting} onClick={() => onExport('svg')}>SVG</button>
        </div>
      </div>
    </header>
  );
}
