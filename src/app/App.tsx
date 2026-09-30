import { useEffect, useMemo, useRef, useState } from 'react';
import { Workspace } from '../components/shell/Workspace';
import { OutputControls } from '../components/controls/OutputControls';
import { CommandPalette } from '../components/ui/CommandPalette';
import type { StudyCommand } from '../components/ui/CommandPalette';
import { Header, WORKSPACE_MODES } from '../components/shell/Header';
import type { WorkspaceView } from '../components/shell/Header';
import { ControlsPanel } from '../components/controls/ControlsPanel';
import { DirectControls } from '../components/controls/DirectControls';
import type { DirectCategory } from '../components/controls/DirectControls';
import { LockControls } from '../components/controls/LockControls';
import { CompositionCanvas } from '../components/canvas/CompositionCanvas';
import { ProofSheet } from '../components/canvas/ProofSheet';
import { DirectCanvas } from '../components/canvas/DirectCanvas';
import { SpacePanel } from '../components/canvas/SpacePanel';
import { ProcessControls } from '../components/controls/ProcessControls';
import { ProcessCanvas } from '../components/canvas/ProcessCanvas';
import { LineageControls } from '../components/controls/LineageControls';
import { LineagePanel } from '../components/canvas/LineagePanel';
import { FamilyControls } from '../components/controls/FamilyControls';
import { FamilyPanel } from '../components/canvas/FamilyPanel';
import { DriftControls } from '../components/controls/DriftControls';
import { DriftPanel } from '../components/canvas/DriftPanel';
import { ColourControls } from '../components/controls/ColourControls';
import { ColourPanel } from '../components/canvas/ColourPanel';
import { ArchiveControls } from '../components/controls/ArchiveControls';
import { ArchivePanel } from '../components/canvas/ArchivePanel';
import { VariationsRail } from '../components/variations/VariationsRail';
import { useStudySession } from './useStudySession';
import { exportComposition } from '../lib/exportComposition';
import { DEFAULT_EXPORT } from '../lib/exportComposition';
import type { ExportOptions } from '../lib/exportComposition';
import type { ExportFormat } from '../lib/exportComposition';
import type { ColourRecipe, CompositionDocument, DriftRecipe, FamilyFormat, ImageTypeKind, OperationKind, ProcessingPass, TypographyKind } from '../domain/document';
import { applyOperation } from '../engine/operations';
import { applyImageType } from '../engine/imageType';
import { applyTypography } from '../engine/typography';
import { generateFamily } from '../engine/family';
import { withColour } from '../engine/colour';
import { archiveTags, filterArchive } from '../engine/archive';
import type { ArchiveFilter } from '../engine/archive';
import { applySpaceZones } from '../engine/space';
import { originalImageDocument, withProcessedImage } from '../engine/processDocument';
import type { ImageAsset } from '../domain/composition';

const DEFAULT_DRIFT: DriftRecipe = { mode: 'SLIP', duration: 4, speed: 1, intensity: .65, direction: 'RIGHT', loop: true, seed: 1 };
const DEFAULT_COLOUR: ColourRecipe = { mode: 'MONOCHROME', intensity: .8, registration: .25, seed: 1 };

export function App() {
  const study = useStudySession();
  const { session, document } = study;
  const svgRef = useRef<SVGSVGElement>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>(DEFAULT_EXPORT);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [view, setView] = useState<WorkspaceView>('compose');
  const [zoom, setZoom] = useState(1);
  const [commandOpen, setCommandOpen] = useState(false);
  const [focus, setFocus] = useState(false);
  const [directKind, setDirectKind] = useState<OperationKind>('FRACTURE');
  const [directCategory, setDirectCategory] = useState<DirectCategory>('operation');
  const [relationKind, setRelationKind] = useState<ImageTypeKind>('TYPE_MASK');
  const [typographyKind, setTypographyKind] = useState<TypographyKind>('CHARACTER_DISPLACEMENT');
  const [readability, setReadability] = useState(.6);
  const [directIntensity, setDirectIntensity] = useState(.6);
  const [directSeedText, setDirectSeedText] = useState('1');
  const [directPreviewing, setDirectPreviewing] = useState(false);
  const [processPasses, setProcessPasses] = useState<ProcessingPass[]>([]);
  const [processStage, setProcessStage] = useState(0);
  const [processAsset, setProcessAsset] = useState<ImageAsset | null>(null);
  const [processBusy, setProcessBusy] = useState(false);
  const [processError, setProcessError] = useState('');
  const [family, setFamily] = useState<CompositionDocument[]>([]);
  const [familySelected, setFamilySelected] = useState<FamilyFormat>('POSTER');
  const [familyError, setFamilyError] = useState('');
  const [driftRecipe, setDriftRecipe] = useState<DriftRecipe>(() => document.drift ?? { ...DEFAULT_DRIFT, seed: document.seed });
  const [colourRecipe, setColourRecipe] = useState<ColourRecipe>(() => document.colour ?? { ...DEFAULT_COLOUR, seed: document.seed });
  const [compareColour, setCompareColour] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>({ system: 'ALL', operation: 'ALL', period: 'ALL', order: 'NEWEST' });
  const archiveOperations = useMemo(() => [...new Set(study.variations.flatMap((item) => archiveTags(item.document)))].sort(), [study.variations]);
  const archiveItems = useMemo(() => filterArchive(study.variations, archiveFilter, new Date()), [study.variations, archiveFilter]);
  const [showProcessOriginal, setShowProcessOriginal] = useState(false);
  const processSource = document.processing?.original ?? document.source.image;
  const directSeed = /^\d{1,6}$/.test(directSeedText) ? Number(directSeedText) : null;
  const directDocument = useMemo(() => {
    if (!directPreviewing || directSeed === null) return document;
    try {
      if (directCategory === 'relation') {
        const recipe = { kind: relationKind, intensity: directIntensity, seed: directSeed };
        if (!study.canRelate(recipe)) return document;
        const related = applyImageType(document, session.locks, recipe);
        return related.spaceZones?.length ? applySpaceZones(related, related.spaceZones, session.locks) : related;
      }
      if (directCategory === 'typography') {
        if (!study.canTypography) return document;
        return applyTypography(document, session.locks, { kind: typographyKind, intensity: directIntensity, readability, seed: directSeed });
      }
      if (!study.canDirect) return document;
      const operated = applyOperation(document, session.locks, { kind: directKind, intensity: directIntensity, seed: directSeed });
      return operated.spaceZones?.length ? applySpaceZones(operated, operated.spaceZones, session.locks) : operated;
    }
    catch { return document; }
  }, [document, session.locks, directPreviewing, directSeed, directKind, relationKind, typographyKind, readability, directCategory, directIntensity, study.canDirect, study.canRelate, study.canTypography]);

  useEffect(() => {
    setProcessPasses(document.processing?.passes ?? []);
    setProcessStage(document.processing?.passes.length ?? 0);
    setProcessAsset(null);
  }, [document]);

  useEffect(() => { setFamily([]); setFamilySelected('POSTER'); setFamilyError(''); }, [document]);
  useEffect(() => { setDriftRecipe(document.drift ?? { ...DEFAULT_DRIFT, seed: document.seed }); }, [document]);
  useEffect(() => { setColourRecipe(document.colour ?? { ...DEFAULT_COLOUR, seed: document.seed }); setCompareColour(false); }, [document]);
  const motionRecipe = useMemo(() => ({ ...driftRecipe, locks: session.locks }), [driftRecipe, session.locks]);
  const colourDocument = useMemo(() => withColour(document, colourRecipe), [document, colourRecipe]);

  function makeFamily() {
    try { setFamily(generateFamily(document)); setFamilySelected('POSTER'); setFamilyError(''); }
    catch (cause) { setFamilyError(cause instanceof Error ? cause.message : 'The visual family could not be generated.'); }
  }

  useEffect(() => {
    if (view !== 'process' || !processSource || processStage === 0) { setProcessAsset(null); setProcessBusy(false); setProcessError(''); return; }
    let cancelled = false;
    const controller = new AbortController();
    setProcessBusy(true); setProcessError(''); setProcessAsset(null);
    import('../lib/processImage').then(({ processImage }) => processImage(processSource, processPasses.slice(0, processStage), controller.signal)).then((asset) => {
      if (!cancelled) { setProcessAsset(asset); setProcessBusy(false); }
    }).catch((cause) => {
      if (!cancelled) { setProcessError(cause instanceof Error ? cause.message : 'The pass could not be rendered.'); setProcessBusy(false); }
    });
    return () => { cancelled = true; controller.abort(); };
  }, [view, processSource, processPasses, processStage]);

  const processDocument = useMemo(() => {
    if (showProcessOriginal || processStage === 0 || !processAsset) return originalImageDocument(document);
    return withProcessedImage(document, processAsset, processPasses.slice(0, processStage));
  }, [document, showProcessOriginal, processStage, processAsset, processPasses]);

  function changeProcessPasses(passes: ProcessingPass[]) {
    setProcessPasses(passes);
    setProcessStage(passes.length);
    setShowProcessOriginal(false);
  }

  useEffect(() => {
    if (!exportMessage || exporting) return;
    const timer = window.setTimeout(() => setExportMessage(''), 6000);
    return () => window.clearTimeout(timer);
  }, [exportMessage, exporting]);

  async function handleExport(format: ExportFormat) {
    if (!svgRef.current || exporting) return;
    setExporting(true);
    setExportMessage('EXPORTING…');
    try {
      await exportComposition(svgRef.current, format, `study-01_${document.system.toLowerCase()}_${String(document.seed).padStart(6, '0')}_${document.familyAsset?.format.toLowerCase() ?? 'poster'}${exportOptions.transparent ? '_transparent' : ''}`, exportOptions);
      setExportMessage(`${format.toUpperCase()} DOWNLOADED`);
    } catch (cause) {
      setExportMessage(cause instanceof Error ? cause.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }
  const commands: StudyCommand[] = [
    ...WORKSPACE_MODES.flatMap((workspace) => workspace.modes.map((mode) => ({ id: mode.id, label: `${workspace.title} / ${mode.label}`, run: () => setView(mode.id) }))),
    { id: 'generate', label: `Generate ${session.system}`, shortcut: 'G', disabled: !study.canGenerate, run: study.generate },
    { id: 'mutate', label: 'Mutate current study', shortcut: 'M', disabled: !study.canMutate, run: study.mutate },
    { id: 'save', label: 'Save variation to archive', shortcut: '⌘ / Ctrl S', disabled: !study.storageReady || study.saving, run: study.saveCurrentVariation },
    { id: 'undo', label: 'Undo', shortcut: '⌘ / Ctrl Z', disabled: !study.canUndo, run: study.undo },
    { id: 'redo', label: 'Redo', shortcut: '⌘ / Ctrl Shift Z', disabled: !study.canRedo, run: study.redo },
    { id: 'focus', label: focus ? 'Exit focus mode' : 'Focus on artwork', shortcut: 'F', run: () => setFocus((value) => !value) },
    { id: 'fit', label: 'Fit composition to canvas', shortcut: '0', run: () => { setZoom(1); setView('compose'); } },
  ];
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && key === 'k') { event.preventDefault(); setCommandOpen((value) => !value); return; }
      if (commandOpen) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)) return;
      if (modifier && key === 'z') { event.preventDefault(); if (event.shiftKey) study.redo(); else study.undo(); }
      else if (modifier && key === 's') { event.preventDefault(); void study.saveCurrentVariation(); }
      else if (!modifier && !event.altKey) {
        if (key === 'g') study.generate();
        else if (key === 'm') study.mutate();
        else if (key === 'f') setFocus((value) => !value);
        else if (key === 'escape') setFocus(false);
        else if ((key === '+' || key === '=') && (view === 'compose' || view === 'output')) { event.preventDefault(); setZoom((value) => Math.min(2, value + .25)); }
        else if (key === '-' && (view === 'compose' || view === 'output')) { event.preventDefault(); setZoom((value) => Math.max(.75, value - .25)); }
        else if (key === '0') setZoom(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commandOpen, study, view]);
  return (
    <>
      {commandOpen && <CommandPalette commands={commands} onClose={() => setCommandOpen(false)} />}
      {study.error && view !== 'direct' && view !== 'space' && view !== 'compose' && view !== 'proof' && <p className="session-error" role="alert">{study.error}</p>}
      <a className="skip-link" href="#composition">Skip to composition</a>
      <Workspace
        focus={focus}
        header={<Header view={view} onViewChange={setView} onCommands={() => setCommandOpen(true)} saveStatus={study.autosaveStatus} />}
        controls={view === 'output'
          ? <OutputControls document={document} options={exportOptions} busy={exporting} message={exportMessage} onChange={setExportOptions} onExport={handleExport} />
          : view === 'family'
          ? <FamilyControls document={document} family={family} selected={familySelected} error={familyError} onGenerate={makeFamily} onSelect={setFamilySelected} />
          : view === 'archive'
          ? <ArchiveControls total={study.variations.length} visible={archiveItems.length} filter={archiveFilter} operations={archiveOperations} onChange={setArchiveFilter} />
          : view === 'drift'
          ? <DriftControls document={document} recipe={driftRecipe} onChange={setDriftRecipe} onAttach={() => study.applyDrift({ ...driftRecipe, locks: { ...session.locks } })} />
          : view === 'colour'
          ? <ColourControls document={document} recipe={colourRecipe} onChange={setColourRecipe} onApply={() => study.applyColour(colourRecipe)} />
          : view === 'evolve'
          ? <LineageControls document={document} />
          : view === 'process'
          ? <ProcessControls passes={processPasses} stage={processStage} busy={processBusy} error={processError} canProcess={study.canProcess} hasProcessedImage={!!document.processing} onChange={changeProcessPasses} onStageChange={(stage) => { setProcessStage(stage); setShowProcessOriginal(false); }} onApply={() => { if (processAsset && !processBusy) study.applyProcessed(processAsset, processPasses.slice(0, processStage)); }} onRestore={study.restoreOriginalImage} />
          : view === 'direct'
          ? <DirectControls
              category={directCategory} relationKind={relationKind} typographyKind={typographyKind} readability={readability}
              analysis={document.source.image?.analysis} error={study.error} kind={directKind} intensity={directIntensity} seedText={directSeedText}
              canDirect={study.canDirect} canRelate={study.canRelate} canTypography={study.canTypography}
              canUndo={study.canUndo} canRedo={study.canRedo} hasDirectBase={study.hasDirectBase} previewing={directPreviewing}
              onCategoryChange={(category) => { setDirectCategory(category); setDirectPreviewing(false); }}
              onRelationChange={(kind) => { setRelationKind(kind); setDirectPreviewing(false); }}
              onTypographyChange={(kind) => { setTypographyKind(kind); setDirectPreviewing(false); }}
              onReadabilityChange={setReadability}
              onKindChange={(kind) => { setDirectKind(kind); if (kind === 'ACCIDENT') setDirectIntensity(.5); setDirectPreviewing(false); }}
              onIntensityChange={setDirectIntensity} onSeedChange={setDirectSeedText} onPreview={() => setDirectPreviewing(true)}
              onApply={(recipe) => { study.applyDirect(recipe); setDirectPreviewing(false); }}
              onApplyRelation={(recipe) => { study.applyRelation(recipe); setDirectPreviewing(false); }}
              onApplyTypography={(recipe) => { study.treatTypography(recipe); setDirectPreviewing(false); }}
              onUndo={() => { study.undo(); setDirectPreviewing(false); }}
              onRedo={() => { study.redo(); setDirectPreviewing(false); }}
              onReset={() => { study.resetDirect(); setDirectPreviewing(false); }}
            />
          : <ControlsPanel
            input={session.input}
            system={session.system}
            onSelectSystem={study.selectSystem}
            onUpdateInput={study.updateInput}
            seed={study.seedText}
            onSeedChange={study.setSeedText}
            onGenerate={study.generate}
            canGenerate={study.canGenerate}
            imageLoading={study.imageLoading}
            error={study.error}
            onSelectImage={study.selectImage}
            onRemoveImage={study.removeImage}
            onUseSample={study.useSampleImage}
          />}
        canvas={view === 'compose' || view === 'output'
          ? <CompositionCanvas document={document} previous={view === 'compose' ? study.previousDocument : undefined} zoom={zoom} onZoomChange={setZoom} dirty={study.dirty} generationCount={study.generationCount} svgRef={svgRef} focus={focus} onToggleFocus={() => setFocus((value) => !value)} />
          : view === 'proof'
            ? <ProofSheet proofs={study.proofs} selectedIds={study.selectedProofIds} canProof={study.canProof} storageReady={study.storageReady} saving={study.saving} focus={focus} onToggleFocus={() => setFocus((value) => !value)} onGenerate={study.makeProof} onSelect={study.toggleProofSelection} onKeep={study.keepProof} onReject={study.rejectProof} onDevelop={(id) => { study.developProof(id); setView('compose'); }} />
            : view === 'direct'
              ? <DirectCanvas document={directDocument} previewing={directPreviewing} method={directCategory} focus={focus} onToggleFocus={() => setFocus((value) => !value)} />
              : view === 'space'
                ? <SpacePanel document={document} canSpace={!study.dirty} error={study.error} focus={focus} onToggleFocus={() => setFocus((value) => !value)} onApply={study.applySpace} />
                : view === 'process'
                  ? <ProcessCanvas document={processDocument} busy={processBusy} stage={processStage} originalShown={showProcessOriginal} onToggleOriginal={() => setShowProcessOriginal((value) => !value)} focus={focus} onToggleFocus={() => setFocus((value) => !value)} />
                  : view === 'family'
                    ? <FamilyPanel family={family} selected={familySelected} focus={focus} onToggleFocus={() => setFocus((value) => !value)} onSelect={setFamilySelected} onDevelop={(selected) => { study.developFamily(selected); setView('compose'); }} />
                    : view === 'drift'
                      ? <DriftPanel document={document} recipe={motionRecipe} focus={focus} onToggleFocus={() => setFocus((value) => !value)} />
                      : view === 'archive'
                        ? <ArchivePanel items={archiveItems} focus={focus} onToggleFocus={() => setFocus((value) => !value)} onReopen={(item) => { study.restoreVariation(item); setView('compose'); }} onBranch={(item) => { study.branchVariation(item); setView('compose'); }} onDuplicate={study.duplicateVariation} onDelete={study.removeVariation} />
                      : view === 'colour'
                        ? <ColourPanel document={colourDocument} original={document} comparing={compareColour} onToggleCompare={() => setCompareColour((value) => !value)} focus={focus} onToggleFocus={() => setFocus((value) => !value)} />
                    : <LineagePanel document={document} history={study.history} variations={study.variations} onDevelop={(selected) => { study.developLineage(selected); setView('compose'); }} onCrossbreed={(base, donor, weight) => { study.crossbreed(base, donor, weight); setView('compose'); }} focus={focus} onToggleFocus={() => setFocus((value) => !value)} />}
        variations={<VariationsRail document={document} variations={study.variations} storageReady={study.storageReady} saving={study.saving} onSave={study.saveCurrentVariation} onRestore={study.restoreVariation} onRemove={study.removeVariation} />}
        footer={<LockControls locks={session.locks} onToggleLock={study.toggleLock} onMutate={study.mutate} canMutate={study.canMutate} />}
      />
    </>
  );
}
