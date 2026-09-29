import { useEffect, useRef, useState } from 'react';
import { Workspace } from '../components/shell/Workspace';
import { Header } from '../components/shell/Header';
import { ControlsPanel } from '../components/controls/ControlsPanel';
import { LockControls } from '../components/controls/LockControls';
import { CompositionCanvas } from '../components/canvas/CompositionCanvas';
import { VariationsRail } from '../components/variations/VariationsRail';
import { useStudySession } from './useStudySession';
import { exportComposition } from '../lib/exportComposition';
import type { ExportFormat } from '../lib/exportComposition';

export function App() {
  const study = useStudySession();
  const { session, document } = study;
  const svgRef = useRef<SVGSVGElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

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
      await exportComposition(svgRef.current, format, `study-01_${document.system.toLowerCase()}_${String(document.seed).padStart(6, '0')}`);
      setExportMessage(`${format.toUpperCase()} DOWNLOADED`);
    } catch (cause) {
      setExportMessage(cause instanceof Error ? cause.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }
  return (
    <>
      <a className="skip-link" href="#composition">Skip to composition</a>
      <Workspace
        header={<Header onExport={handleExport} exporting={exporting} exportMessage={exportMessage} />}
        controls={
          <ControlsPanel
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
          />
        }
        canvas={<CompositionCanvas document={document} dirty={study.dirty} generationCount={study.generationCount} svgRef={svgRef} />}
        variations={<VariationsRail document={document} variations={study.variations} storageReady={study.storageReady} saving={study.saving} onSave={study.saveCurrentVariation} onRestore={study.restoreVariation} onRemove={study.removeVariation} />}
        footer={<LockControls locks={session.locks} onToggleLock={study.toggleLock} onMutate={study.mutate} canMutate={study.canMutate} />}
      />
    </>
  );
}
