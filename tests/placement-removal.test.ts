import test from 'node:test';import assert from 'node:assert/strict';
import {PlacementHistory} from '../src/cnc/placement-history.ts';
import {removalPlan} from '../src/commands/removal.ts';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addDivision} from '../src/commands/interiors.ts';
import {addDrawerStack} from '../src/commands/drawers.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {editRepairs} from '../src/commands/edit-repairs.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {editFrontFeatures} from '../src/commands/front-features.ts';
import {defaultDrawerHandle} from '../src/rules/handles.ts';
import {serialize,deserialize} from '../src/persistence/files.ts';
import {flattenParts} from '../src/cnc/parts.ts';

test('rotation undo/redo restores quarter-turn choices, auto arrangement is undoable and a new edit clears redo',()=>{
 const h=new PlacementHistory();const a={p:{rotated:false}},b={p:{rotated:true}};h.commit(a);h.commit(b);h.undo();assert.deepEqual(h.getSnapshot().choices,a);h.redo();assert.deepEqual(h.getSnapshot().choices,b);h.commit({});h.undo();assert.deepEqual(h.getSnapshot().choices,b);h.undo();h.commit({q:{rotated:false}});assert.equal(h.getSnapshot().canRedo,false);h.reset();assert.equal(h.getSnapshot().canUndo,false);
});
test('deleting a supporting divider explicitly lists connected drawers and preserves unrelated elements; one Undo restores all',()=>{
 let c=createCabinet();const div=addDivision(c,c.compartments.id,'vertical',282);c=div.cabinet;const opening=evaluate(c).openings[0];c=addDrawerStack(c,opening.id,2).cabinet;
 const store=new CabinetStore(c),planned=removalPlan(c,[div.featureId]);assert.equal(planned.connected.length,2);assert.equal(planned.cabinet.drawers?.length,0);assert.equal(evaluate(planned.cabinet).divisions.length,0);assert.ok(store.commit(planned.cabinet));store.undo();assert.deepEqual(store.getSnapshot().committed,c);

});
test('an edit losing drawer openings offers an evaluated connected-drawer removal',()=>{
 let c=createCabinet();c=addDrawerStack(c,c.compartments.id,2).cabinet;
 const clear={...c,drawers:[]},div=addDivision(clear,clear.compartments.id,'vertical',282),candidate={...div.cabinet,drawers:c.drawers};
 assert.throws(()=>evaluate(candidate),/opening/);const repair=editRepairs(candidate,c).find(r=>/Remove 2 connected drawers/.test(r.label));assert.ok(repair);assert.doesNotThrow(()=>evaluate(repair.cabinet));
});
test('outside notch radii cut convex mouth corners on every edge and round-trip strictly without changing interior diameter',()=>{
 const base=createCabinet(),stack=addDrawerStack(base,base.compartments.id,2),id=stack.featureIds[0];
 for(const notchEdge of ['top','bottom','left','right'] as const){
  const c=editFrontFeatures(stack.cabinet,[id],{handle:{...defaultDrawerHandle(),kind:'notch',height:'centre',horizontal:'centre',notchEdge,notchWidth:80,notchDepth:25,cornerDiameter:8,outsideRadius:6}}),m=evaluate(c),part=flattenParts(m).find(p=>p.id===id+'/front')!;
  const cut=part.cuts.find(p=>p.id.endsWith('/notch'))!;assert.ok(cut.outline!.length>60);const a=notchEdge==='top'||notchEdge==='bottom'?0:1;const values=cut.outline!.map(p=>p[a]);assert.ok(Math.abs(Math.max(...values)-Math.min(...values)-92)<.001);assert.equal(c.drawers![0].handle!.cornerDiameter,8);assert.deepEqual(deserialize(serialize(c)),c);
  const bad=editFrontFeatures(c,[id],{handle:{outsideRadius:24}});assert.throws(()=>evaluate(bad),/Outside notch radius/);
  const old=JSON.parse(serialize(c));old.schemaVersion=37;old.evaluatorRevision='front-profiles-37';assert.throws(()=>deserialize(JSON.stringify(old)),/handle/i);
 }
});
