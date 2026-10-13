import type { CompositionDocument } from '../domain/document';
import { establishLineage } from '../engine/lineage.ts';

const DATABASE_NAME = 'study-01';
const STORE_NAME = 'variations';
const LOCAL_IMAGE = '__saved_local_image__';
const ORIGINAL_IMAGE = '__saved_original_image__';

export interface SavedVariation {
  id: string;
  createdAt: string;
  document: CompositionDocument;
}

export interface StoredVariation extends SavedVariation {
  additionalImages?: { key: string; blob: Blob }[];
  imageBlob?: Blob;
  originalBlob?: Blob;
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
    elements: document.elements.map((element) => element.kind === 'image' && element.asset.src === document.source.image?.src ? { ...element, asset: { ...element.asset, src } } : element),
  };
}

export async function readSavedVariations(): Promise<StoredVariation[]> {
  return transact('readonly', (store, finish) => {
    const request = store.getAll();
    request.onsuccess = () => finish(request.result as StoredVariation[]);
  });
}

export function hydrateVariation(stored: StoredVariation): { variation: SavedVariation; ownedUrls: string[] } {
  const ownedUrls: string[] = [];
  let document = stored.document;
  if (stored.imageBlob) {
    const url = URL.createObjectURL(stored.imageBlob);
    ownedUrls.push(url);
    document = withImageSource(document, url);
  }
  if (stored.originalBlob && document.processing?.original.src === ORIGINAL_IMAGE) {
    const url = URL.createObjectURL(stored.originalBlob);
    ownedUrls.push(url);
    document = { ...document, processing: { ...document.processing, original: { ...document.processing.original, src: url } } };
  }
  for (const item of stored.additionalImages ?? []) {
    const url = URL.createObjectURL(item.blob); ownedUrls.push(url);
    document = { ...document, elements: document.elements.map(element => element.kind === 'image' && element.asset.src === item.key ? { ...element, asset: { ...element.asset, src: url } } : element) };
  }
  if (!document.lineage) document = establishLineage(document, `legacy-${stored.id}`, stored.createdAt);
  return { variation: { id: stored.id, createdAt: stored.createdAt, document }, ownedUrls };
}

export async function packVariationDocument(document: CompositionDocument): Promise<Pick<StoredVariation, 'document' | 'imageBlob' | 'originalBlob' | 'additionalImages'>> {
  const src = document.source.image?.src;
  const isLocal = document.source.image?.origin === 'local';
  const imageBlob = isLocal && src ? await (await fetch(src)).blob() : undefined;
  const original = document.processing?.original;
  const originalBlob = original?.origin === 'local' ? await (await fetch(original.src)).blob() : undefined;
  let storedDocument = isLocal ? withImageSource(document, LOCAL_IMAGE) : document;
  if (originalBlob && storedDocument.processing) storedDocument = { ...storedDocument, processing: { ...storedDocument.processing, original: { ...storedDocument.processing.original, src: ORIGINAL_IMAGE } } };
  const additionalImages: NonNullable<StoredVariation['additionalImages']> = [];
  const replacements = new Map<string, string>();
  for (const element of document.elements) {
    if (element.kind !== 'image' || element.asset.origin !== 'local' || element.asset.src === src || replacements.has(element.asset.src)) continue;
    const response = await fetch(element.asset.src);
    if (!response.ok) throw new Error('An image layer could not be saved.');
    const key = `__saved_image_layer_${additionalImages.length}__`;
    additionalImages.push({ key, blob: await response.blob() }); replacements.set(element.asset.src, key);
  }
  if (additionalImages.length) storedDocument = { ...storedDocument, elements: storedDocument.elements.map(element => element.kind === 'image' && replacements.has(element.asset.src) ? { ...element, asset: { ...element.asset, src: replacements.get(element.asset.src)! } } : element) };
  return { document: storedDocument, imageBlob, originalBlob, additionalImages };
}

export async function saveVariation(document: CompositionDocument): Promise<SavedVariation> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const packed = await packVariationDocument(document);
  const stored: StoredVariation = { id, createdAt, ...packed };
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
