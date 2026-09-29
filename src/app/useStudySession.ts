import { useEffect, useRef, useState } from 'react';
import type { LockKey, StudySession, SystemId } from '../domain/composition';
import { SAMPLE_IMAGE } from '../domain/sample';
import { generateComposition } from '../engine/generate';
import { mutateComposition } from '../engine/mutate';
import { MAX_SEED } from '../engine/random';
import { loadLocalImage } from '../lib/loadLocalImage';
import { deleteVariation, hydrateVariation, readSavedVariations, saveVariation } from '../lib/variations';
import type { SavedVariation } from '../lib/variations';

const INITIAL_SESSION: StudySession = {
  system: 'ORDER',
  input: { title: 'A study\nin form.', metadata: 'Visual exploration\n2026 / No. 001', image: SAMPLE_IMAGE },
  locks: { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false },
};

export function useStudySession() {
  const [session, setSession] = useState<StudySession>(INITIAL_SESSION);
  const [document, setDocument] = useState(() => generateComposition({ system: 'ORDER', input: INITIAL_SESSION.input, seed: 1 }));
  const [seedText, setSeedText] = useState('1');
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  const [generationCount, setGenerationCount] = useState(1);
  const [variations, setVariations] = useState<SavedVariation[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const ownedUrls = useRef(new Set<string>());
  const imageRequest = useRef(0);
  const draftSrc = session.input.image?.src;
  const generatedSrc = document.source.image?.src;
  const savedSources = variations.map((variation) => variation.document.source.image?.src);

  useEffect(() => {
    let cancelled = false;
    readSavedVariations().then((stored) => {
      if (cancelled) return;
      const restored = stored.map((item) => {
        const { variation, ownedUrl } = hydrateVariation(item);
        if (ownedUrl) ownedUrls.current.add(ownedUrl);
        return variation;
      });
      restored.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setVariations(restored);
      setStorageReady(true);
    }).catch(() => {
      if (!cancelled) setError('Saved variations are unavailable in this browser.');
    });
    return () => { cancelled = true; };
  }, []);

  // Object URLs stay alive while a draft, current result, or saved thumbnail uses them.
  useEffect(() => {
    for (const url of ownedUrls.current) {
      if (url !== draftSrc && url !== generatedSrc && !savedSources.includes(url)) {
        URL.revokeObjectURL(url);
        ownedUrls.current.delete(url);
      }
    }
  }, [draftSrc, generatedSrc, variations]);

  useEffect(() => {
    const urls = ownedUrls.current;
    return () => {
      imageRequest.current += 1;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  function selectSystem(system: SystemId) {
    setSession((current) => ({ ...current, system }));
  }

  function updateInput(field: 'title' | 'metadata', value: string) {
    setSession((current) => ({ ...current, input: { ...current.input, [field]: value } }));
  }

  function toggleLock(key: LockKey) {
    setSession((current) => ({ ...current, locks: { ...current.locks, [key]: !current.locks[key] } }));
  }

  async function selectImage(file: File) {
    const request = ++imageRequest.current;
    setImageLoading(true);
    setError('');
    try {
      const image = await loadLocalImage(file);
      if (request !== imageRequest.current) {
        URL.revokeObjectURL(image.src);
        return;
      }
      ownedUrls.current.add(image.src);
      setSession((current) => ({ ...current, input: { ...current.input, image } }));
    } catch (cause) {
      if (request === imageRequest.current) {
        setError(cause instanceof Error ? cause.message : 'This image could not be read.');
      }
    } finally {
      if (request === imageRequest.current) setImageLoading(false);
    }
  }

  function useSampleImage() {
    imageRequest.current += 1;
    setImageLoading(false);
    setError('');
    setSession((current) => ({ ...current, input: { ...current.input, image: SAMPLE_IMAGE } }));
  }

  function removeImage() {
    imageRequest.current += 1;
    setImageLoading(false);
    setError('');
    setSession((current) => ({ ...current, input: { ...current.input, image: null } }));
  }

  const seed = /^\d{1,6}$/.test(seedText) ? Number(seedText) : null;
  const canGenerate = !!session.input.image && seed !== null && !imageLoading;
  const dirty = session.system !== document.system || seed !== document.seed
    || session.input.title !== document.source.title
    || session.input.metadata !== document.source.metadata
    || session.input.image?.id !== document.source.image?.id;

  function generate(nextSeed = false) {
    if (!canGenerate || seed === null) return;
    const requestedSeed = nextSeed ? (seed + 1) % (MAX_SEED + 1) : seed;
    try {
      const result = generateComposition({ system: session.system, input: session.input, seed: requestedSeed });
      setDocument(result);
      setSeedText(String(requestedSeed));
      setGenerationCount((count) => count + 1);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The composition could not be generated.');
    }
  }

  const canMutate = !dirty && !!document.source.image && !imageLoading && !Object.values(session.locks).every(Boolean);

  function mutate() {
    if (!canMutate) return;
    try {
      const result = mutateComposition(document, session.locks);
      setDocument(result);
      setSeedText(String(result.seed));
      setGenerationCount((count) => count + 1);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The composition could not be mutated.');
    }
  }

  async function saveCurrentVariation() {
    if (!storageReady || saving) return;
    setSaving(true);
    try {
      // The document is a snapshot. Later draft edits cannot change a saved variation.
      const saved = await saveVariation(document);
      setVariations((current) => [saved, ...current]);
      setError('');
    } catch {
      setError('This variation could not be saved. Check available browser storage.');
    } finally {
      setSaving(false);
    }
  }

  function restoreVariation(variation: SavedVariation) {
    setDocument(variation.document);
    setSession((current) => ({ ...current, system: variation.document.system, input: variation.document.source }));
    setSeedText(String(variation.document.seed));
    setGenerationCount((count) => count + 1);
    setError('');
  }

  async function removeVariation(id: string) {
    try {
      await deleteVariation(id);
      setVariations((current) => current.filter((variation) => variation.id !== id));
      setError('');
    } catch {
      setError('This variation could not be removed.');
    }
  }

  return {
    session, document, seedText, setSeedText, imageLoading, error,
    canGenerate, canMutate, dirty, generationCount, selectSystem, updateInput, toggleLock,
    selectImage, useSampleImage, removeImage, generate, mutate,
    variations, storageReady, saving, saveCurrentVariation, restoreVariation, removeVariation,
  };
}
