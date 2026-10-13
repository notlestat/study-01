import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, Ref } from 'react';
import type { CompositionLocks } from '../../domain/composition';
import type { CompositionDocument } from '../../domain/document';
import { elementPose, heldElement, imageFit, linkedSelection, resetElement, transformElement, updateMaterial, removeMaterial, orderElement } from '../../engine/transform';
import type { ElementPose } from '../../engine/transform';
import { CompositionRenderer } from './CompositionRenderer';

interface Props {
  document: CompositionDocument;
  locks: CompositionLocks;
  editable: boolean;
  showGrid: boolean;
  showSafe: boolean;
  showZones: boolean;
  svgRef: Ref<SVGSVGElement>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCommit: (document: CompositionDocument) => void;
  onMaterial: (file: File) => void;
  materialLoading: boolean;
  zoom: number;
}
const fields = ['x','y','width','height','rotation'] as const;
const round = (value: number) => String(Math.round(value*100)/100);
const valuesOf = (pose: ElementPose) => Object.fromEntries(fields.map(field=>[field,round(pose[field])])) as Record<typeof fields[number],string>;
interface Gesture { id: number; elementId: string; action: string; point: [number,number]; pose: ElementPose; parent: CompositionDocument; next: CompositionDocument; }

export function CanvasEditor({ document, locks, editable, showGrid, showSafe, showZones, svgRef, canUndo, canRedo, onUndo, onRedo, onCommit, onMaterial, materialLoading, zoom }: Props) {
  const [precision,setPrecision]=useState(false);
  const [selectedId,setSelectedId]=useState('');
  const [moving,setMoving]=useState(true);
  const [proportional,setProportional]=useState(true);
  const [draft,setDraft]=useState<CompositionDocument|null>(null);
  const [values,setValues]=useState<Record<typeof fields[number],string>>({x:'0',y:'0',width:'1',height:'1',rotation:'0'});
  const [message,setMessage]=useState('');
  const [screenUnit,setScreenUnit]=useState(document.width/400);
  const [opacity,setOpacity]=useState('35');
  const svgNode=useRef<SVGSVGElement|null>(null);
  const attachSvg=useCallback((node: SVGSVGElement|null)=>{svgNode.current=node;if(typeof svgRef==='function')svgRef(node);else if(svgRef)svgRef.current=node;},[svgRef]);
  const paper=useRef<HTMLDivElement>(null);
  const gesture=useRef<Gesture|null>(null);
  const knownMaterials=useRef(new Set(document.elements.filter(item=>item.kind==='image'&&item.material).map(item=>item.id)));
  const displayed=draft??document;
  const selected=displayed.elements.find(item=>item.id===selectedId);
  const linked=selectedId==='title'&&linkedSelection(displayed,'source-image')==='title';
  const locked=!!selected&&(heldElement(selected,locks)||(linked&&locks.IMAGE));
  const pose=selected?elementPose(selected):null;
  const material=selected?.kind==='image'&&selected.material?selected:null;
  useEffect(()=>{
    gesture.current=null; setDraft(null); setMessage('');
    const materials=document.elements.filter(item=>item.kind==='image'&&item.material);
    const added=materials.find(item=>!knownMaterials.current.has(item.id));
    knownMaterials.current=new Set(materials.map(item=>item.id));
    if (added) { setSelectedId(added.id); setPrecision(true); }
    else if (!document.elements.some(item=>item.id===selectedId)) setSelectedId('');
  },[document]);
  useEffect(()=>{
    const element=displayed.elements.find(item=>item.id===selectedId);
    if (element) { setValues(valuesOf(elementPose(element))); setOpacity(round((element.kind==='image'?element.opacity??1:1)*100)); }
  },[displayed,selectedId]);
  useEffect(()=>{
    const node=paper.current;
    if(!node) return;
    const update=()=>{ const width=node.getBoundingClientRect().width; if(width>0)setScreenUnit(document.width/width); };
    update(); const observer=new ResizeObserver(update); observer.observe(node);
    return ()=>observer.disconnect();
  },[document.width,zoom]);
  function cancel() {
    const active=gesture.current;
    gesture.current=null; setDraft(null); setMessage('Adjustment cancelled.');
    if (active&&paper.current?.hasPointerCapture(active.id)) paper.current.releasePointerCapture(active.id);
  }
  useEffect(()=>{
    const onKey=(event: KeyboardEvent)=>{
      if (!gesture.current) return;
      if (event.key==='Escape'||((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z')) { event.preventDefault(); event.stopImmediatePropagation(); cancel(); }
    };
    window.addEventListener('keydown',onKey,true);
    return ()=>window.removeEventListener('keydown',onKey,true);
  },[]);
  const point=(event: ReactPointerEvent): [number,number]=>{
    const matrix=svgNode.current?.getScreenCTM();
    if (!matrix) throw new Error('The canvas coordinate system is unavailable.');
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    return [p.x,p.y];
  };
  function begin(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button!==0||gesture.current) return;
    const target=event.target as Element;
    const handle=target.closest('[data-transform-handle]')?.getAttribute('data-transform-handle');
    const id=handle?selectedId:linkedSelection(document,target.closest('[data-element]')?.getAttribute('data-element')??'');
    const element=document.elements.find(item=>item.id===id);
    if (!element) { setSelectedId(''); return; }
    setSelectedId(id); setMessage('');
    paper.current?.focus({preventScroll:true});
    if (!editable) { setMessage('Generate changed inputs before editing this study.'); return; }
    if (heldElement(element,locks)||(id==='title'&&linkedSelection(document,'source-image')==='title'&&locks.IMAGE)) { setMessage('This layer is locked. Release its lock to adjust it.'); return; }
    if (!moving&&!handle) return;
    event.preventDefault();
    gesture.current={id:event.pointerId,elementId:id,action:handle??'move',point:point(event),pose:elementPose(element),parent:document,next:document};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const active=gesture.current;
    if (!active||active.id!==event.pointerId) return;
    event.preventDefault();
    const [x,y]=point(event),[px,py]=active.point;
    const original=active.pose;
    let next={...original};
    const dx=x-px,dy=y-py;
    if (active.action==='move') {
      next.x+=event.shiftKey&&Math.abs(dy)>Math.abs(dx)?0:dx;
      next.y+=event.shiftKey&&Math.abs(dx)>=Math.abs(dy)?0:dy;
    } else if (active.action==='rotate') {
      const cx=original.x+original.width/2,cy=original.y+original.height/2;
      const degrees=(Math.atan2(y-cy,x-cx)-Math.atan2(py-cy,px-cx))*180/Math.PI+original.rotation;
      next.rotation=event.shiftKey?Math.round(degrees/15)*15:degrees;
    } else {
      const sx=active.action.includes('e')?1:-1,sy=active.action.includes('s')?1:-1;
      const angle=original.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
      const localX=c*dx+s*dy,localY=-s*dx+c*dy;
      next.width=Math.max(1,original.width+sx*localX); next.height=Math.max(1,original.height+sy*localY);
      if (proportional!==event.shiftKey) {
        const xScale=next.width/original.width,yScale=next.height/original.height;
        const factor=Math.abs(xScale-1)>Math.abs(yScale-1)?xScale:yScale;
        next.width=Math.max(1,original.width*factor); next.height=Math.max(1,original.height*factor);
      }
      const shiftX=sx*(next.width-original.width)/2,shiftY=sy*(next.height-original.height)/2;
      next.x=original.x+c*shiftX-s*shiftY-(next.width-original.width)/2;
      next.y=original.y+s*shiftX+c*shiftY-(next.height-original.height)/2;
    }
    try {
      active.next=transformElement(active.parent,locks,active.elementId,next);
      setDraft(active.next); setMessage('Preview / release to keep, Escape to cancel.');
    } catch(cause) { setMessage(cause instanceof Error?cause.message:'Adjustment unavailable.'); }
  }
  function finish(event: ReactPointerEvent<HTMLDivElement>) {
    const active=gesture.current;
    if (!active||active.id!==event.pointerId) return;
    gesture.current=null;
    if (paper.current?.hasPointerCapture(active.id)) paper.current.releasePointerCapture(active.id);
    setDraft(null);
    if (active.next!==active.parent) { onCommit(active.next); setMessage('Adjustment kept.'); }
  }
  function attempt(work:()=>CompositionDocument) {
    try { const next=work(); if(next!==document) onCommit(next); setMessage(''); return true; }
    catch(cause) { setMessage(cause instanceof Error?cause.message:'Adjustment unavailable.'); return false; }
  }
  function applyValues() {
    const kept=attempt(()=>{
      if (fields.some(field=>!values[field].trim())) throw new Error('Complete the position, size and angle fields.');
      const next=Object.fromEntries(fields.map(field=>[field,Number(values[field])])) as unknown as ElementPose;
      return transformElement(document,locks,selectedId,next);
    });
    if (kept) paper.current?.focus({preventScroll:true});
  }
  function changeValue(field: typeof fields[number],value: string) {
    setValues(current=>{
      const next={...current,[field]:value};
      if (proportional&&pose&&Number.isFinite(Number(value))&&Number(value)>0) {
        if(field==='width') next.height=round(Number(value)*pose.height/pose.width);
        if(field==='height') next.width=round(Number(value)*pose.width/pose.height);
      }
      return next;
    });
  }
  function handleKey(event: React.KeyboardEvent, field: 'width' | 'rotation') {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault(); event.stopPropagation(); setPrecision(true);
    requestAnimationFrame(() => paper.current?.closest('.canvas-panel')?.querySelector<HTMLInputElement>(`input[aria-label="Element ${field}"]`)?.focus());
  }
  return <>
    <div className="canvas-edit-tools" role="group" aria-label="Canvas editing tools">
      <button type="button" className="tool-button" aria-pressed={moving} onClick={()=>setMoving(value=>!value)} title="Drag elements / V">Move</button>
      <label className="sr-only" htmlFor="canvas-element">Select canvas element</label><select className="element-select mono" id="canvas-element" aria-label="Select canvas element" value={selectedId} onChange={event=>{setSelectedId(linkedSelection(document,event.target.value));setPrecision(true);setMessage('');}}><option value="">Select an element</option>{document.elements.filter(item=>!(linkedSelection(document,'source-image')==='title'&&item.id==='source-image')).map(item=><option value={item.id} key={item.id}>{item.kind==='image'&&item.material?`Material / ${item.asset.name}`:item.id.replaceAll('-',' ')}</option>)}</select>
      <button type="button" className="tool-button" disabled={!canUndo} onClick={onUndo} title="Ctrl Z / Cmd Z">Undo</button><button type="button" className="tool-button" disabled={!canRedo} onClick={onRedo} title="Ctrl Shift Z / Cmd Shift Z / Ctrl Y">Redo</button>
      <label className={`tool-button material-import${!editable||materialLoading||locks.TEXTURE||locks.GRID?' is-disabled':''}`}>Import texture<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" aria-label="Import local texture" disabled={!editable||materialLoading||locks.TEXTURE||locks.GRID} onChange={event=>{const file=event.target.files?.[0];if(file)onMaterial(file);event.target.value='';}} /></label>
      <span className="mono">{materialLoading?'READING TEXTURE':selected?locked?'LOCKED':linked?'IMAGE × TYPE':selected.kind.toUpperCase():'CLICK / DRAG / REFINE'}</span>
    </div>
    <div className="canvas-stage editor-stage"><div className="artboard-frame" style={{ zoom, '--artboard-ratio': document.width/document.height } as React.CSSProperties}><span className="artboard-coordinate coordinate-top mono" aria-hidden="true">{material?'LOCAL MATERIAL':selectedId?selectedId.toUpperCase():'000,000'}</span>
    <div ref={paper} className={`composition-paper editable-paper${moving?' is-moving':''}`} style={{aspectRatio:`${document.width} / ${document.height}`}} role="group" aria-label="Editable composition canvas" tabIndex={0} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={()=>{if(gesture.current)cancel();}} onKeyDown={event=>{
      if((event.target as Element).closest('input,select,button,[role="button"]')) return;
      if (event.key.toLowerCase()==='v'&&!event.ctrlKey&&!event.metaKey) {setMoving(true);event.stopPropagation();}
      if (event.key==='Escape') {setSelectedId('');event.stopPropagation();}
      if (!selected||!editable||locked||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
      event.preventDefault();event.stopPropagation();const next={...elementPose(selected)};const step=event.shiftKey?10:1;
      if(event.key==='ArrowLeft')next.x-=step;if(event.key==='ArrowRight')next.x+=step;if(event.key==='ArrowUp')next.y-=step;if(event.key==='ArrowDown')next.y+=step;
      attempt(()=>transformElement(document,locks,selectedId,next));
    }}>
      <CompositionRenderer document={displayed} showGrid={showGrid} showSafe={showSafe} showZones={showZones} svgRef={attachSvg} />
      {pose&&<svg className="transform-overlay" viewBox={`0 0 ${document.width} ${document.height}`} role="group" aria-label="Element transform handles"><g transform={`rotate(${pose.rotation} ${pose.x+pose.width/2} ${pose.y+pose.height/2})`}>
        <rect className="transform-outline" x={pose.x} y={pose.y} width={pose.width} height={pose.height}/>
        {editable&&!locked&&<><line className="transform-stem" x1={pose.x+pose.width/2} x2={pose.x+pose.width/2} y1={pose.y} y2={pose.y-26*screenUnit}/><g data-transform-handle="rotate" role="button" tabIndex={0} aria-label="Rotate selected element" onKeyDown={event=>handleKey(event,'rotation')}><circle className="transform-hit rotate-handle" cx={pose.x+pose.width/2} cy={pose.y-26*screenUnit} r={13*screenUnit} /><circle className="transform-knob" cx={pose.x+pose.width/2} cy={pose.y-26*screenUnit} r={4*screenUnit} /></g>{[['nw',pose.x,pose.y],['ne',pose.x+pose.width,pose.y],['se',pose.x+pose.width,pose.y+pose.height],['sw',pose.x,pose.y+pose.height]].map(([name,x,y])=><g key={name} data-transform-handle={name} role="button" tabIndex={0} aria-label={`Resize ${name} corner`} onKeyDown={event=>handleKey(event,'width')}><rect className="transform-hit" x={Number(x)-13*screenUnit} y={Number(y)-13*screenUnit} width={26*screenUnit} height={26*screenUnit} /><rect className="transform-knob" x={Number(x)-3*screenUnit} y={Number(y)-3*screenUnit} width={6*screenUnit} height={6*screenUnit} /></g>)}</>}
      </g></svg>}
    </div>
    <span className="artboard-coordinate coordinate-bottom mono" aria-hidden="true">{document.system} / {String(document.seed).padStart(6,'0')}</span></div></div>
    <details className="canvas-inspector" open={precision} onToggle={event=>setPrecision(event.currentTarget.open)}><summary>Position / size / rotation{pose&&<span className="mono">{round(pose.width)} × {round(pose.height)} / {round(pose.rotation)}°</span>}</summary>
      {pose?<form className="transform-fields" onSubmit={event=>{event.preventDefault();applyValues();}}><fieldset disabled={!editable||locked}>{fields.map(field=><label key={field}><span className="mono">{field==='rotation'?'ANGLE °':field.toUpperCase()}</span><input aria-label={`Element ${field}`} type="number" step="any" value={values[field]} min={field==='width'||field==='height'?1:undefined} onChange={event=>changeValue(field,event.target.value)} /></label>)}<label className="grid-control aspect-control"><input type="checkbox" checked={proportional} onChange={event=>setProportional(event.target.checked)}/>Keep ratio</label><button type="submit" className="tool-button">Apply</button><button type="button" className="tool-button" disabled={!selected?.transform} onClick={()=>attempt(()=>resetElement(document,locks,selectedId))}>Reset placement</button><button type="button" className="tool-button" onClick={()=>attempt(()=>orderElement(document,locks,selectedId,'FRONT'))}>Bring to front</button><button type="button" className="tool-button" onClick={()=>attempt(()=>orderElement(document,locks,selectedId,'BACK'))}>Send to back</button></fieldset>
      {selected?.kind==='image'&&!linked&&<label className="image-fit-control">Image fit<select aria-label="Selected image fit" disabled={!editable||locked} value={selected.fit} onChange={event=>attempt(()=>imageFit(document,locks,selectedId,event.target.value as 'contain'|'cover'))}><option value="cover">Crop to frame</option><option value="contain">Whole image</option></select></label>}
      {material&&<div className="material-fields"><label>Opacity %<input aria-label="Material opacity" disabled={!editable||locked} type="number" min="0" max="100" value={opacity} onChange={event=>setOpacity(event.target.value)} /></label><label>Blend<select aria-label="Material blend" disabled={!editable||locked} value={material.material!.blend} onChange={event=>attempt(()=>updateMaterial(document,locks,selectedId,(material.opacity??1),event.target.value as 'normal'|'multiply'|'screen'))}><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="normal">Normal</option></select></label><button type="button" className="tool-button" disabled={!editable||locked||!opacity.trim()} onClick={()=>attempt(()=>updateMaterial(document,locks,selectedId,Number(opacity)/100,material.material!.blend))}>Apply opacity</button><button type="button" className="tool-button" disabled={!editable||locked} onClick={()=>attempt(()=>removeMaterial(document,locks,selectedId))}>Remove texture</button></div>}
      </form>:<p className="field-help">Select artwork to adjust its position, size or rotation. Arrow keys nudge; Shift makes larger steps.</p>}
      <p className="canvas-edit-status mono" role="status">{message||(!editable?'VIEW ONLY':locked?'RELEASE LOCK TO ADJUST':selected?'SHIFT / CONSTRAIN MOVEMENT OR SNAP ROTATION':'LOCAL TEXTURES / ORIGINALS PRESERVED')}</p>
    </details>
  </>;
}
