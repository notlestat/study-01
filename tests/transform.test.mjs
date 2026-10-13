import test from 'node:test';
import assert from 'node:assert/strict';
import { generateComposition } from '../src/engine/generate.ts';
import { applyTypography } from '../src/engine/typography.ts';
import { applyImageType } from '../src/engine/imageType.ts';
import { mutateComposition } from '../src/engine/mutate.ts';
import { addMaterial, elementPose, heldElement, imageFit, resetElement, transformElement, updateMaterial, visualBounds, orderElement } from '../src/engine/transform.ts';
import { advanceHistory, stepHistory } from '../src/engine/history.ts';
import { hydrateVariation, packVariationDocument } from '../src/lib/variations.ts';
import { packRecovery, unpackRecovery } from '../src/lib/sessionRecovery.ts';
import { applySpaceZones } from '../src/engine/space.ts';
const locks={GRID:false,TYPE:false,IMAGE:false,TEXTURE:false};
const image={id:'source',name:'source.png',src:'data:image/png;base64,c291cmNl',width:1200,height:900,origin:'local'};
const material={...image,id:'material',name:'my-paper.png',src:'data:image/png;base64,bWF0ZXJpYWw='};
const input={title:'A study\nin form.',metadata:'2026',image};
const parent=generateComposition({system:'ORDER',input,seed:11});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≈ ${b}`);
test('layer order makes deliberate overlaps editable and respects linked groups and locks',()=>{
  const front=orderElement(parent,locks,'title','FRONT');
  assert.equal(front.elements.at(-1).id,'title');
  assert.deepEqual(front.elements.at(-1),parent.elements.find(item=>item.id==='title'));
  assert.throws(()=>orderElement(parent,{...locks,TYPE:true},'title','FRONT'));
  const mutated=mutateComposition(front,{...locks,GRID:true},12);
  assert.deepEqual(mutated.elements.map(item=>item.id),front.elements.map(item=>item.id));
  const linked=applyImageType(parent,locks,{kind:'TYPE_MASK',intensity:.7,seed:18});
  const back=orderElement(linked,locks,'source-image','BACK');
  assert.deepEqual(new Set(back.elements.slice(0,2).map(item=>item.id)),new Set(['source-image','title']));
});

test('canvas transforms preserve source geometry and glyph masks while moving, resizing and rotating reproducibly',()=>{
  const treated=applyTypography(parent,locks,{kind:'PROCEDURAL_EROSION',intensity:.7,readability:.5,seed:18});
  const original=structuredClone(treated);
  const title=treated.elements.find(item=>item.id==='title');
  const pose={...elementPose(title),x:140,y:230,width:390,height:260,rotation:37};
  const result=transformElement(treated,locks,'title',pose);
  const next=result.elements.find(item=>item.id==='title');
  for(const field of ['x','y','width','height','rotation'])close(elementPose(next)[field],pose[field]);
  assert.deepEqual(next.glyphs,title.glyphs);assert.deepEqual(next.erasures,title.erasures);assert.deepEqual(next.box,title.box);
  assert.deepEqual(treated,original);assert.deepEqual(transformElement(treated,locks,'title',pose),result);
  assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
  assert.equal(result.canvasEdits[0].action,'TRANSFORM');
  assert.deepEqual(resetElement(result,locks,'title').elements,treated.elements.map(item=>item.id==='title'?{...item,transform:undefined}:item));
});
test('held layers, degenerate transforms, fully lost elements and SPACE collisions reject edits',()=>{
  for(const [id,key] of [['title','TYPE'],['source-image','IMAGE'],['title','GRID']]){
    const item=parent.elements.find(item=>item.id===id);
    assert.throws(()=>transformElement(parent,{...locks,[key]:true},id,{...elementPose(item),x:100}));
  }
  const title=parent.elements.find(item=>item.id==='title');const pose=elementPose(title);
  assert.throws(()=>transformElement(parent,locks,'title',{...pose,width:0}));
  assert.throws(()=>transformElement(parent,locks,'title',{...pose,x:Infinity}));
  assert.throws(()=>transformElement(parent,locks,'title',{...pose,x:2000}));
  const blocked={...parent,spaceZones:[{id:'absence',shape:'rectangle',box:{x:100,y:200,width:400,height:400},locked:false}]};
  assert.throws(()=>transformElement(blocked,locks,'title',{...pose,x:120,y:220,width:200,height:120}));
  const edge=transformElement(parent,locks,'title',{...pose,x:-pose.width/2,y:240});
  assert.ok(visualBounds(edge.elements.find(item=>item.id==='title')).x<0);
});
test('linked type masks move as a joint image/type group and require both relevant locks released',()=>{
  for(const kind of ['TYPE_MASK','TYPE_KNOCKOUT']){
    const linked=applyImageType(parent,locks,{kind,intensity:.7,seed:18});
    const title=linked.elements.find(item=>item.id==='title');
    const next=transformElement(linked,locks,'source-image',{...elementPose(title),x:220,y:340,rotation:15});
    assert.deepEqual(next.elements.find(item=>item.id==='title').transform,next.elements.find(item=>item.id==='source-image').transform);
    assert.equal(next.imageType.kind,kind);
    assert.throws(()=>transformElement(linked,{...locks,IMAGE:true},'title',{...elementPose(title),x:100}));
  }
});
test('SPACE respects adjusted geometry without reflowing an untouched source box',()=>{
  const title=parent.elements.find(item=>item.id==='title');
  const next=transformElement(parent,locks,title.id,{...elementPose(title),x:90,y:80,width:150,height:90});
  const zone={id:'space',shape:'rectangle',box:{...title.box},locked:false};
  const flowed=applySpaceZones(next,[zone],locks);
  assert.deepEqual(flowed.elements.find(item=>item.id==='title'),next.elements.find(item=>item.id==='title'));
});
test('one committed gesture is one history entry and undo/redo preserve its exact placement',()=>{
  const item=parent.elements.find(item=>item.id==='source-image');
  const result=transformElement(parent,locks,item.id,{...elementPose(item),x:110,y:300,width:480,height:360,rotation:20});
  const history=advanceHistory({document:parent,past:[],future:[]},result);
  assert.equal(history.past.length,1);const undone=stepHistory(history,'undo');assert.equal(undone.document,parent);
  assert.equal(stepHistory(undone,'redo').document,result);
  const held=mutateComposition(result,{...locks,GRID:true,IMAGE:true},12);
  assert.deepEqual(held.elements.find(item=>item.id==='source-image'),result.elements.find(item=>item.id==='source-image'));
  assert.equal(imageFit(parent,locks,item.id,'contain').elements.find(element=>element.id==='source-image')?.asset.src,image.src);
});
test('independent local texture bytes and placements survive archive hydration and recovery',async()=>{
  let result=addMaterial(parent,locks,material);const layer=result.elements.at(-1);
  assert.equal(heldElement(layer,{...locks,TEXTURE:true}),true);assert.equal(heldElement(layer,{...locks,IMAGE:true}),false);
  result=transformElement(result,locks,layer.id,{...elementPose(layer),x:30,y:50,width:820,height:1080,rotation:12});
  result=updateMaterial(result,locks,layer.id,.42,'screen');
  const withZone={...result,spaceZones:[{id:'space',shape:'rectangle',box:{x:100,y:200,width:120,height:120},locked:false}]};
  assert.doesNotThrow(()=>transformElement(withZone,locks,layer.id,{...elementPose(result.elements.at(-1)),x:60}));
  const packed=await packVariationDocument(result);assert.equal(packed.additionalImages.length,1);
  const {variation,ownedUrls}=hydrateVariation({id:'saved',createdAt:'2026-10-13T12:00:00Z',...packed});
  try{
    assert.equal(await(await fetch(variation.document.source.image.src)).text(),'source');
    const texture=variation.document.elements.find(item=>item.id===layer.id);
    assert.equal(await(await fetch(texture.asset.src)).text(),'material');
    assert.deepEqual(texture.transform,result.elements.at(-1).transform);assert.equal(texture.material.blend,'screen');
    const snapshot={session:{system:'ORDER',input,locks},document:result,seedText:'11',undoStack:[parent],redoStack:[],directBase:null};
    const recovered=unpackRecovery(await packRecovery(snapshot));
    try{assert.equal(await(await fetch(recovered.snapshot.document.elements.at(-1).asset.src)).text(),'material');}finally{recovered.ownedUrls.forEach(url=>URL.revokeObjectURL(url));}
    const mutated=mutateComposition(result,locks,12);assert.deepEqual(mutated.elements.at(-1),result.elements.at(-1));
  }finally{ownedUrls.forEach(url=>URL.revokeObjectURL(url));}
});
