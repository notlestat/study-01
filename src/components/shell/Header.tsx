import { Icon } from '../ui/Icon';

export function Header() {
  return (
    <header className="app-header">
      <h1 className="wordmark">STUDY<span className="wordmark-divider">/</span><span className="wordmark-edition">01</span></h1>
      <p className="header-description">A composition instrument</p>
      <div className="header-actions">
        <span className="phase-label mono">PHASE 02</span>
        <button className="export-button" disabled title="Export will be available in a later phase">Export <Icon name="arrow" size={14} /></button>
      </div>
    </header>
  );
}
