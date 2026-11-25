import {panelMaterials} from '../src/geometry/banding.ts';
import {addSimpleDoors} from '../src/commands/simple-doors.ts';
import {addMetalDrawer,duplicateDrawers,removeMetalDrawer,setDrawerInternal} from '../src/commands/drawers.ts';
import {cabinetForExport} from '../src/cnc/sheet-export.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {setBanding} from '../src/commands/materials.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {edgeProduct} from '../src/catalogue/materials.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {serialize,deserialize} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
import {constructionOwner} from '../src/domain/construction-selection.ts';
import {flattenParts,flatPreview} from '../src/cnc/parts.ts';
import {checkBandingClearance} from '../src/rules/banding-clearance.ts';
const pin=(n:number)=>({id:`generic-edge-${n}`,revision:'1'});
test('generic band thickness accepts 0.1–20 mm and rejects unsupported values/revisions',()=>{
 for(const n of [.1,.8,1,2,3.5,19.9,20])assert.equal(edgeProduct(pin(n)).thickness,n);
 for(const id of ['generic-edge-0','generic-edge-20.1','generic-edge-02','generic-edge-1.11','generic-edge-NaN'])assert.throws(()=>edgeProduct({id,revision:'1'}));
 assert.throws(()=>edgeProduct({...pin(20),revision:'2'}));
});
test('20 mm strips preserve every finished datum and fitting location, with an actual smaller core',()=>{
 const c=setCabineo(createCabinet(),'cabineo-8'),before=evaluate(c);
 for(const role of ['left','right','top','bottom']){
  const p=before.panels.find(p=>p.role===role)!,edge=p.edges.find(e=>e.label==='Front')!;
  const next=setBanding(c,p.id,edge.key,pin(20)),after=evaluate(next),board=after.panels.find(b=>b.id===p.id)!;
  assert.deepEqual(after.panels.map(b=>[b.id,b.size,b.center]),before.panels.map(b=>[b.id,b.size,b.center]));
  assert.deepEqual(after.cabineo,before.cabineo);assert.deepEqual(after.openings,before.openings);
  assert.equal(board.coreSize[2],p.size[2]-20);
  const volume=(v:number[])=>v.reduce((a,b)=>a*b,1);
  assert.equal(volume(board.coreSize)+board.edges.filter(e=>e.product).reduce((sum,e)=>sum+volume(e.size),0),volume(p.size));
  assert.deepEqual(readSimpleCabinet(serialize(next)),next);
 }
});
test('four thick bands form disjoint strips and a core within the original envelope',()=>{
 let c=createCabinet();const p=evaluate(c).panels.find(p=>p.role==='back')!;
 for(const edge of p.edges)c=setBanding(c,p.id,edge.key,pin(20));
 const board=evaluate(c).panels.find(b=>b.id===p.id)!;
 const boxes=[{size:board.coreSize,center:board.coreCenter},...board.edges];
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(boxes[i].size.some((n,a)=>Math.abs(boxes[i].center[a]-boxes[j].center[a])>=(n+boxes[j].size[a])/2-.0001));
 assert.deepEqual(deserialize(serialize(c)),c);
});
test('band edits, removal and invalid core dimensions preserve Undo/Redo and native identities',()=>{
 const c=createCabinet(),p=evaluate(c).panels.find(p=>p.role==='left')!,edge=p.edges.find(e=>e.label==='Front')!,store=new CabinetStore(c);
 assert.ok(store.commit(setBanding(c,p.id,edge.key,pin(20))));const banded=store.getSnapshot().committed;
 store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,banded);
 assert.equal(constructionOwner(c,edge.id),edge.id);
 assert.ok(store.commit(setBanding(banded,p.id,edge.key,null)));assert.deepEqual(store.getSnapshot().committed.banding,{});
 const small={...c,envelope:{...c.envelope,depth:30}},noCore=setBanding(setBanding(small,p.id,'u-min',pin(20)),p.id,'u-max',pin(20));
 assert.throws(()=>evaluate(noCore),/no board core|depth/i);
});
test('banding cannot swallow a Cabineo hole or a machined joint; failed edits keep the valid cabinet',()=>{
 const c=setCabineo(createCabinet(),'cabineo-8'),p=evaluate(c).panels.find(p=>p.role==='bottom')!,store=new CabinetStore(c);
 assert.equal(store.commit(setBanding(c,p.id,'u-min',pin(20))),false);
 assert.match(store.getSnapshot().error!,/band reaches a hardware hole/);assert.deepEqual(store.getSnapshot().committed,c);
 const rear=p.edges.find(e=>e.label==='Rear')!;
 const banded=setBanding(c,p.id,rear.key,pin(20)),panel=evaluate(banded).panels.find(b=>b.id===p.id)!;
 const strip=panel.edges.find(e=>e.key===rear.key)!;
 assert.throws(()=>checkBandingClearance(banded,[panel],[],[{id:'seat',panelId:p.id,axis:1,face:1,origin:strip.center.map((n,i)=>n-strip.size[i]/2) as [number,number,number],size:strip.size}]),/joint or routed cut/);
});
test('CNC nesting uses the core size and retains the original bore-to-world datums',()=>{
 const c=setCabineo(createCabinet(),'cabineo-8'),p=evaluate(c).panels.find(p=>p.role==='bottom')!,front=p.edges.find(e=>e.label==='Front')!;
 const next=setBanding(c,p.id,front.key,pin(20)),parts=flattenParts(evaluate(next)),part=parts.find(p=>p.id.endsWith('/bottom'))!,before=flattenParts(evaluate(c)).find(p=>p.id===part.id)!;
 assert.equal(part.width,before.width);assert.equal(part.height,before.height-20);assert.deepEqual(part.holes,before.holes);
 const preview=flatPreview(part,part.face);assert.ok(preview);
});

test('drawer front bands reduce only the CNC core, keep drawer travel and hardware, and export separate strips',()=>{
 const base=createCabinet(),added=addMetalDrawer(base,base.compartments.id),c=added.cabinet,id=`${added.featureId}/front`,before=evaluate(c);
 let next=c;for(const key of ['u-min','u-max','v-min','v-max'] as const)next=setBanding(next,id,key,pin(1));
 const after=evaluate(next),board=after.drawerBoards!.find(p=>p.id===id)!,original=before.drawerBoards!.find(p=>p.id===id)!;
 assert.equal(board.coreSize[0],original.size[0]-2);assert.equal(board.coreSize[1],original.size[1]-2);
 assert.deepEqual(after.drawers,before.drawers);assert.deepEqual(after.drilling,before.drilling);
 const flat=flattenParts(after).find(p=>p.id===id)!;assert.equal(flat.width,board.coreSize[0]);assert.equal(flat.height,board.coreSize[1]);
 const exported=cabinetForExport(after,'Banded drawer');assert.equal(exported.parts.filter(p=>p.name.includes('band')).length,4);
 assert.deepEqual(deserialize(serialize(next)),next);
 assert.throws(()=>evaluate(setBanding(next,id,'u-min',pin(20))),/band reaches a hardware hole/);
});
test('drawer front bands copy with duplication, disappear with deletion, and survive internal conversion as dormant intent',()=>{
 const base=createCabinet(),added=addMetalDrawer(base,base.compartments.id),id=added.featureId;
 const c=setBanding(added.cabinet,`${id}/front`,'u-min',pin(1)),store=new CabinetStore(c);
 const copied=duplicateDrawers(c,[id]);assert.deepEqual(copied.cabinet.banding[`${copied.featureIds[0]}/front`],c.banding[`${id}/front`]);assert.doesNotThrow(()=>evaluate(copied.cabinet));
 assert.ok(store.commit(removeMetalDrawer(c,id)));assert.deepEqual(store.getSnapshot().committed.banding,{});store.undo();assert.deepEqual(store.getSnapshot().committed,c);
 const inner=setDrawerInternal(c,[id],true);assert.deepEqual(inner.banding,c.banding);assert.ok(!evaluate(inner).drawerBoards!.some(p=>p.id===`${id}/front`));
 const external=setDrawerInternal(inner,[id],false);assert.equal(evaluate(external).drawerBoards!.find(p=>p.id===`${id}/front`)!.edges[0].thickness,1);
});

test('rounded door and drawer fronts report the unsupported curve before generic joint collisions, without changing the design',()=>{
 const base=createCabinet(),doorCab=addSimpleDoors(setCabineo(base,'cabineo-8'),'single').cabinet;
 const rounded={...doorCab,fronts:doorCab.fronts.map(d=>({...d,cornerRadius:30}))};
 const drawerBase=createCabinet(),added=addMetalDrawer(drawerBase,drawerBase.compartments.id);
 const drawerCab={...added.cabinet,drawers:added.cabinet.drawers!.map(d=>({...d,cornerRadius:30}))};
 for(const [cabinet,id] of [[rounded,rounded.fronts[0].id],[drawerCab,`${added.featureId}/front`]] as const){
  const store=new CabinetStore(cabinet);
  assert.equal(store.commit(setBanding(cabinet,id,'u-min',pin(20))),false);
  assert.match(store.getSnapshot().error!,/banding around rounded corners is not supported/);
  assert.doesNotMatch(store.getSnapshot().error!,/joint or routed cut/);
  assert.deepEqual(store.getSnapshot().committed,cabinet);
 }
});

test('front band caps adjoining bands on vertical panels while all strips partition the unchanged envelope',()=>{
 for(const orientation of ['yz','xz','xy'] as const)for(const thickness of [.8,2,20]){
  const c=createCabinet(),size:[number,number,number]=orientation==='yz'?[18,720,560]:orientation==='xz'?[600,18,560]:[600,720,18];
  const panel={id:'board',materialRole:'carcass' as const,size,center:[310,400,300] as [number,number,number],orientation};
  for(const key of ['u-min','u-max','v-min','v-max'] as const)c.banding.board={...c.banding.board,[key]:pin(thickness)};
  const result=panelMaterials(c,panel),front=result.edges.find(e=>e.label==='Front');
  if(front){
   const lengthAxis=orientation==='yz'?1:0;
   assert.equal(front.size[lengthAxis],size[lengthAxis]);assert.equal(front.center[lengthAxis],panel.center[lengthAxis]);
   const neighbours=result.edges.filter(e=>orientation==='yz'?['Top','Bottom'].includes(e.label):['Left','Right'].includes(e.label));
   for(const edge of neighbours){const frontAxis=2;assert.ok(edge.center[frontAxis]+edge.size[frontAxis]/2<=front.center[frontAxis]-front.size[frontAxis]/2+.0001);}
  }
  const boxes=[{size:result.coreSize,center:result.coreCenter},...result.edges],volume=(v:number[])=>v.reduce((a,b)=>a*b,1);
  assert.ok(Math.abs(boxes.reduce((sum,b)=>sum+volume(b.size),0)-volume(size))<.001);
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(boxes[i].size.some((n,a)=>Math.abs(boxes[i].center[a]-boxes[j].center[a])>=(n+boxes[j].size[a])/2-.0001));
 }
});
