import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {cnc} from '../src/rules/cnc.ts';
import {setCnc} from '../src/commands/cnc.ts';
import {setBackPanel} from '../src/commands/back-panel.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {setStockThickness} from '../src/commands/stock.ts';
import {addDivision,findDivision,removeDivisionTree,setInteriorFingers} from '../src/commands/interiors.ts';
import {editError,editRepairs} from '../src/commands/edit-repairs.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';

test('nested removal preserves unrelated branches and identities and is one reversible transaction',()=>{
 const base=createCabinet(),parent=addDivision(base,base.compartments.id,'horizontal',342),openings=evaluate(parent.cabinet).openings;
 const child=addDivision(parent.cabinet,openings[0].id,'vertical',282),sibling=addDivision(child.cabinet,openings[1].id,'horizontal',160);
 const c={...sibling.cabinet,banding:{[child.featureId]:{},[sibling.featureId]:{}}},store=new CabinetStore(c),removed=removeDivisionTree(c,parent.featureId);
 assert.ok(!findDivision(removed.compartments,parent.featureId));assert.ok(!findDivision(removed.compartments,child.featureId));
 // Removing the parent explicitly removes both of its nested branches.
 assert.equal(evaluate(removed).divisions.length,0);assert.deepEqual(removed.banding,{});
 assert.ok(store.commit(removed));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,removed);
 const branchOnly=removeDivisionTree(c,child.featureId);assert.ok(findDivision(branchOnly.compartments,parent.featureId));assert.ok(findDivision(branchOnly.compartments,sibling.featureId));assert.ok(Object.hasOwn(branchOnly.banding,sibling.featureId));
});
test('bulk shelf joints preserve individual pitches unless a shared width is explicitly set',()=>{
 const base=createCabinet(),first=addDivision(base,base.compartments.id,'horizontal',342),second=addDivision(first.cabinet,evaluate(first.cabinet).openings[1].id,'horizontal',160),ids=[first.featureId,second.featureId];
 let c=setInteriorFingers(second.cabinet,[ids[0]],true,40);c=setInteriorFingers(c,[ids[1]],true,60);
 const unchanged=setInteriorFingers(c,ids,true);assert.equal(findDivision(unchanged.compartments,ids[0])!.joint!.pitch,40);assert.equal(findDivision(unchanged.compartments,ids[1])!.joint!.pitch,60);
 const shared=setInteriorFingers(c,ids,true,45),store=new CabinetStore(c);assert.ok(store.commit(shared));assert.deepEqual(evaluate(shared).panels.map(p=>p.id),evaluate(c).panels.map(p=>p.id));assert.deepEqual(readSimpleCabinet(serialize(shared)),shared);store.undo();assert.deepEqual(store.getSnapshot().committed,c);
 const butt=setInteriorFingers(shared,ids,false);assert.ok(ids.every(id=>!findDivision(butt.compartments,id)!.joint));
 assert.throws(()=>setInteriorFingers(c,['missing'],true));
});
test('bulk dividers support joint editing and reject mixed shelf/divider selections',()=>{
 const base=createCabinet(),first=addDivision(base,base.compartments.id,'vertical',282),second=addDivision(first.cabinet,evaluate(first.cabinet).openings[1].id,'vertical',130),ids=[first.featureId,second.featureId];
 const shared=setInteriorFingers(second.cabinet,ids,true,40);assert.ok(ids.every(id=>findDivision(shared.compartments,id)!.joint!.pitch===40));assert.equal(evaluate(shared).divisions.length,2);
 const shelf=addDivision(second.cabinet,evaluate(second.cabinet).openings[0].id,'horizontal',342);assert.throws(()=>setInteriorFingers(shelf.cabinet,[first.featureId,shelf.featureId],true));
});
test('narrow-slot tooling never blocks fit edits or offers allowance inflation',()=>{
 const before=setBackPanel(createCabinet(),{mode:'groove',thickness:3}),candidate=setCnc(before,{dogbones:true});
 assert.equal(editError(candidate),null);assert.deepEqual(editRepairs(candidate,before),[]);assert.equal(cnc(candidate).tolerance,.2);
 const store=new CabinetStore(before);assert.ok(store.commit(candidate));assert.ok(evaluate(candidate).issues.some(i=>i.code==='machining-tool-width'&&i.severity==='notice'));store.undo();assert.deepEqual(store.getSnapshot().committed,before);
});
test('changing the cutter preserves joint fit allowance and slot dimensions',()=>{
 const before=setCnc(setBackPanel(createCabinet(),{mode:'groove',thickness:3}),{dogbones:true,bitDiameter:3}),candidate=setCnc(before,{bitDiameter:8});
 assert.equal(editError(candidate),null);assert.equal(cnc(candidate).tolerance,.2);assert.deepEqual(evaluate(candidate).pockets.map(p=>[p.origin,p.size]),evaluate(before).pockets.map(p=>[p.origin,p.size]));assert.deepEqual(editRepairs(candidate,before),[]);
});
test('thin-stock fitting conflict offers valid compatible changes while retaining requested thickness',()=>{
 const before=setCabineo(createCabinet(),'cabineo-12'),candidate=setStockThickness(before,12),options=editRepairs(candidate,before);
 assert.match(editError(candidate)!,/receiving panel/);assert.ok(options.some(o=>o.cabinet.hardware[0]?.id==='cabineo-8'));assert.ok(options.some(o=>!o.cabinet.hardware.length));
 assert.ok(options.every(o=>o.cabinet.materials.carcass.stock.id==='generic-panel-12'&&!editError(o.cabinet)));
});
test('unrepairable data is never offered and invalid settings preserve store state',()=>{
 const c=createCabinet(),store=new CabinetStore(c),bad=setCnc(c,{bitDiameter:0});
 assert.equal(store.commit(bad),false);assert.deepEqual(store.getSnapshot().committed,c);assert.ok(store.getSnapshot().error);assert.equal(store.getSnapshot().canUndo,false);
 assert.deepEqual(editRepairs(c,c),[]);assert.deepEqual(editRepairs({...c,envelope:{...c.envelope,width:NaN}},c),[]);
});

test('resizing offers fitting positions or explicit removal while retaining requested dimensions and unrelated interiors',()=>{
 const base=createCabinet(),shelf=addDivision(base,base.compartments.id,'horizontal',500),before=shelf.cabinet,candidate={...before,envelope:{...before.envelope,height:500}},options=editRepairs(candidate,before);
 const moved=options.find(o=>o.label.startsWith('Move'))!,removed=options.find(o=>o.label.startsWith('Remove'))!;
 assert.ok(moved);assert.ok(removed);assert.equal(findDivision(moved.cabinet.compartments,shelf.featureId)!.position,395);assert.equal(evaluate(removed.cabinet).divisions.length,0);
 assert.ok(options.every(o=>o.cabinet.envelope.height===500&&!editError(o.cabinet)));
});
