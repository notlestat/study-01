import type { CompositionDocument } from '../domain/document.ts';

export interface DocumentHistory { document: CompositionDocument; past: CompositionDocument[]; future: CompositionDocument[]; }
export function advanceHistory(history: DocumentHistory, document: CompositionDocument): DocumentHistory {
  return { document, past: [...history.past, history.document].slice(-40), future: [] };
}
export function stepHistory(history: DocumentHistory, direction: 'undo' | 'redo'): DocumentHistory {
  const document = direction === 'undo' ? history.past.at(-1) : history.future.at(-1);
  if (!document) return history;
  return direction === 'undo'
    ? { document, past: history.past.slice(0, -1), future: [...history.future, history.document].slice(-40) }
    : { document, past: [...history.past, history.document].slice(-40), future: history.future.slice(0, -1) };
}
