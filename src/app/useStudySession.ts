import { useEffect, useRef, useState } from 'react';
import type { LockKey, StudySession, SystemId } from '../domain/composition';
import { SAMPLE_IMAGE } from '../domain/sample';
import { generateOrder } from '../engine/order';
import { MAX_SEED } from '../engine/random';
import { loadLocalImage } from '../lib/loadLocalImage';

const INITIAL_SESSION: StudySession = {
  system: 'ORDER',
  input: { title: 'A study\nin form.', metadata: 'Visual exploration\n2026 / No. 001', image: SAMPLE_IMAGE },
  locks: { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false },
};

export function useStudySession() {
  const [session, setSession] = useState<StudySession>(INITIAL_SESSION);
  const [document, setDocument] = useState(() => generateOrder({ input: INITIAL_SESSION.input, seed: 1 }));
  const [seedText, setSeedText] = useState('1');
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  const [generationCount, setGenerationCount] = useState(1);
  const ownedUrls = useRef(new Set<string>());
  const imageRequest = useRef(0);
  const draftSrc = session.input.image?.src;
  const generatedSrc = document.source.image?.src;

  // A previous image must remain available until its generated document is replaced.
  useEffect(() => {
    for (const url of ownedUrls.current) {
      if (url !== draftSrc && url !== generatedSrc) {
        URL.revokeObjectURL(url);
        ownedUrls.current.delete(url);
      }
    }
  }, [draftSrc, generatedSrc]);

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
  const canGenerate = session.system === 'ORDER' && !!session.input.image && seed !== null && !imageLoading;
  const dirty = session.system !== document.system || seed !== document.seed
    || session.input.title !== document.source.title
    || session.input.metadata !== document.source.metadata
    || session.input.image?.id !== document.source.image?.id;

  function generate(nextSeed = false) {
    if (!canGenerate || seed === null) return;
    const requestedSeed = nextSeed ? (seed + 1) % (MAX_SEED + 1) : seed;
    try {
      const result = generateOrder({ input: session.input, seed: requestedSeed });
      setDocument(result);
      setSeedText(String(requestedSeed));
      setGenerationCount((count) => count + 1);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The composition could not be generated.');
    }
  }

  return {
    session, document, seedText, setSeedText, imageLoading, error,
    canGenerate, dirty, generationCount, selectSystem, updateInput, toggleLock,
    selectImage, useSampleImage, removeImage, generate,
  };
}
