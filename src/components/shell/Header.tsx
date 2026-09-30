export type WorkspaceView = 'compose' | 'proof' | 'direct' | 'space' | 'process' | 'evolve' | 'family' | 'drift' | 'colour' | 'archive' | 'output';
export const WORKSPACE_MODES: { title: string; modes: { id: WorkspaceView; label: string }[] }[] = [
  { title: 'Compose', modes: [{ id: 'compose', label: 'Composition' }, { id: 'proof', label: 'Proof' }] },
  { title: 'Direct', modes: [{ id: 'direct', label: 'Operations / Image × Type' }, { id: 'space', label: 'Space' }] },
  { title: 'Develop', modes: [{ id: 'process', label: 'Process' }, { id: 'evolve', label: 'Genetics' }, { id: 'family', label: 'Family' }, { id: 'drift', label: 'Drift' }, { id: 'colour', label: 'Colour' }] },
  { title: 'Archive', modes: [{ id: 'archive', label: 'Research archive' }] },
  { title: 'Output', modes: [{ id: 'output', label: 'Export settings' }] },
];
interface HeaderProps { view: WorkspaceView; onViewChange: (view: WorkspaceView) => void; onCommands: () => void; saveStatus: string; }

export function Header({ view, onViewChange, onCommands, saveStatus }: HeaderProps) {
  const active = WORKSPACE_MODES.find((workspace) => workspace.modes.some((mode) => mode.id === view))!;
  return <>
    <header className="app-header">
      <h1 className="wordmark">STUDY<span className="wordmark-divider">/</span><span className="wordmark-edition">01</span></h1>
      <nav className="workspace-nav" aria-label="Workspace">{WORKSPACE_MODES.map((workspace, index) => <button key={workspace.title} type="button" aria-pressed={active === workspace} onClick={() => onViewChange(workspace.modes[0].id)}><span className="mono workspace-index">0{index + 1} / </span>{workspace.title}</button>)}</nav>
      <div className="header-actions"><span className="phase-label mono" role="status">{saveStatus}</span><button type="button" className="tool-button" onClick={onCommands} title="Commands / ⌘K or Ctrl K">Commands</button></div>
    </header>
    <nav className="workspace-subnav" aria-label={`${active.title} modes`}>{active.modes.map((mode) => <button key={mode.id} type="button" aria-pressed={view === mode.id} onClick={() => onViewChange(mode.id)}>{mode.label}</button>)}</nav>
  </>;
}
