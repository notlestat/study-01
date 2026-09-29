import { Workspace } from '../components/shell/Workspace';
import { Header } from '../components/shell/Header';
import { ControlsPanel } from '../components/controls/ControlsPanel';
import { LockControls } from '../components/controls/LockControls';
import { CompositionCanvas } from '../components/canvas/CompositionCanvas';
import { VariationsRail } from '../components/variations/VariationsRail';
import { useStudySession } from './useStudySession';

export function App() {
  const study = useStudySession();
  const { session, document } = study;
  return (
    <>
      <a className="skip-link" href="#composition">Skip to composition</a>
      <Workspace
        header={<Header />}
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
        canvas={<CompositionCanvas document={document} dirty={study.dirty} generationCount={study.generationCount} />}
        variations={<VariationsRail document={document} />}
        footer={<LockControls locks={session.locks} onToggleLock={study.toggleLock} />}
      />
    </>
  );
}
