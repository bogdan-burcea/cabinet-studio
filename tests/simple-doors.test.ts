import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultHinge} from '../src/catalogue/hinges.ts';
import {safeDoorAngles} from '../src/rules/door-motion.ts';
import {createCabinet} from '../src/domain/cabinet.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {addSimpleDoors,editSimpleDoors} from '../src/commands/simple-doors.ts';
import {addDivision,moveDivision} from '../src/commands/interiors.ts';
import {addSimpleAdjustable} from '../src/commands/adjustable.ts';
import {removeDoor,resizeDoor,splitDoor} from '../src/commands/fronts.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {editRepairs} from '../src/commands/edit-repairs.ts';
import {explodedLayout} from '../src/viewport/display.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} versus ${b}`);
test('single and paired simple doors preserve carcass machining, interiors, IDs and reversible native files',()=>{
 const base=setCabineo(createCabinet(),'cabineo-8'),shelf=addDivision(base,base.compartments.id,'horizontal',342),before=evaluate(shelf.cabinet);
 for(const layout of ['single','pair'] as const){const next=addSimpleDoors(shelf.cabinet,layout),e=evaluate(next.cabinet),store=new CabinetStore(shelf.cabinet);assert.equal(e.fronts.doors.length,layout==='single'?1:2);assert.equal(next.featureIds.length,e.fronts.doors.length);assert.ok(next.cabinet.fronts.every(d=>d.handle.kind==='none'));assert.deepEqual(e.cabineo,before.cabineo);assert.deepEqual(next.cabinet.compartments,shelf.cabinet.compartments);assert.ok(store.commit(next.cabinet));assert.deepEqual(readSimpleCabinet(serialize(next.cabinet)),next.cabinet);store.undo();assert.deepEqual(store.getSnapshot().committed,shelf.cabinet);store.redo();assert.deepEqual(store.getSnapshot().committed,next.cabinet);}
});
test('door coverage over multiple openings links boundaries and follows divider movement and door sizing',()=>{
 const base=createCabinet(),split=addDivision(base,base.compartments.id,'vertical',282),ids=evaluate(split.cabinet).openings.map(o=>o.id),next=addSimpleDoors(split.cabinet,'single',ids),before=evaluate(next.cabinet);assert.equal(next.featureIds.length,2);assert.ok(next.cabinet.fronts.some(d=>d.boundaryLinks?.right===split.featureId));const moved=evaluate(moveDivision(next.cabinet,split.featureId,320));close(moved.fronts.doors[0].size[0],before.fronts.doors[0].size[0]+38);const resized=resizeDoor(next.cabinet,next.featureIds[0],'width',before.fronts.doors[0].size[0]+20);close(evaluate(resized).divisions[0].position,302);
});
test('inset placement edits connected leaves together and offers a validated setback correction',()=>{
 const base=createCabinet(),split=addDivision(base,base.compartments.id,'vertical',282),shelf=addSimpleAdjustable(split.cabinet,evaluate(split.cabinet).openings[0].id),pair=addSimpleDoors(shelf.cabinet,'pair'),candidate=editSimpleDoors(pair.cabinet,[pair.featureIds[0]],{placement:'inset'});assert.ok(candidate.fronts.every(d=>d.placement==='inset'));assert.throws(()=>evaluate(candidate),/inset slab conflicts/);const options=editRepairs(candidate,pair.cabinet),fix=options.find(o=>o.label==='Set back interiors to clear doors');assert.ok(fix);assert.doesNotThrow(()=>evaluate(fix.cabinet));assert.deepEqual(fix.cabinet.contents.map(s=>s.id),shelf.cabinet.contents.map(s=>s.id));assert.equal(fix.cabinet.fronts.length,2);
});
test('unsupported splits retain mounting checks and offer an explicit supporting-divider repair',()=>{
 const pair=addSimpleDoors(createCabinet(),'pair'),candidate=splitDoor(pair.cabinet,pair.featureIds[1],'vertical').cabinet;assert.throws(()=>evaluate(candidate),/hinge edge/);const fix=editRepairs(candidate,pair.cabinet).find(o=>o.label.startsWith('Add supporting'));assert.ok(fix);assert.doesNotThrow(()=>evaluate(fix.cabinet));
});
test('adding doors over an existing cover offers replacement and deletion is reversible',()=>{
 const first=addSimpleDoors(createCabinet(),'single'),pair=addSimpleDoors(first.cabinet,'pair'),fix=editRepairs(pair.cabinet,first.cabinet).find(o=>o.label==='Replace the overlapping doors');assert.ok(fix);assert.equal(fix.cabinet.fronts.length,2);const store=new CabinetStore(fix.cabinet),next=removeDoor(fix.cabinet,fix.cabinet.fronts[0].id);assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,fix.cabinet);
});
test('exploded shelves use a compact forward gap and remain separate from doors and dividers',()=>{
 const base=createCabinet(),d=addDivision(base,base.compartments.id,'vertical',282),a=addSimpleAdjustable(d.cabinet,evaluate(d.cabinet).openings[0].id),b=addSimpleAdjustable(a.cabinet,evaluate(a.cabinet).openings[1].id),c=addSimpleDoors(b.cabinet,'pair').cabinet,panels=evaluate(c).panels,offsets=explodedLayout(panels,80);assert.ok(panels.filter(p=>p.role==='shelf').every(p=>Math.abs(offsets.get(p.id)![2])<=80));
 for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++){const a=panels[i],b=panels[j],x=offsets.get(a.id)!,y=offsets.get(b.id)!;assert.ok(![0,1,2].every(k=>Math.min(a.center[k]+x[k]+a.size[k]/2,b.center[k]+y[k]+b.size[k]/2)-Math.max(a.center[k]+x[k]-a.size[k]/2,b.center[k]+y[k]-b.size[k]/2)>1e-6),`${a.label} / ${b.label}`);}
});
test('bulk paired doors select only new stable IDs and old simple files remain readable',()=>{
 const base=createCabinet(),split=addDivision(base,base.compartments.id,'vertical',282),ids=evaluate(split.cabinet).openings.map(o=>o.id),pairs=addSimpleDoors(split.cabinet,'pair',ids);assert.equal(pairs.featureIds.length,4);assert.deepEqual(new Set(pairs.featureIds),new Set(pairs.cabinet.fronts.map(d=>d.id)));assert.doesNotThrow(()=>evaluate(pairs.cabinet));const doc=JSON.parse(serialize(base));assert.equal(doc.schemaVersion,38);doc.schemaVersion=21;doc.evaluatorRevision='interiors-21';assert.deepEqual(deserializeWithInfo(JSON.stringify(doc)),{cabinet:base,migrated:true});
});

test('Blum 155° selects the matching arm and plate, including the third plate pilot',()=>{
 const {cabinet,featureIds:[id]}=addSimpleDoors(createCabinet(),'single');
 for(const placement of ['overlay','inset'] as const){
  const fitted={...cabinet,fronts:cabinet.fronts.map(d=>({...d,placement,hinge:defaultHinge('blum-clip-155')}))};
  const e=evaluate(fitted),hinge=e.doorHardware.hinges[0],inside=placement==='inset';
  assert.equal(hinge.article,inside?'71B7650':'71B7550');
  assert.equal(hinge.plate,inside?'175H7190':'175H7100');
  assert.equal(hinge.maxAngle,155);
  assert.deepEqual(e.drilling.filter(b=>b.kind==='hinge-cup').map(b=>[b.diameter,b.depth]),[[35,11.7],[35,11.7]]);
  const supportPilots=e.drilling.filter(b=>b.id.startsWith(hinge.id+'/plate-screw/'));
  const line=cabinet.envelope.depth-37-(inside?e.fronts.doors[0].size[2]+1.5:0);
  assert.deepEqual(supportPilots.map(b=>[b.point[1]-hinge.y,b.point[2]]),[[0,line-26],[-16,line],[16,line]]);
  assert.deepEqual(readSimpleCabinet(serialize(fitted)),fitted);
  if(!inside){
   const open=safeDoorAngles(e,{},[id],155);assert.equal(open.blocked,false);assert.equal(open.angles[id],155);
   const legacy=JSON.parse(serialize(fitted));legacy.schemaVersion=33;legacy.evaluatorRevision='wall-clearance-33';
   assert.throws(()=>deserializeWithInfo(JSON.stringify(legacy)),/requires cabinet file version 34/);
  }
 }
});

test('paired doors can preview their individual 110° and 155° limits together',()=>{
 const {cabinet,featureIds:[left,right]}=addSimpleDoors(createCabinet(),'pair');
 const fitted={...cabinet,fronts:cabinet.fronts.map(d=>({...d,hinge:defaultHinge(d.id===left?'blum-clip-110':'blum-clip-155')}))};
 const e=evaluate(fitted),open=safeDoorAngles(e,{},[left,right],155);
 assert.equal(open.blocked,false);
 assert.deepEqual(open.angles,{[left]:110,[right]:155});
 assert.deepEqual(safeDoorAngles(e,open.angles,[left,right],0).angles,{[left]:0,[right]:0});
});
