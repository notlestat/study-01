import type { ReactNode } from 'react';

interface WorkspaceProps {
  header: ReactNode;
  controls: ReactNode;
  canvas: ReactNode;
  variations: ReactNode;
  footer: ReactNode;
  focus?: boolean;
}

// Named slots keep layout separate from the session and individual panel contents.
export function Workspace({ header, controls, canvas, variations, footer, focus = false }: WorkspaceProps) {
  return (
    <div className={`workspace${focus ? ' is-focus' : ''}`}>
      {header}
      <main className="workspace-main" aria-label="Composition workspace">{controls}{canvas}{variations}</main>
      {footer}
    </div>
  );
}
