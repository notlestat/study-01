import { applyPassStack } from './passes';
import type { ProcessingPass } from '../domain/document';
import type { Raster } from './passes';

const worker = self as unknown as { onmessage: ((event: MessageEvent<{ raster: Raster; passes: ProcessingPass[] }>) => void) | null; postMessage: (value: unknown, transfer: Transferable[]) => void };
worker.onmessage = (event) => {
  try {
    const raster = applyPassStack(event.data.raster, event.data.passes);
    worker.postMessage({ raster }, [raster.data.buffer]);
  } catch (cause) { worker.postMessage({ error: cause instanceof Error ? cause.message : 'Processing failed.' }, []); }
};
