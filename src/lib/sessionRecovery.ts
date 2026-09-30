import type { StudySession } from '../domain/composition';
import type { CompositionDocument } from '../domain/document';

export interface RecoverySnapshot {
  session: StudySession;
  document: CompositionDocument;
  seedText: string;
  undoStack: CompositionDocument[];
  redoStack: CompositionDocument[];
  directBase: CompositionDocument | null;
}
export interface StoredRecovery { version: 1; snapshot: RecoverySnapshot; images: { key: string; blob: Blob }[]; }

/** Replace ephemeral image URLs with stable keys; deduplicate originals across history. */
export async function packRecovery(snapshot: RecoverySnapshot): Promise<StoredRecovery> {
  const images: StoredRecovery['images'] = [];
  const keys = new Map<string, string>();
  const assets = [snapshot.session.input.image, ...[snapshot.document, ...snapshot.undoStack, ...snapshot.redoStack, ...(snapshot.directBase ? [snapshot.directBase] : [])].flatMap((document) => [document.source.image, document.processing?.original, ...document.elements.flatMap((element) => element.kind === 'image' ? [element.asset] : [])])];
  for (const asset of assets) {
    if (!asset || asset.origin !== 'local' || keys.has(asset.src)) continue;
    const response = await fetch(asset.src);
    if (!response.ok) throw new Error('A source image could not be recovered.');
    const key = `__recovery_image_${images.length}__`;
    keys.set(asset.src, key); images.push({ key, blob: await response.blob() });
  }
  return { version: 1, images, snapshot: replaceSources(snapshot, keys) };
}

function replaceSources(snapshot: RecoverySnapshot, sources: Map<string, string>): RecoverySnapshot {
  // Only image src values are replaced: title/metadata strings remain literal.
  const asset = <T extends { src: string } | null | undefined>(value: T): T => value ? { ...value, src: sources.get(value.src) ?? value.src } : value;
  const document = (value: CompositionDocument): CompositionDocument => ({ ...value,
    source: { ...value.source, image: asset(value.source.image) },
    elements: value.elements.map((element) => element.kind === 'image' ? { ...element, asset: asset(element.asset) } : element),
    processing: value.processing ? { ...value.processing, original: asset(value.processing.original) } : undefined,
  });
  return { ...snapshot, session: { ...snapshot.session, input: { ...snapshot.session.input, image: asset(snapshot.session.input.image) } },
    document: document(snapshot.document), undoStack: snapshot.undoStack.map(document), redoStack: snapshot.redoStack.map(document), directBase: snapshot.directBase ? document(snapshot.directBase) : null };
}

export function unpackRecovery(stored: StoredRecovery): { snapshot: RecoverySnapshot; ownedUrls: string[] } {
  if (stored.version !== 1 || stored.snapshot.document.version !== 1) throw new Error('This recovery document uses an unsupported version.');
  const sources = new Map(stored.images.map(({ key, blob }) => [key, URL.createObjectURL(blob)]));
  return { snapshot: replaceSources(stored.snapshot, sources), ownedUrls: [...sources.values()] };
}

// Separate recovery database leaves the original archive schema and records untouched.
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('study-01-recovery', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('session');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readRecovery(): Promise<StoredRecovery | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('session', 'readonly');
    const request = tx.objectStore('session').get('current');
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
export async function writeRecovery(stored: StoredRecovery): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('session', 'readwrite');
    tx.objectStore('session').put(stored, 'current');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
