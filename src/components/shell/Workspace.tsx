import type { ReactNode } from 'react';

interface WorkspaceProps {
  header: ReactNode;
  controls: ReactNode;
  canvas: ReactNode;
  variations: ReactNode;
  footer: ReactNode;
}

// Named slots keep layout separate from the session and individual panel contents.
export function Workspace({ header, controls, canvas, variations, footer }: WorkspaceProps) {
  return (
    <div className="workspace">
      {header}
      <main className="workspace-main" aria-label="Composition workspace">{controls}{canvas}{variations}</main>
      {footer}
    </div>
  );
}
