import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addDoor,addDoorPair,splitDoor,updateDoor,connectedDoors} from '../src/commands/fronts.ts';
import {addDivision,moveDivision,setDivisionSetback} from '../src/commands/interiors.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {supportedHingeSides} from '../src/rules/fronts.ts';
import {corrections} from '../src/commands/corrections.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {deserialize,deserializeWithInfo,serialize} from '../src/persistence/files.ts';
import {setBanding} from '../src/commands/materials.ts';
import {deleteSelected} from '../src/commands/selection.ts';
import {explodedOffset} from '../src/viewport/display.ts';
test('placement updates both split leaves, including legacy touching layouts, as one reversible command',()=>{
 const pair=addDoorPair(createCabinet()).cabinet,id=pair.fronts[0].id,store=new CabinetStore(pair),next=updateDoor(pair,id,{placement:'inset'});
 assert.equal(connectedDoors(pair,id).size,2);assert.ok(next.fronts.every(d=>d.placement==='inset'));assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,pair);store.redo();assert.deepEqual(store.getSnapshot().committed,next);assert.deepEqual(deserialize(serialize(next)),next);
 const rows=splitDoor(pair,pair.fronts[1].id,'horizontal').cabinet;assert.equal(connectedDoors(rows,id).size,3);assert.ok(updateDoor(rows,id,{placement:'inset'}).fronts.every(d=>d.placement==='inset'));
 const untouched=updateDoor(pair,id,{handle:{...pair.fronts[0].handle,kind:'knob'}});assert.deepEqual(untouched.fronts[1],pair.fronts[1]);
});
test('hinge support is required at both mounting positions and in the front zone, including dependent moves',()=>{
 let base=createCabinet();base.envelope.origin=[25,15,-20];const division=addDivision(base,base.compartments.id,'vertical',282),pair=addDoorPair(division.cabinet).cabinet,id=pair.fronts[0].id,right=updateDoor(pair,id,{handing:'right'});
 evaluate(right);assert.deepEqual(supportedHingeSides(right,right.fronts[0]),['left','right']);assert.equal(evaluate(moveDivision(right,division.featureId,300)).fronts.doors[0].size[0],evaluate(right).fronts.doors[0].size[0]+18);assert.throws(()=>evaluate(setDivisionSetback(right,division.featureId,50)),/hinge edge/);
 const missing=addDoorPair(base).cabinet,bad=updateDoor(missing,missing.fronts[0].id,{handing:'right'});assert.throws(()=>evaluate(bad),/vertical divider/);
 const offered=corrections(bad).find(o=>o.label.startsWith('Add supporting'));assert.ok(offered);evaluate(offered.cabinet);assert.equal(evaluate(offered.cabinet).divisions.length,1);
 const row=addDivision(base,base.compartments.id,'horizontal',342).cabinet,short=addDivision(row,evaluate(row).openings[0].id,'vertical',282).cabinet,doors=addDoorPair(short).cabinet;assert.throws(()=>evaluate(updateDoor(doors,doors.fronts[0].id,{handing:'right'})),/hinge edge/);
});
test('nested vertical splits cannot create floating hinge leaves; offered supports and setback corrections are atomic',()=>{
 const pair=addDoorPair(createCabinet()).cabinet,id=pair.fronts[1].id,bad=splitDoor(pair,id,'vertical').cabinet;assert.throws(()=>evaluate(bad),/hinge edge/);const fix=corrections(bad).find(o=>o.label.startsWith('Add supporting'));assert.ok(fix);evaluate(fix.cabinet);
 const base=createCabinet(),shelf=addDivision(base,base.compartments.id,'horizontal',342).cabinet,doors=addDoorPair(shelf).cabinet,next=updateDoor(doors,doors.fronts[0].id,{placement:'inset'});assert.throws(()=>evaluate(next),/inset slab conflicts/);const correction=corrections(next).find(o=>o.label==='Set back interiors to clear doors');assert.ok(correction);const store=new CabinetStore(doors);assert.ok(store.commit(correction.cabinet));store.undo();assert.deepEqual(store.getSnapshot().committed,doors);
});
test('inset leaves on a divider align to its faces and remain disjoint across sizes, origin and stock',()=>{
 for(const width of [400,600,1000]){const c=createCabinet();c.envelope={...c.envelope,width,origin:[15,20,-35]};const split=addDivision(c,c.compartments.id,'vertical',(width-36)/2).cabinet,pair=addDoorPair(split).cabinet,next=updateDoor(pair,pair.fronts[0].id,{placement:'inset'});const e=evaluate(next),[a,b]=e.fronts.doors,divider=e.divisions[0];assert.ok(a.center[0]+a.size[0]/2<=divider.origin[0]);assert.ok(b.center[0]-b.size[0]/2>=divider.origin[0]+divider.size[0]);}
});
test('handle and edge removal preserve their owning panel; display offsets never change saved intent',()=>{
 let c=addDoorPair(createCabinet()).cabinet,id=c.fronts[0].id;c=setBanding(c,id,'u-min',{id:'generic-edge-1',revision:'1'});const panel=evaluate(c).panels.find(p=>p.id===id)!,band=panel.edges.find(e=>e.product)!;
 const noBand=deleteSelected(c,band.id);assert.equal(noBand.selection,id);assert.equal(noBand.cabinet.banding[id],undefined);assert.deepEqual(noBand.cabinet.fronts,c.fronts);const noHandle=deleteSelected(c,`${id}/handle`);assert.equal(noHandle.cabinet.fronts[0].handle.kind,'none');assert.deepEqual(noHandle.cabinet.banding,c.banding);
 const before=serialize(c);assert.deepEqual(explodedOffset('left',[0,0,0],[300,360,280],100),[-100,0,0]);assert.deepEqual(explodedOffset('door',[0,0,0],[300,360,280],100),[0,0,100]);assert.equal(serialize(c),before);
 const old={format:'cabinet-studio',schemaVersion:9,evaluatorRevision:'workspace-9',cabinet:c};const upgraded=deserializeWithInfo(JSON.stringify(old));assert.ok(upgraded.migrated);assert.deepEqual(upgraded.cabinet,c);
});
test('oversized handle errors offer a fitting pitch without changing other doors',()=>{
 const pair=addDoorPair(createCabinet()).cabinet,id=pair.fronts[0].id,bad=updateDoor(pair,id,{handle:{...pair.fronts[0].handle,orientation:'horizontal',pitch:320}});assert.throws(()=>evaluate(bad),/handle envelope/);const fix=corrections(bad).find(o=>o.label==='Fit handle to door');assert.ok(fix);evaluate(fix.cabinet);assert.ok(fix.cabinet.fronts[0].handle.pitch<320);assert.deepEqual(fix.cabinet.fronts[1],pair.fronts[1]);
});
test('a moved mounting divider offers alignment and preserves its dependent children',()=>{
 const c=createCabinet(),division=addDivision(c,c.compartments.id,'vertical',282),pair=addDoorPair(division.cabinet).cabinet,right=updateDoor(pair,pair.fronts[0].id,{handing:'right'}),bad={...right,envelope:{...right.envelope,width:620}};evaluate(bad);assert.equal(evaluate(bad).divisions[0].id,division.featureId);assert.equal(evaluate(bad).fronts.doors[0].size[0],evaluate(right).fronts.doors[0].size[0]);
});
