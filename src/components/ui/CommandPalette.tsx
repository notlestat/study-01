import { useEffect, useId, useRef, useState } from 'react';

export interface StudyCommand { id: string; label: string; shortcut?: string; disabled?: boolean; run: () => void; }
export function CommandPalette({ commands, onClose }: { commands: StudyCommand[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const titleId = useId();
  const matches = commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => {
    dialog.current?.showModal(); input.current?.focus();
    const node = dialog.current;
    return () => node?.close();
  }, []);
  return <dialog ref={dialog} className="command-palette" aria-labelledby={titleId} onCancel={onClose} onClick={(event) => { if (event.target === dialog.current) onClose(); }}>
    <div className="command-heading"><h2 id={titleId}>Study commands</h2><button type="button" className="tool-button" onClick={onClose}>Close</button></div>
    <label className="sr-only" htmlFor={`${titleId}-search`}>Search commands</label>
    <input id={`${titleId}-search`} ref={input} className="command-search" type="search" value={query} placeholder="Find a workspace or action…" onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); dialog.current?.querySelector<HTMLButtonElement>('.command-item:enabled')?.focus(); }
      if (event.key === 'Enter') { const first = matches.find((command) => !command.disabled); if (first) { first.run(); onClose(); } }
    }} />
    <div className="command-results">{matches.map((command) => <button className="command-item" type="button" key={command.id} disabled={command.disabled} onClick={() => { command.run(); onClose(); }}><span>{command.label}</span><kbd>{command.shortcut}</kbd></button>)}{!matches.length && <p className="field-help">No matching commands.</p>}</div>
    <p className="command-help mono">⌘ / CTRL K · SEARCH · TAB TO MOVE · ENTER TO APPLY · ESC TO CLOSE</p>
  </dialog>;
}
