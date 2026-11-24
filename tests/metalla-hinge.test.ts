import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCabinet} from '../src/domain/cabinet';
import {addSimpleDoors} from '../src/commands/simple-doors';
import {fitMetallaHinges} from '../src/commands/metalla-hinges';
import {hafeleMetalla155,defaultHinge,metallaMinimumGap} from '../src/catalogue/hinges';
import {evaluate} from '../src/geometry/evaluate';
import {serialize,deserialize} from '../src/persistence/files';
import {safeDoorAngles,safeInnerDrawerExtensions,drawerOpeningIssue} from '../src/rules/door-motion';
import {innerDrawerOpeningRepairs} from '../src/commands/clearance-repairs';
import {editRepairs} from '../src/commands/edit-repairs';
import {CabinetStore} from '../src/commands/store';
const pantry=()=>deserialize(readFileSync(new URL('./fixtures/pantry-inset-inner-drawers.json',import.meta.url),'utf8'));
test('Metalla pantry fit retains 18 mm inset doors, drawer identities and genuine collision checks',()=>{
 const c=pantry(),next=fitMetallaHinges(c,c.fronts.map(d=>d.id)),e=evaluate(next);
 assert.deepEqual(next.drawers,c.drawers);assert.deepEqual(next.fronts.map(d=>[d.id,d.placement,d.reveal,d.material]),c.fronts.map(d=>[d.id,d.placement,d.reveal,d.material]));
 assert.ok(next.fronts.every(d=>d.hinge?.cupDistance===4));assert.equal(drawerOpeningIssue(e),null);
 assert.ok(!e.issues.some(i=>['machining-hinge-plate','machining-hole-collision','machining-collision'].includes(i.code)));
 const ids=next.fronts.map(d=>d.id),opened=safeDoorAngles(e,{},ids,155);assert.equal(opened.blocked,false);
 const target={...opened.angles,...Object.fromEntries(next.drawers!.map(d=>[d.id,100]))};assert.equal(safeInnerDrawerExtensions(e,{},target).blocked,false);
 assert.equal(safeDoorAngles(e,opened.angles,ids,0).blocked,false);
 assert.equal(safeInnerDrawerExtensions(e,{},Object.fromEntries(next.drawers!.map(d=>[d.id,100]))).blocked,true);
 const obstruction={...e.panels[0],id:'real-obstruction',size:[1000,3000,1000] as [number,number,number],center:[300,1000,900] as [number,number,number]};
 assert.equal(safeInnerDrawerExtensions({...e,panels:[...e.panels,obstruction]}, {},target).blocked,true);
 const hinge=e.doorHardware.hinges[0],drawer=e.drawers.drawers.find(d=>d.intent.internal)!;
 const zones={...e,doorHardware:{...e.doorHardware,hinges:[{...hinge,mountingZone:{center:[300,drawer.parts.find(p=>p.moving)!.center[1],600] as [number,number,number],size:[1000,3000,100] as [number,number,number]}}]}};
 assert.equal(safeInnerDrawerExtensions(zones,{},target).blocked,true);
 assert.deepEqual(deserialize(serialize(next)),next);const store=new CabinetStore(c);assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,next);
 const repair=innerDrawerOpeningRepairs(c).find(r=>r.label.includes('Häfele'));assert.ok(repair);assert.equal(drawerOpeningIssue(evaluate(repair.cabinet)),null);assert.ok(repair.cabinet.fronts.every(d=>d.placement==='inset'));
});
test('Metalla articles, cups and H=0 plate drilling match the selected mounting application',()=>{
 const base=addSimpleDoors(createCabinet(),'pair').cabinet;
 for(const placement of ['inset','overlay'] as const){
  const c=fitMetallaHinges({...base,fronts:base.fronts.map(d=>({...d,placement}))},base.fronts.map(d=>d.id)),e=evaluate(c);
  for(const h of e.doorHardware.hinges){
   assert.equal(h.article,placement==='inset'?hafeleMetalla155.inset:hafeleMetalla155.overlay);assert.equal(h.plate,'311.70.610');assert.equal(h.maxAngle,155);assert.ok(h.softClose);
   const cup=e.drilling.find(b=>b.id===h.id+'/cup')!;assert.equal(cup.diameter,35);assert.equal(cup.depth,12);
   const screws=e.drilling.filter(b=>b.id.startsWith(h.id+'/cup-screw/'));assert.equal(screws.length,2);assert.equal(Math.abs(screws[0].point[1]-screws[1].point[1]),45);assert.equal(Math.abs(screws[0].point[0]-cup.point[0]),9.5);
   const plate=e.drilling.filter(b=>b.id.startsWith(h.id+'/plate-screw/'));assert.equal(plate.length,2);assert.equal(Math.abs(plate[0].point[1]-plate[1].point[1]),32);assert.equal(plate[0].point[2],560-37-(placement==='inset'?19.5:0));
  }
 }
});
test('Metalla rejects incompatible stock, gap and side adjustment with a retained-inset fitting repair',()=>{
 const base=addSimpleDoors(createCabinet(),'pair').cabinet,c=fitMetallaHinges({...base,fronts:base.fronts.map(d=>({...d,placement:'inset' as const}))},base.fronts.map(d=>d.id));
 const bad={...c,fronts:c.fronts.map(d=>({...d,hinge:{...defaultHinge(hafeleMetalla155.id),cupDistance:6}}))};
 assert.throws(()=>evaluate(bad),/at least 3.5 mm/);const repair=editRepairs(bad,c).find(r=>r.label.includes('Fit Metalla'));assert.ok(repair);assert.doesNotThrow(()=>evaluate(repair.cabinet));
 for(const thickness of [14,25])assert.throws(()=>evaluate({...c,fronts:c.fronts.map(d=>({...d,material:{...c.materials.carcass,stock:{id:`generic-panel-${thickness}`,revision:'1'}}}))}),/15–24/);
 assert.equal(metallaMinimumGap(18,4),1.5);assert.equal(metallaMinimumGap(18,6),3.5);
 assert.throws(()=>evaluate({...c,fronts:c.fronts.map(d=>({...d,hinge:{...d.hinge!,cupDistance:3},reveal:6}))}),/side adjustment/);
});


import {resizeEnvelope} from '../src/commands/dimensions';
import {addDrawerStack} from '../src/commands/drawers';
import {antaroPin,chooseDrawerPack} from '../src/catalogue/drawers';
import {editSimpleDoors} from '../src/commands/simple-doors';
import {drawerOpeningEditIssue} from '../src/commands/drawer-opening-preflight';
for(const family of ['antaro','merivobox'] as const)for(const layout of ['single','pair'] as const)for(const placement of ['inset','overlay'] as const){
 test(`adding ${layout} ${placement} doors over three ${family} inner drawers offers a complete fitting correction`,()=>{
  const base=resizeEnvelope(createCabinet(),{width:400,height:720,depth:560}),before=addDrawerStack(base,base.compartments.id,3,chooseDrawerPack(antaroPin,{family}),false,true).cabinet;
  const added=addSimpleDoors(before,layout).cabinet,requested=editSimpleDoors(added,added.fronts.map(d=>d.id),{placement}),saved=serialize(before),issue=drawerOpeningEditIssue(requested,before);
  if(!issue){assert.equal(innerDrawerOpeningRepairs(requested).length,0);return;}
  const option=innerDrawerOpeningRepairs(requested).find(r=>r.label.includes('Häfele'));assert.ok(option,'A valid hinge fit must be offered rather than an empty correction dialog');
  const next=option.cabinet,e=evaluate(next);assert.equal(drawerOpeningEditIssue(next,before),null);assert.equal(drawerOpeningIssue(e),null);
  assert.deepEqual(next.drawers,before.drawers);assert.deepEqual(next.compartments,before.compartments);assert.deepEqual(next.envelope,before.envelope);assert.deepEqual(next.fronts.map(d=>[d.id,d.placement]),requested.fronts.map(d=>[d.id,d.placement]));
  assert.ok(e.doorHardware.hinges.every(h=>h.softClose&&h.maxAngle===155));assert.ok(!e.issues.some(i=>['machining-hinge-plate','machining-hole-collision','machining-collision'].includes(i.code)));
  const opened=safeDoorAngles(e,{},next.fronts.map(d=>d.id),155);assert.equal(opened.blocked,false);const extended=safeInnerDrawerExtensions(e,{}, {...opened.angles,...Object.fromEntries(next.drawers!.map(d=>[d.id,100]))});assert.equal(extended.blocked,false);assert.ok(next.drawers!.every(d=>extended.angles[d.id]===100));
  assert.equal(safeInnerDrawerExtensions(e,{},Object.fromEntries(next.drawers!.map(d=>[d.id,100]))).blocked,true,'Closed doors must still block drawers');
  const store=new CabinetStore(before);assert.ok(store.commit(next));store.undo();assert.equal(serialize(store.getSnapshot().committed),saved);store.redo();assert.deepEqual(store.getSnapshot().committed,next);assert.deepEqual(deserialize(serialize(next)),next);assert.equal(serialize(before),saved);
 });
}
