import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { CompositionDocument, DriftRecipe } from '../../domain/document';
import { driftFrame } from '../../engine/drift';
import { exportDriftVideo } from '../../lib/exportDrift';
import { CompositionRenderer } from './CompositionRenderer';

interface DriftPanelProps { document: CompositionDocument; recipe: DriftRecipe; focus: boolean; onToggleFocus: () => void; }

export function DriftPanel({ document, recipe, focus, onToggleFocus }: DriftPanelProps) {
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const motion = useMemo(() => driftFrame(document, recipe, seconds), [document, recipe, seconds]);

  useEffect(() => { setPlaying(false); setSeconds(0); }, [document, recipe]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const started = performance.now() - seconds * 1000;
    const tick = (now: number) => {
      const next = (now - started) / 1000;
      if (next >= recipe.duration && !recipe.loop) { setSeconds(recipe.duration); setPlaying(false); return; }
      setSeconds(recipe.loop ? next % recipe.duration : next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, recipe.duration, recipe.loop]);

  async function exportVideo() {
    if (!svgRef.current || exporting) return;
    setPlaying(false); setExporting(true); setMessage('Preparing motion…');
    const previous = seconds;
    try {
      await exportDriftVideo(svgRef.current, recipe,
        (at) => flushSync(() => setSeconds(at)),
        (progress) => setMessage(`Rendering ${Math.round(progress * 100)}%`),
        `study-01_${document.system.toLowerCase()}_${String(document.seed).padStart(6, '0')}_${recipe.mode.toLowerCase()}`);
      setMessage('WebM downloaded');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Motion export failed.'); }
    finally { setSeconds(previous); setExporting(false); }
  }

  return <section className="canvas-panel drift-panel" aria-label="Motion preview">
    <div className="canvas-toolbar"><div><h2>Drift</h2><p className="proof-intro">{recipe.mode} / {document.width}×{document.height} / {recipe.duration.toFixed(1)} S</p></div><button type="button" className="tool-button" aria-pressed={focus} onClick={onToggleFocus}>{focus ? 'Exit focus' : 'Focus'}</button></div>
    <div className="canvas-stage drift-stage"><div className="artboard-frame" style={{ '--drift-ratio': document.width / document.height } as React.CSSProperties}><span className="artboard-coordinate coordinate-top mono" aria-hidden="true">TEMPORAL STUDY</span><div className="composition-paper" style={{ aspectRatio: `${document.width} / ${document.height}` }}><CompositionRenderer document={motion} svgRef={svgRef} /></div><span className="artboard-coordinate coordinate-bottom mono" aria-hidden="true">{seconds.toFixed(2)} / {recipe.duration.toFixed(2)} S</span></div></div>
    <div className="drift-transport"><button type="button" className="tool-button" disabled={exporting} onClick={() => { if (seconds >= recipe.duration) setSeconds(0); setPlaying((value) => !value); }}>{playing ? 'Pause' : 'Play'}</button><button type="button" className="tool-button" disabled={exporting} onClick={() => { setPlaying(false); setSeconds(0); }}>Reset</button><label className="mono" htmlFor="drift-scrub">SCRUB <input id="drift-scrub" type="range" min="0" max={recipe.duration} step=".01" value={seconds} disabled={exporting} onChange={(event) => { setPlaying(false); setSeconds(Number(event.target.value)); }} /></label><span className="mono">{seconds.toFixed(2)} S</span></div>
    <div className="drift-export"><button type="button" className="tool-button direct-apply" disabled={exporting} onClick={exportVideo}>Export WebM</button><span className="mono" role="status" aria-live="polite">{message || 'MOTION ONLY / STATIC EXPORT IN OUTPUT'}</span></div>
  </section>;
}
