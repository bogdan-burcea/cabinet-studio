import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import init from 'replicad-opencascadejs';
import {setOC, importSTEP, measureVolume} from 'replicad';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addMetalDrawer} from '../src/commands/drawers.ts';
import {setBackPanel} from '../src/commands/back-panel.ts';
import {setPuzzleCorners} from '../src/commands/stock.ts';
import {addDivision,setInteriorFinger} from '../src/commands/interiors.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {flattenParts, groupPartsByStock} from '../src/cnc/parts.ts';
import {defaultSheet, nestStock} from '../src/cnc/nesting.ts';
import {cabinetForExport,sheetForExport,sheetsForExport, toSheetCoordinates} from '../src/cnc/sheet-export.ts';
import {Vector3} from 'three';
import {faceUpRotation} from '../src/viewport/cnc-scene.ts';
import {buildSheetSolid, exportSheetStep} from '../src/cnc/step.ts';

const require=createRequire(import.meta.url);
const wasm=readFileSync(require.resolve('replicad-opencascadejs/wasm'));
setOC(await init({wasmBinary:new Uint8Array(wasm),print:()=>{}}));

test('STEP round trip preserves independent parts, machining faces, and sheet origin',async()=>{
 const cabinet=setBackPanel(setCabineo(createCabinet(),'cabineo-8'),{mode:'groove',inset:25,thickness:6});
 const parts=[...groupPartsByStock(flattenParts(evaluate(cabinet))).values()].find(p=>p[0].thickness===18)!;
 const [sheet]=nestStock(parts,defaultSheet).sheets;
 const data=sheetForExport(sheet,defaultSheet);
 const bottom=data.parts.find(p=>p.name==='Bottom')!;
 assert.ok(bottom.bores.some(b=>b.kind==='housing'&&b.point[2]===0&&b.direction[2]===-1));
 assert.ok(bottom.pockets.some(p=>p.low===-bottom.thickness&&p.high<0));
 const file=await exportSheetStep(data);
 assert.equal((file.match(/MANIFOLD_SOLID_BREP\(/g)??[]).length,data.parts.length);
 assert.match(file,/MANIFOLD_SOLID_BREP\('Bottom'/);
 const imported=await importSTEP(new Blob([file]));
 try{
  const [min,max]=imported.boundingBox.bounds;
  assert.ok(Math.abs(max[2])<1e-6);
  assert.ok(Math.abs(min[2]+18)<1e-6);
  assert.ok(Math.abs(min[0]-defaultSheet.margin)<1e-6);
  assert.ok(max[1]<=defaultSheet.height-defaultSheet.margin+1e-6);
 }finally{imported.delete();}
 const p=parts[0];
 assert.deepEqual(toSheetCoordinates({part:p,x:10,y:20,width:p.height,height:p.width,rotated:true},1000,25,40),[10+p.height-40,955]);
});

test('STEP solid removes real bore and pocket volumes from both faces',()=>{
 const shape=buildSheetSolid({name:'Test part',origin:[10,15],width:100,height:100,thickness:18,bores:[
  {id:'top',kind:'pilot',point:[45,45,0],direction:[0,0,-1],diameter:10,depth:7,through:false},
  {id:'bottom',kind:'pilot',point:[75,50,-18],direction:[0,0,1],diameter:8,depth:5,through:false},
 ],pockets:[{points:[[20,20],[30,20],[30,30],[20,30],[20,20]],low:-3,high:0,through:false}]});
 try{
  const expected=100*100*18-7*Math.PI*25-5*Math.PI*16-10*10*3;
  assert.ok(Math.abs(measureVolume(shape)-expected)<1e-5);
 }finally{shape.delete();}
});

test('assembled STEP keeps the cabinet datum and mirrored divider fingers clear the top, bottom and back',async()=>{
 const base=createCabinet();
 const moved={...base,envelope:{...base.envelope,origin:[100,200,300] as [number,number,number]}};
 for(const mode of ['groove','rebate','finger'] as const){
  const cabinet=setBackPanel(setPuzzleCorners(moved,true),{mode,inset:35,thickness:20,fingerPitch:150});
  const joint=cabinet.carcass.corner!;
  const wide={...cabinet,carcass:{...cabinet.carcass,corner:{...joint,pitch:120}}};
  const division=addDivision(wide,wide.compartments.id,'vertical',250);
  const evaluated=evaluate(setInteriorFinger(division.cabinet,division.featureId,true,115));
  const model=cabinetForExport(evaluated,'Assembled cabinet');
  const solids=model.parts.map(buildSheetSolid);
  try{
   const back=solids[model.parts.findIndex(p=>p.name==='Back')];
   for(const [i,panel] of evaluated.panels.entries()){
    if(panel.role==='back')continue;
    const overlap=back.intersect(solids[i]);
    try{assert.ok(measureVolume(overlap)<1e-5,`${mode}: back and ${panel.role} overlap`);}
    finally{overlap.delete();}
   }
   const divider=solids[evaluated.panels.findIndex(p=>p.id===division.featureId)];
   for(const role of ['top','bottom']){
    const support=solids[evaluated.panels.findIndex(p=>p.role===role)];
    const overlap=divider.intersect(support);
    try{assert.ok(measureVolume(overlap)<1e-5,`${mode}: divider and ${role} overlap`);}
    finally{overlap.delete();}
   }
   if(mode==='groove'){
    const seats=evaluated.pockets.filter(p=>p.id.includes('/back-seat/'));
    const receiver=evaluated.pockets.filter(p=>p.id.startsWith(division.featureId+'/finger/')&&p.panelId!==division.featureId);
    const top=receiver.filter(p=>p.panelId.endsWith('/top')),bottom=receiver.filter(p=>p.panelId.endsWith('/bottom'));
    assert.ok(top.length&&bottom.length);
    assert.deepEqual(top.map(p=>[p.origin[2],p.size[2]]),bottom.map(p=>[p.origin[2],p.size[2]]));
    for(const cut of receiver){
     const seat=seats.find(s=>s.panelId===cut.panelId)!;
     const seatEnd=Math.max(seat.origin[2]+seat.size[2],...(seat.reliefs??[]).map(r=>r.center[2]+r.radius));
     const slotStart=Math.min(cut.origin[2],...(cut.reliefs??[]).map(r=>r.center[2]-r.radius));
     assert.ok(slotStart-seatEnd>=20-1e-6);
    }
    const file=await exportSheetStep(model);
    assert.equal((file.match(/MANIFOLD_SOLID_BREP\(/g)??[]).length,model.parts.length);
    const imported=await importSTEP(new Blob([file]));
    try{
     const [min,max]=imported.boundingBox.bounds;
     assert.deepEqual(min.map(Math.round),[100,-860,200]);
     assert.deepEqual(max.map(Math.round),[700,-300,920]);
    }finally{imported.delete();}
   }
  }finally{solids.forEach(s=>s.delete());}
 }
});


test('sheet STEP matches the rotated preview and writes stock and offcuts as named bodies in one product with material',async()=>{
 const stock={...defaultSheet,width:1220,height:1220};
 const evaluated=evaluate(setCabineo(createCabinet(),'cabineo-8'));
 const part=flattenParts(evaluated).find(p=>p.panel.role==='bottom')!;
 const placement={part,x:20,y:30,width:part.height,height:part.width,rotated:true};
 const sheet={placements:[placement],utilization:0};
 const cuts=[{x:650,y:40,width:350,height:550}];
 const model=sheetForExport(sheet,stock,cuts,true);
 assert.deepEqual(model.parts.map(p=>p.name),['Bottom','Offcut 1','Stock sheet']);
 const source=part.holes.find(b=>b.kind==='housing')!;
 const bore=model.parts[0].bores.find(b=>b.id===source.id)!;
 const view=new Vector3(...source.point).sub(new Vector3(...part.panel.coreCenter))
  .applyMatrix4(faceUpRotation(part,part.face,true));
 const expected=[
  placement.x+placement.width/2+view.x,
  stock.height-(placement.y+placement.height/2+view.z),
  view.y-part.thickness/2,
 ];
 assert.ok(bore.point.every((n,i)=>Math.abs(n-expected[i])<1e-6));
 const file=await exportSheetStep(model);
 assert.equal((file.match(/PROPERTY_DEFINITION\('material property','material name'/g)??[]).length,1);
 assert.equal((file.match(/DESCRIPTIVE_REPRESENTATION_ITEM\('Generic panel/g)??[]).length,1);
 for(const name of ['Bottom','Offcut 1','Stock sheet']){
  assert.ok(file.includes(`MANIFOLD_SOLID_BREP('${name}'`));
 }
 assert.equal((file.match(/ = PRODUCT\(/g)??[]).length,1);
 assert.doesNotMatch(file,/NEXT_ASSEMBLY_USAGE_OCCURRENCE/);
 const imported=await importSTEP(new Blob([file]));
 try{
  const [min,max]=imported.boundingBox.bounds;
  assert.deepEqual(min.map(Math.round),[0,0,-18]);
  assert.deepEqual(max.map(Math.round),[1220,1220,0]);
 }finally{imported.delete();}
 assert.deepEqual(sheetForExport(sheet,stock).parts.map(p=>p.name),['Bottom']);
});

test('multi-sheet STEP exports one named component per sheet with independent bodies and materials',async()=>{
 const parts=flattenParts(evaluate(createCabinet())),bottom=parts.find(p=>p.panel.role==='bottom')!,back=parts.find(p=>p.panel.role==='back')!;
 const stock={...defaultSheet,width:1220,height:1220};
 const entries=[bottom,back].map((part,i)=>({id:String(i),label:`Sheet ${i+1}`,stock,sheet:{placements:[{part,x:20,y:30,width:part.width,height:part.height,rotated:false}],utilization:0}}));
 const model=sheetsForExport(entries,new Map(),true),file=await exportSheetStep(model);
 assert.equal((file.match(/ = PRODUCT\(/g)??[]).length,2);
 assert.match(file,/PRODUCT\('Sheet 1','Sheet 1'/);assert.match(file,/PRODUCT\('Sheet 2','Sheet 2'/);
 assert.equal((file.match(/MANIFOLD_SOLID_BREP\(/g)??[]).length,4);
 assert.equal((file.match(/PROPERTY_DEFINITION\('material property','material name'/g)??[]).length,2);
 const imported=await importSTEP(new Blob([file]));try{const [min,max]=imported.boundingBox.bounds;assert.deepEqual(min.map(Math.round),[0,0,-18]);assert.deepEqual(max.map(Math.round),[2610,1220,0]);}finally{imported.delete();}
});

test('rounded drawer front builds a solid in cabinet and nested sheet exports',()=>{
 const base=createCabinet();
 const {cabinet}=addMetalDrawer(base,base.compartments.id);
 const radius=20;
 const evaluated=evaluate({...cabinet,drawers:cabinet.drawers!.map(drawer=>({...drawer,cornerRadius:radius}))});
 const front=flattenParts(evaluated).find(part=>part.label==='Drawer 1 · Slab front')!;
 const [sheet]=nestStock([front],defaultSheet).sheets;
 const models=[cabinetForExport(evaluated,'Cabinet'),sheetForExport(sheet,defaultSheet)];
 const cornerArea=radius**2*(1-8*Math.sin(Math.PI/32));
 for(const model of models){
  const part=model.parts.find(part=>part.name===front.label)!;
  const solid=buildSheetSolid({...part,bores:[]});
  try {
   assert.equal(solid.solids.length,1);
   assert.ok(Math.abs(measureVolume(solid)-(front.width*front.height-4*cornerArea)*front.thickness)<.01);
  } finally {solid.delete();}
 }
});
