import { useEffect, useRef, useState } from 'react';
import type { ImageAsset, LockKey, StudySession, SystemId } from '../domain/composition';
import { SAMPLE_IMAGE } from '../domain/sample';
import { generateComposition } from '../engine/generate';
import { mutateComposition } from '../engine/mutate';
import { applyOperation } from '../engine/operations';
import { applyImageType, relationAllowed } from '../engine/imageType';
import type { ColourRecipe, CompositionDocument, DriftRecipe, EvolutionEvent, ImageTypeRecipe, OperationRecord, ProcessingPass, SpaceZone, TypographyRecipe } from '../domain/document';
import { withColour } from '../engine/colour';
import { applySpaceZones } from '../engine/space';
import { originalImageDocument, withProcessedImage } from '../engine/processDocument';
import { establishLineage, evolveDocument } from '../engine/lineage';
import { crossbreedDocument } from '../engine/crossbreed';
import { applyTypography } from '../engine/typography';
import { generateFamily } from '../engine/family';
import { generateProof } from '../engine/proof';
import type { ProofSize } from '../engine/proof';
import { advanceHistory, stepHistory } from '../engine/history';
import { packRecovery, readRecovery, unpackRecovery, writeRecovery } from '../lib/sessionRecovery';
import type { RecoverySnapshot } from '../lib/sessionRecovery';
import { MAX_SEED } from '../engine/random';
import { loadLocalImage } from '../lib/loadLocalImage';
import { deleteVariation, hydrateVariation, readSavedVariations, saveVariation } from '../lib/variations';
import type { SavedVariation } from '../lib/variations';

const INITIAL_SESSION: StudySession = {
  system: 'ORDER',
  input: { title: 'A study\nin form.', metadata: 'Visual exploration\n2026 / No. 001', image: SAMPLE_IMAGE },
  locks: { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false },
};

export interface ProofStudy {
  id: string;
  document: ReturnType<typeof generateComposition>;
  kept: boolean;
}

export function useStudySession() {
  const [session, setSession] = useState<StudySession>(INITIAL_SESSION);
  const [document, setDocument] = useState(() => establishLineage(generateComposition({ system: 'ORDER', input: INITIAL_SESSION.input, seed: 1 }), crypto.randomUUID(), new Date().toISOString()));
  const [seedText, setSeedText] = useState('1');
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  const [generationCount, setGenerationCount] = useState(1);
  const [variations, setVariations] = useState<SavedVariation[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [proofs, setProofs] = useState<ProofStudy[]>([]);
  const [selectedProofIds, setSelectedProofIds] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<CompositionDocument[]>([]);
  const [redoStack, setRedoStack] = useState<CompositionDocument[]>([]);
  const [directBase, setDirectBase] = useState<CompositionDocument | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState('OPENING SESSION');
  const autosaveQueue = useRef<Promise<void>>(Promise.resolve());
  const autosaveRevision = useRef(0);
  const recoverySnapshot = useRef<RecoverySnapshot>({ session, document, seedText, undoStack, redoStack, directBase });
  recoverySnapshot.current = { session, document, seedText, undoStack, redoStack, directBase };
  const ownedUrls = useRef(new Set<string>());
  const imageRequest = useRef(0);
  const referencedSources = new Set<string>();
  if (session.input.image) referencedSources.add(session.input.image.src);
  for (const item of [document, ...variations.map((variation) => variation.document), ...proofs.map((proof) => proof.document), ...undoStack, ...redoStack, ...(directBase ? [directBase] : [])]) {
    if (item.source.image) referencedSources.add(item.source.image.src);
    if (item.processing?.original) referencedSources.add(item.processing.original.src);
    for (const element of item.elements) if (element.kind === 'image') referencedSources.add(element.asset.src);
  }

  useEffect(() => {
    if (!document.lineage) setDocument(establishLineage(document, crypto.randomUUID(), new Date().toISOString()));
  }, [document]);

  useEffect(() => {
    if (!variations.some((variation) => !variation.document.lineage)) return;
    setVariations((current) => current.map((variation) => variation.document.lineage ? variation : { ...variation, document: establishLineage(variation.document, `legacy-${variation.id}`, variation.createdAt) }));
  }, [variations]);

  useEffect(() => {
    let cancelled = false;
    readSavedVariations().then((stored) => {
      if (cancelled) return;
      const restored = stored.map((item) => {
        const { variation, ownedUrls: hydratedUrls } = hydrateVariation(item);
        for (const url of hydratedUrls) ownedUrls.current.add(url);
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

  useEffect(() => {
    let cancelled = false;
    readRecovery().then((stored) => {
      if (cancelled) return;
      if (stored) {
        const restored = unpackRecovery(stored);
        for (const url of restored.ownedUrls) ownedUrls.current.add(url);
        const snapshot = restored.snapshot;
        setSession(snapshot.session); setDocument(snapshot.document); setSeedText(snapshot.seedText);
        setUndoStack(snapshot.undoStack); setRedoStack(snapshot.redoStack); setDirectBase(snapshot.directBase);
      }
      setAutosaveStatus(stored ? 'SESSION RESTORED' : 'LOCAL SESSION');
      setRecoveryReady(true);
    }).catch(() => { if (!cancelled) setAutosaveStatus('RECOVERY UNAVAILABLE'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!recoveryReady || imageLoading) return;
    const revision = ++autosaveRevision.current;
    setAutosaveStatus('UNSAVED CHANGES');
    function save() {
      const snapshot = recoverySnapshot.current;
      setAutosaveStatus('SAVING SESSION');
      // Serial writes prevent a slower old snapshot from replacing a newer one.
      autosaveQueue.current = autosaveQueue.current.catch(() => {}).then(async () => {
        if (revision !== autosaveRevision.current) return;
        const stored = await packRecovery(snapshot);
        if (revision !== autosaveRevision.current) return;
        await writeRecovery(stored);
        if (revision === autosaveRevision.current) setAutosaveStatus('SESSION SAVED LOCALLY');
      }).catch(() => { if (revision === autosaveRevision.current) setAutosaveStatus('SESSION NOT SAVED'); });
    }
    const timer = window.setTimeout(save, 700);
    const onVisibility = () => { if (globalThis.document.visibilityState === 'hidden') { window.clearTimeout(timer); save(); } };
    globalThis.document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearTimeout(timer); globalThis.document.removeEventListener('visibilitychange', onVisibility); };
  }, [recoveryReady, session, document, seedText, undoStack, redoStack, directBase, imageLoading]);

  // Keep uploaded originals alive through history and processed snapshots.
  useEffect(() => {
    for (const url of ownedUrls.current) {
      if (!referencedSources.has(url)) {
        URL.revokeObjectURL(url);
        ownedUrls.current.delete(url);
      }
    }
  }, [session.input.image, document, variations, proofs, undoStack, redoStack, directBase]);

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

  function commitDocument(next: CompositionDocument, event: EvolutionEvent, resetDirect = true, preserveLineage = false) {
    const advanced = advanceHistory({ document, past: undoStack, future: redoStack }, next);
    setUndoStack(advanced.past);
    setRedoStack(advanced.future);
    setDocument(preserveLineage ? next : evolveDocument(document, next, event, session.locks, crypto.randomUUID(), new Date().toISOString()));
    setProofs([]);
    setSelectedProofIds(new Set());
    setSeedText(String(next.seed));
    setGenerationCount((count) => count + 1);
    if (resetDirect) setDirectBase(null);
    setError('');
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
      const generated = generateComposition({ system: session.system, input: session.input, seed: requestedSeed });
      const fresh = document.familyAsset
        ? generateFamily({ ...generated, processing: document.processing, typography: document.typography }).find((item) => item.familyAsset?.format === document.familyAsset?.format)!
        : generated;
      if (document.familyAsset) fresh.familyAsset = { ...document.familyAsset };
      if (document.drift) fresh.drift = { ...document.drift };
      if (document.colour) fresh.colour = { ...document.colour };
      const result = document.spaceZones?.length
        ? applySpaceZones(fresh, document.spaceZones, { GRID: false, TYPE: false, IMAGE: false, TEXTURE: false })
        : fresh;
      commitDocument(result, 'GENERATE');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The composition could not be generated.');
    }
  }

  const canMutate = !dirty && !!document.source.image && !imageLoading && !Object.values(session.locks).every(Boolean);
  const canProof = canMutate;

  function mutate() {
    if (!canMutate) return;
    try {
      const result = mutateComposition(document, session.locks);
      commitDocument(result, 'MUTATE');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The composition could not be mutated.');
    }
  }

  function makeProof(size: ProofSize) {
    if (!canProof) return;
    try {
      const results = generateProof(document, session.locks, size);
      setProofs(results.map((result) => ({ id: crypto.randomUUID(), document: evolveDocument(document, result, 'PROOF', session.locks, crypto.randomUUID(), new Date().toISOString()), kept: false })));
      setSelectedProofIds(new Set());
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The proof could not be generated.');
    }
  }

  function toggleProofSelection(id: string) {
    setSelectedProofIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function rejectProof(id: string) {
    setProofs((current) => current.filter((proof) => proof.id !== id));
    setSelectedProofIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  async function keepProof(id: string) {
    const proof = proofs.find((item) => item.id === id);
    if (!proof || proof.kept || !storageReady || saving) return;
    setSaving(true);
    try {
      const saved = await saveVariation(proof.document);
      setVariations((current) => [saved, ...current]);
      setProofs((current) => current.map((item) => item.id === id ? { ...item, kept: true } : item));
      setError('');
    } catch {
      setError('This study could not be saved. Check available browser storage.');
    } finally {
      setSaving(false);
    }
  }

  function developProof(id: string) {
    const proof = proofs.find((item) => item.id === id);
    if (!proof) return;
    commitDocument(proof.document, 'PROOF', true, true);
    setSession((current) => ({ ...current, system: proof.document.system, input: proof.document.source }));
  }

  const canDirect = !dirty && !imageLoading && !Object.values(session.locks).every(Boolean);
  const canProcess = !dirty && !!document.source.image && !imageLoading && !session.locks.IMAGE;
  const canTypography = !dirty && !imageLoading && !session.locks.TYPE && document.elements.some((element) => element.kind === 'text' && element.id === 'title');
  const canRelate = (recipe: ImageTypeRecipe) => !dirty && !imageLoading
    && relationAllowed(recipe.kind, session.locks, !!document.source.image?.analysis);

  function applyDirect(recipe: OperationRecord) {
    if (!canDirect) return;
    try {
      const operated = applyOperation(document, session.locks, recipe);
      const next = operated.spaceZones?.length ? applySpaceZones(operated, operated.spaceZones, session.locks) : operated;
      if (!directBase) setDirectBase(document);
      commitDocument(next, 'DIRECT', false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The operation could not be applied.');
    }
  }

  function applyRelation(recipe: ImageTypeRecipe) {
    if (!canRelate(recipe)) return;
    try {
      const related = applyImageType(document, session.locks, recipe);
      const next = related.spaceZones?.length ? applySpaceZones(related, related.spaceZones, session.locks) : related;
      if (!directBase) setDirectBase(document);
      commitDocument(next, 'IMAGE_TYPE', false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The relationship could not be applied.');
    }
  }

  function treatTypography(recipe: TypographyRecipe) {
    if (!canTypography) return;
    try {
      const next = applyTypography(document, session.locks, recipe);
      if (!directBase) setDirectBase(document);
      commitDocument(next, 'TYPOGRAPHY', false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Typography could not be treated.');
    }
  }

  function resetDirect() {
    if (!directBase) return;
    commitDocument(directBase, 'RESET');
  }

  function applySpace(zones: SpaceZone[]) {
    try { commitDocument(applySpaceZones(document, zones, session.locks), 'SPACE'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The space zone could not be applied.'); }
  }

  function applyProcessed(result: ImageAsset, passes: ProcessingPass[]) {
    if (!canProcess) return;
    try {
      const next = withProcessedImage(document, result, passes);
      commitDocument(next, 'PROCESS');
      setSession((current) => ({ ...current, input: next.source }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The processed image could not be applied.');
    }
  }

  function restoreOriginalImage() {
    if (!canProcess || !document.processing) return;
    const next = originalImageDocument(document);
    commitDocument(next, 'RESTORE_SOURCE');
    setSession((current) => ({ ...current, input: next.source }));
  }

  function undo() {
    if (!undoStack.length) return;
    const history = stepHistory({ document, past: undoStack, future: redoStack }, 'undo');
    const previous = history.document;
    setUndoStack(history.past); setRedoStack(history.future);
    setDocument(previous);
    setSession((current) => ({ ...current, system: previous.system, input: previous.source }));
    setSeedText(String(previous.seed));
    setProofs([]);
    setSelectedProofIds(new Set());
    setGenerationCount((count) => count + 1);
  }

  function redo() {
    if (!redoStack.length) return;
    const history = stepHistory({ document, past: undoStack, future: redoStack }, 'redo');
    const next = history.document;
    setUndoStack(history.past); setRedoStack(history.future);
    setDocument(next);
    setSession((current) => ({ ...current, system: next.system, input: next.source }));
    setSeedText(String(next.seed));
    setProofs([]);
    setSelectedProofIds(new Set());
    setGenerationCount((count) => count + 1);
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
    commitDocument(variation.document, 'ROOT', true, true);
    setSession((current) => ({ ...current, system: variation.document.system, input: variation.document.source }));
  }

  function developLineage(selected: CompositionDocument) {
    commitDocument(selected, 'ROOT', true, true);
    setSession((current) => ({ ...current, system: selected.system, input: selected.source }));
  }

  function developFamily(selected: CompositionDocument) {
    commitDocument(selected, 'FAMILY');
    setSession((current) => ({ ...current, system: selected.system, input: selected.source }));
  }

  function applyDrift(recipe: DriftRecipe) {
    commitDocument({ ...document, drift: { ...recipe } }, 'DRIFT');
  }

  function applyColour(recipe: ColourRecipe) {
    commitDocument(withColour(document, recipe), 'COLOUR');
  }

  function branchVariation(variation: SavedVariation) {
    const child = evolveDocument(variation.document, variation.document, 'ARCHIVE_BRANCH', session.locks, crypto.randomUUID(), new Date().toISOString());
    commitDocument(child, 'ARCHIVE_BRANCH', true, true);
    setSession((current) => ({ ...current, system: child.system, input: child.source }));
  }

  async function duplicateVariation(variation: SavedVariation) {
    if (!storageReady || saving) return;
    setSaving(true);
    try {
      const copy = evolveDocument(variation.document, variation.document, 'ARCHIVE_DUPLICATE', session.locks, crypto.randomUUID(), new Date().toISOString());
      const saved = await saveVariation(copy);
      setVariations((current) => [saved, ...current]);
      setError('');
    } catch { setError('This study could not be duplicated. Check browser storage.'); }
    finally { setSaving(false); }
  }

  function crossbreed(base: CompositionDocument, donor: CompositionDocument, donorWeight: number) {
    try {
      const hybrid = crossbreedDocument(base, donor, donorWeight, session.locks, crypto.randomUUID(), new Date().toISOString());
      commitDocument(hybrid, 'CROSSBREED', true, true);
      setSession((current) => ({ ...current, system: hybrid.system, input: hybrid.source }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'These studies could not be crossbred.');
    }
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
    session, document, autosaveStatus, seedText, setSeedText, imageLoading, error,
    canGenerate, canMutate, canProof, dirty, generationCount, selectSystem, updateInput, toggleLock,
    selectImage, useSampleImage, removeImage, generate, mutate,
    variations, storageReady, saving, saveCurrentVariation, restoreVariation, removeVariation, duplicateVariation, branchVariation, developLineage, developFamily, applyDrift, applyColour, crossbreed,
    proofs, selectedProofIds, makeProof, toggleProofSelection, rejectProof, keepProof, developProof,
    canDirect, canRelate, canTypography, applyDirect, applyRelation, treatTypography, resetDirect, undo, redo, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0, hasDirectBase: !!directBase,
    applySpace,
    canProcess, applyProcessed, restoreOriginalImage,
    previousDocument: undoStack.at(-1),
    history: [...undoStack, document, ...redoStack],
  };
}
