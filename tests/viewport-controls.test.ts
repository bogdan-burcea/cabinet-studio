import {defaultHinge} from '../src/catalogue/hinges.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addDrawerStack,editDrawerGroup} from '../src/commands/drawers.ts';
import {fitDrawerRails} from '../src/rules/drawer-rails.ts';
import {drawerPacks,drawerPack} from '../src/catalogue/drawers.ts';
import {standardisePilotHoles} from '../src/commands/pilots.ts';
import {addSimpleDoors} from '../src/commands/simple-doors.ts';
import {editFrontFeatures} from '../src/commands/front-features.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {flattenParts} from '../src/cnc/parts.ts';
import {planSheets} from '../src/cnc/layout.ts';
import {serialize,deserialize} from '../src/persistence/files.ts';

test('automatic rails fit the longest length while explicit choices survive later edits and native round trips',()=>{
 const c=createCabinet(),added=addDrawerStack(c,c.compartments.id,2),id=added.featureIds[0],short=drawerPacks.find(p=>p.sideHeight===83.6&&p.nominalLength===400)!;
 const manual=fitDrawerRails(editDrawerGroup(added.cabinet,[id],{pack:{id:short.id,revision:short.revision},manualRail:true}));assert.equal(drawerPack(manual.drawers![0].pack).nominalLength,400);assert.equal(drawerPack(manual.drawers![1].pack).nominalLength,550);assert.deepEqual(deserialize(serialize(manual)),manual);
 const auto=fitDrawerRails(editDrawerGroup(manual,[id],{manualRail:false}));assert.equal(drawerPack(auto.drawers![0].pack).nominalLength,550);
 const old=JSON.parse(serialize(manual));old.schemaVersion=38;old.evaluatorRevision='notch-mouth-38';assert.throws(()=>deserialize(JSON.stringify(old)),/drawer intent/);
});
test('numeric pilot policy changes generic door and drawer preparation with strict limits and preserved fitting cups',()=>{
 const c=createCabinet(),added=addDrawerStack(c,c.compartments.id,2),modified=standardisePilotHoles(added.cabinet,3.2),model=evaluate(modified);assert.ok(model.drilling.filter(b=>b.kind==='pilot').every(b=>b.diameter===3.2));assert.deepEqual(deserialize(serialize(modified)),modified);
 const doors=addSimpleDoors(c,'single',[c.compartments.id]).cabinet;doors.fronts[0].hinge=defaultHinge();
 const doorModel=evaluate(standardisePilotHoles(doors,3.2));assert.ok(doorModel.drilling.filter(b=>b.kind==='hinge-pilot').every(b=>b.diameter===3.2));assert.ok(doorModel.drilling.some(b=>b.kind==='hinge-cup'&&b.diameter===35));
 assert.throws(()=>evaluate(standardisePilotHoles(c,6.1)),/pilot diameter/);
});
test('finger holes allow 100 mm on door and drawer fronts while knobs retain their existing limit',()=>{
 const c=createCabinet(),door=addSimpleDoors(c,'single',[c.compartments.id]),next=editFrontFeatures(door.cabinet,door.featureIds,{handle:{kind:'hole',diameter:100,horizontal:'centre',height:'centre'}});assert.doesNotThrow(()=>evaluate(next));assert.deepEqual(deserialize(serialize(next)),next);
 const drawers=addDrawerStack(c,c.compartments.id,2),d=editFrontFeatures(drawers.cabinet,[drawers.featureIds[0]],{handle:{kind:'hole',diameter:100,horizontal:'centre',height:'centre'}});assert.doesNotThrow(()=>evaluate(d));assert.throws(()=>evaluate(editFrontFeatures(next,door.featureIds,{handle:{diameter:100.1}})),/handle/);assert.throws(()=>evaluate(editFrontFeatures(next,door.featureIds,{handle:{kind:'knob',diameter:100}})),/handle/);
});
