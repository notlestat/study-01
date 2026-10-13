import type { CompositionLocks, ImageAsset } from '../domain/composition.ts';
import type { AffineMatrix, CanvasEdit, CompositionDocument, CompositionElement, ImageElement } from '../domain/document.ts';
import { intersectsZone } from './space.ts';

import { baseBox, IDENTITY, inverse, multiply, visualBounds } from './placement.ts';
import type { ElementPose } from './placement.ts';
export { baseBox, elementPose, IDENTITY, inverse, multiply, pointAt, visualBounds } from './placement.ts';
export type { ElementPose } from './placement.ts';

export function linkedSelection(document: CompositionDocument, id: string): string {
  return ['TYPE_MASK','TYPE_KNOCKOUT'].includes(document.imageType?.kind ?? '') && ['source-image','title'].includes(id) ? 'title' : id;
}
export function heldElement(element: CompositionElement, locks: CompositionLocks): boolean {
  return locks.GRID || (element.kind === 'text' && locks.TYPE)
    || (element.kind === 'image' && (element.material ? locks.TEXTURE : locks.IMAGE))
    || (element.kind === 'texture' && locks.TEXTURE);
}
function appendEdit(document: CompositionDocument, elements: CompositionElement[], record: CanvasEdit): CompositionDocument {
  return { ...document, elements, canvasEdits: [...(document.canvasEdits ?? []), record].slice(-100) };
}
function selection(document: CompositionDocument, id: string): CompositionElement[] {
  const selected = linkedSelection(document,id);
  const group = selected === 'title' && linkedSelection(document,'source-image') === 'title';
  return document.elements.filter(element => element.id === selected || (group && element.id === 'source-image'));
}
/** Preserve original glyphs, clips and pixels; commit only an SVG affine placement. */
export function transformElement(document: CompositionDocument, locks: CompositionLocks, id: string, request: ElementPose): CompositionDocument {
  const selected = selection(document,id);
  const reference = selected.find(element=>element.id===linkedSelection(document,id));
  if (!reference) throw new Error('Select an element to adjust.');
  if (selected.some(element=>heldElement(element,locks))) throw new Error('Release the selected layer’s lock to adjust it.');
  if (Object.values(request).some(value=>!Number.isFinite(value)) || request.width < 1 || request.height < 1) throw new Error('Enter finite coordinates, a width of at least 1 px and a height of at least 1 px.');
  const box = baseBox(reference), angle = request.rotation * Math.PI/180;
  const a=Math.cos(angle)*request.width/box.width, b=Math.sin(angle)*request.width/box.width;
  const c=-Math.sin(angle)*request.height/box.height, d=Math.cos(angle)*request.height/box.height;
  const matrix: AffineMatrix = [a,b,c,d,request.x+request.width/2-a*(box.x+box.width/2)-c*(box.y+box.height/2),request.y+request.height/2-b*(box.x+box.width/2)-d*(box.y+box.height/2)];
  const delta = multiply(matrix,inverse(reference.transform ?? IDENTITY));
  const ids = new Set(selected.map(element=>element.id));
  const elements = document.elements.map(element=>ids.has(element.id) ? { ...element, transform: multiply(delta,element.transform ?? IDENTITY) } : element);
  const bounds = visualBounds(elements.find(element=>element.id===reference.id)!);
  if (!(reference.kind === 'image' && reference.material) && (document.spaceZones ?? []).some(zone=>intersectsZone(bounds,zone))) throw new Error('This placement crosses a SPACE exclusion. Move it outside the zone.');
  // Cropping at paper edges is deliberate, but keep a selectable portion visible.
  if (bounds.x+ bounds.width < 8 || bounds.y+bounds.height < 8 || bounds.x>document.width-8 || bounds.y>document.height-8) throw new Error('Keep part of the element on the paper.');
  if (matrix.every((value,index)=>Math.abs(value-(reference.transform ?? IDENTITY)[index])<1e-6)) return document;
  return appendEdit(document,elements,{elementId:reference.id,action:'TRANSFORM',matrix});
}
export function resetElement(document: CompositionDocument, locks: CompositionLocks, id: string): CompositionDocument {
  const selected=selection(document,id);
  if (selected.some(element=>heldElement(element,locks))) throw new Error('Release the selected layer’s lock to reset it.');
  if (!selected.some(element=>element.transform)) return document;
  const ids=new Set(selected.map(element=>element.id));
  const elements=document.elements.map(element=>ids.has(element.id)?{...element,transform:undefined}:element);
  const reference=elements.find(element=>element.id===linkedSelection(document,id));
  if (reference && !(reference.kind === 'image' && reference.material) && document.spaceZones?.some(zone=>intersectsZone(visualBounds(reference),zone))) throw new Error('The original placement crosses a SPACE exclusion.');
  return appendEdit(document,elements,{elementId:id,action:'RESET'});
}
export function imageFit(document: CompositionDocument, locks: CompositionLocks, id: string, fit: 'contain' | 'cover'): CompositionDocument {
  const selected=document.elements.find(element=>element.id===id);
  if (selected?.kind!=='image' || !['contain','cover'].includes(fit)) throw new Error('Select an image frame.');
  if (heldElement(selected,locks)) throw new Error('Release the image lock to adjust its fit.');
  if (selected.fit===fit) return document;
  return appendEdit(document,document.elements.map(element=>element.id===id?{...selected,fit}:element),{elementId:id,action:'IMAGE_FIT',fit});
}
export function orderElement(document: CompositionDocument, locks: CompositionLocks, id: string, direction: 'FRONT' | 'BACK'): CompositionDocument {
  const selected = selection(document, id);
  if (!selected.length) throw new Error('Select a layer to reorder.');
  if (selected.some(element => heldElement(element, locks))) throw new Error('Release the selected layer’s lock to reorder it.');
  const ids = new Set(selected.map(element => element.id));
  const rest = document.elements.filter(element => !ids.has(element.id));
  const elements = direction === 'FRONT' ? [...rest, ...selected] : [...selected, ...rest];
  if (elements.every((element, index) => element === document.elements[index])) return document;
  return appendEdit(document, elements, { elementId: linkedSelection(document, id), action: direction });
}
export function addMaterial(document: CompositionDocument, locks: CompositionLocks, asset: ImageAsset): CompositionDocument {
  if (locks.TEXTURE || locks.GRID) throw new Error('Release TEXTURE and GRID to add a material.');
  const material: ImageElement = { kind:'image',id:`material-${asset.id}`,asset,box:{x:0,y:0,width:document.width,height:document.height},fit:'cover',focalX:.5,focalY:.5,opacity:.35,material:{blend:'multiply'} };
  return appendEdit(document,[...document.elements,material],{elementId:material.id,action:'MATERIAL'});
}
export function updateMaterial(document: CompositionDocument, locks: CompositionLocks, id: string, opacity: number, blend: NonNullable<ImageElement['material']>['blend']): CompositionDocument {
  const element=document.elements.find(item=>item.id===id);
  if (element?.kind!=='image' || !element.material) throw new Error('Select a material layer.');
  if (heldElement(element,locks)) throw new Error('Release TEXTURE to adjust the material.');
  if (!Number.isFinite(opacity)||opacity<0||opacity>1||!['normal','multiply','screen'].includes(blend)) throw new Error('Choose a valid opacity and blend mode.');
  if (element.opacity===opacity&&element.material.blend===blend) return document;
  return appendEdit(document,document.elements.map(item=>item.id===id?{...element,opacity,material:{blend}}:item),{elementId:id,action:'MATERIAL'});
}
export function removeMaterial(document: CompositionDocument, locks: CompositionLocks, id: string): CompositionDocument {
  const element=document.elements.find(item=>item.id===id);
  if (element?.kind!=='image'||!element.material) throw new Error('Select a material layer.');
  if (heldElement(element,locks)) throw new Error('Release TEXTURE to remove the material.');
  return appendEdit(document,document.elements.filter(item=>item.id!==id),{elementId:id,action:'REMOVE_MATERIAL'});
}
