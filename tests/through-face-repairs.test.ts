import {addMetalDrawer} from '../src/commands/drawers.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addDivision,setInteriorFinger} from '../src/commands/interiors.ts';
import {addInteriors} from '../src/commands/simple-interiors.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {setCnc} from '../src/commands/cnc.ts';
import {oneFaceRepairs} from '../src/commands/clearance-repairs.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserialize,deserializeWithInfo} from '../src/persistence/files.ts';
function mixed(finger=false){let base=setCabineo(createCabinet(),'cabineo-8'),d=addDivision(base,base.compartments.id,'vertical',282),c=finger?setInteriorFinger(d.cabinet,d.featureId,true):d.cabinet;const ids=evaluate(c).openings.map(o=>o.id);c=addInteriors(c,[ids[1]],'fixed').cabinet;c=addInteriors(c,[ids[0]],'adjustable').cabinet;if(finger)c=setCnc(c,{throughOpposed:false});return {c,id:d.featureId};}
const blindHousings=(c:ReturnType<typeof createCabinet>)=>evaluate(c).cabineo.flatMap(j=>j.bores).filter(b=>b.kind==='housing');
test('divider face repair offers adjustment through holes without converting blind connector housings',()=>{
 const {c,id}=mixed(),before=evaluate(c);assert.ok(before.issues.some(i=>i.code==='machining-faces'&&i.featureId===id));const options=oneFaceRepairs(c,[id]);assert.equal(options.length,1);assert.match(options[0].label,/shelf adjustment holes/);const next=options[0].cabinet,after=evaluate(next);assert.ok(!after.issues.some(i=>i.code==='machining-faces'&&i.featureId===id));assert.ok(after.drilling.filter(b=>b.kind==='shelf-support'&&b.panelId===id).every(b=>b.through&&b.depth===18));assert.deepEqual(blindHousings(next),blindHousings(c));assert.deepEqual(after.drilling.filter(b=>b.panelId!==id),before.drilling.filter(b=>b.panelId!==id));assert.deepEqual(next.compartments,c.compartments);assert.deepEqual(next.contents,c.contents);assert.deepEqual(deserialize(serialize(next)),next);const store=new CabinetStore(c);assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,next);
});
test('compatible mixed drilling offers either receiving fastener pilots or adjustment rows as a scoped through repair',()=>{
 const {c,id}=mixed(true),before=evaluate(c),options=oneFaceRepairs(c,[id]);assert.ok(before.issues.some(i=>i.code==='machining-faces'&&i.featureId===id));assert.equal(options.length,2);assert.ok(options.some(o=>o.label.includes('receiving fastener pilots')));assert.ok(options.some(o=>o.label.includes('shelf adjustment holes')));
 for(const option of options){const e=evaluate(option.cabinet);assert.ok(!e.issues.some(i=>i.code==='machining-faces'&&i.featureId===id));assert.deepEqual(blindHousings(option.cabinet),blindHousings(c));assert.deepEqual(deserialize(serialize(option.cabinet)),option.cabinet);if(option.label.includes('receiving')){assert.ok(e.cabineo.flatMap(j=>j.bores).filter(b=>b.kind==='receiver'&&b.panelId===id).every(b=>b.through&&b.depth===18));assert.deepEqual(e.drilling,before.drilling);}else{assert.deepEqual(e.cabineo,before.cabineo);assert.ok(e.drilling.filter(b=>b.kind==='shelf-support'&&b.panelId===id).every(b=>b.through));}}
});
test('through repair metadata is strict, versioned and keeps older native drilling unchanged',()=>{
 const {c,id}=mixed(true),doc=JSON.parse(serialize(oneFaceRepairs(c,[id])[0].cabinet));assert.equal(doc.schemaVersion,48);for(const mode of ['housing',false,[],null]){const bad=structuredClone(doc);bad.cabinet.carcass.machining.throughHoles={[id]:mode};assert.throws(()=>deserialize(JSON.stringify(bad)));}const previous=JSON.parse(serialize(c));previous.schemaVersion=31;previous.evaluatorRevision='protruding-divider-31';assert.deepEqual(deserializeWithInfo(JSON.stringify(previous)),{cabinet:c,migrated:true});const invalid=structuredClone(doc);invalid.schemaVersion=31;invalid.evaluatorRevision='protruding-divider-31';assert.throws(()=>deserialize(JSON.stringify(invalid)));assert.equal(oneFaceRepairs(c,['unknown']).length,0);
});

test('divider housings share the drawer-pilot face and through shelf rows never constrain that choice',()=>{
 for(const drawerSide of [0,1]){
  const base=setCabineo(createCabinet(),'cabineo-8'),split=addDivision(base,base.compartments.id,'vertical',282),id=split.featureId;
  const openings=evaluate(split.cabinet).openings;
  let c=addMetalDrawer(split.cabinet,openings[drawerSide].id).cabinet;
  c=addInteriors(c,[openings[1-drawerSide].id],'adjustable').cabinet;
  // Genuine opposed blind drilling remains visible until the rows are through.
  assert.ok(evaluate(c).issues.some(i=>i.code==='machining-faces'&&i.featureId===id));
  c=setCnc(c,{throughHoles:{[id]:'adjustment'}});
  const e=evaluate(c),housings=e.cabineo.flatMap(j=>j.bores).filter(b=>b.panelId===id&&b.kind==='housing'),pilots=e.drilling.filter(b=>b.panelId===id&&b.kind==='pilot');
  assert.ok(housings.length&&pilots.length);
  assert.ok(housings.every(b=>b.sign===pilots[0].sign&&b.depth===11&&!b.through));
  assert.ok(e.drilling.filter(b=>b.panelId===id&&b.kind==='shelf-support').every(b=>b.through));
  assert.ok(!e.issues.some(i=>['machining-faces','machining-collision','machining-hole-collision'].includes(i.code)));
  assert.deepEqual(evaluate(deserialize(serialize(c))).cabineo,e.cabineo);
 }
});
