import type { CompositionDocument } from '../domain/document.ts';
import type { SystemId } from '../domain/composition.ts';

export interface ArchiveItem { id: string; createdAt: string; document: CompositionDocument; }
export type ArchivePeriod = 'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS';
export interface ArchiveFilter { system: SystemId | 'ALL'; operation: string; period: ArchivePeriod; order: 'NEWEST' | 'OLDEST'; }

export function archiveTags(document: CompositionDocument): string[] {
  return [...new Set([
    document.lineage?.event ?? 'ROOT',
    ...(document.operations ?? []).map((item) => item.kind),
    ...(document.typography ?? []).map((item) => item.kind),
    ...(document.processing?.passes ?? []).map((item) => item.kind),
    ...(document.imageType ? [document.imageType.kind] : []),
    ...(document.drift ? [`DRIFT / ${document.drift.mode}`] : []),
    ...(document.colour ? [`COLOUR / ${document.colour.mode}`] : []),
  ])];
}

/** Pure filtering keeps IndexedDB and React out of archive retrieval rules. */
export function filterArchive<T extends ArchiveItem>(items: T[], filter: ArchiveFilter, now: Date): T[] {
  const start = new Date(now);
  if (filter.period === 'TODAY') start.setHours(0, 0, 0, 0);
  else if (filter.period === '7_DAYS') start.setDate(start.getDate() - 7);
  else if (filter.period === '30_DAYS') start.setDate(start.getDate() - 30);
  return items.filter((item) => {
    const time = Date.parse(item.createdAt);
    return (filter.system === 'ALL' || item.document.system === filter.system)
      && (filter.operation === 'ALL' || archiveTags(item.document).includes(filter.operation))
      && (filter.period === 'ALL' || (Number.isFinite(time) && time >= start.getTime() && time <= now.getTime()));
  }).sort((a, b) => filter.order === 'NEWEST' ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt));
}
