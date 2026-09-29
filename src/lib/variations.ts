import type { CompositionDocument } from '../domain/document';

const DATABASE_NAME = 'study-01';
const STORE_NAME = 'variations';
const LOCAL_IMAGE = '__saved_local_image__';

export interface SavedVariation {
  id: string;
  createdAt: string;
  document: CompositionDocument;
}

interface StoredVariation extends SavedVariation {
  imageBlob?: Blob;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore, finish: (value: T) => void) => void): Promise<T> {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    let value: T;
    transaction.oncomplete = () => { database.close(); resolve(value); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
    transaction.onabort = () => { database.close(); reject(transaction.error); };
    work(transaction.objectStore(STORE_NAME), (result) => { value = result; });
  });
}

function withImageSource(document: CompositionDocument, src: string): CompositionDocument {
  return {
    ...document,
    source: { ...document.source, image: document.source.image ? { ...document.source.image, src } : null },
    elements: document.elements.map((element) => element.kind === 'image' ? { ...element, asset: { ...element.asset, src } } : element),
  };
}

export async function readSavedVariations(): Promise<StoredVariation[]> {
  return transact('readonly', (store, finish) => {
    const request = store.getAll();
    request.onsuccess = () => finish(request.result as StoredVariation[]);
  });
}

export function hydrateVariation(stored: StoredVariation): { variation: SavedVariation; ownedUrl?: string } {
  if (!stored.imageBlob) return { variation: stored };
  const ownedUrl = URL.createObjectURL(stored.imageBlob);
  return { variation: { id: stored.id, createdAt: stored.createdAt, document: withImageSource(stored.document, ownedUrl) }, ownedUrl };
}

export async function saveVariation(document: CompositionDocument): Promise<SavedVariation> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const src = document.source.image?.src;
  const isLocal = document.source.image?.origin === 'local';
  const imageBlob = isLocal && src ? await (await fetch(src)).blob() : undefined;
  const storedDocument = isLocal ? withImageSource(document, LOCAL_IMAGE) : document;
  const stored: StoredVariation = { id, createdAt, document: storedDocument, imageBlob };
  await transact('readwrite', (store, finish) => {
    store.put(stored);
    finish(undefined);
  });
  return { id, createdAt, document };
}

export async function deleteVariation(id: string): Promise<void> {
  await transact('readwrite', (store, finish) => {
    store.delete(id);
    finish(undefined);
  });
}
