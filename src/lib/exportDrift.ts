import type { DriftRecipe } from '../domain/document';
import { downloadBlob, portableSvg } from './exportComposition';

/** Record the same SVG artwork used by the preview as a local browser video. */
export async function exportDriftVideo(
  svg: SVGSVGElement,
  recipe: DriftRecipe,
  renderAt: (seconds: number) => void,
  onProgress: (fraction: number) => void,
  filename: string,
): Promise<void> {
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser cannot record a WebM video.');
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('WebM export is unavailable in this browser.');
  const view = svg.viewBox.baseVal;
  const scale = Math.min(1, 900 / Math.max(view.width, view.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(view.width * scale);
  canvas.height = Math.round(view.height * scale);
  const context = canvas.getContext('2d');
  if (!context || !canvas.captureStream) throw new Error('Canvas video recording is unavailable.');
  const fps = 12;
  let stream = canvas.captureStream(0);
  let captureTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
  if (!captureTrack || typeof captureTrack.requestFrame !== 'function') {
    stream.getTracks().forEach((track) => track.stop());
    stream = canvas.captureStream(fps);
    captureTrack = undefined;
  }
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => reject(new Error('The motion recording failed.'));
    recorder.onstop = () => chunks.length
      ? resolve(new Blob(chunks, { type: mimeType }))
      : reject(new Error('The browser returned an empty video.'));
  });
  const cache = new Map<string, string>();
  const frames = Math.ceil(recipe.duration * fps);
  const drawAt = async (seconds: number) => {
    renderAt(seconds);
    const vector = await portableSvg(svg, cache);
    const url = URL.createObjectURL(vector);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    } finally { URL.revokeObjectURL(url); }
  };
  try {
    // Prepare the first fully embedded frame before starting the recording clock.
    await drawAt(0);
    recorder.start();
    captureTrack?.requestFrame();
    const start = performance.now();
    onProgress(0);
    for (let index = 1; index <= frames; index++) {
      const targetTime = start + index * 1000 / fps;
      const wait = targetTime - performance.now();
      if (wait > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, wait));
      await drawAt(Math.min(recipe.duration, index / fps));
      captureTrack?.requestFrame();
      onProgress(index / frames);
    }
    recorder.stop();
    const video = await stopped;
    downloadBlob(video, `${filename}.webm`);
  } catch (cause) {
    if (recorder.state !== 'inactive') recorder.stop();
    // Consume the stop event even after an earlier frame failed.
    void stopped.catch(() => undefined);
    throw cause;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}
