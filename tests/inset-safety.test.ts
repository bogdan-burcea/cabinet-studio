import {defaultHinge} from '../src/catalogue/hinges.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addDivision,moveDivision} from '../src/commands/interiors.ts';
import {addSimpleDoors,editSimpleDoors} from '../src/commands/simple-doors.ts';
import {editRepairs} from '../src/commands/edit-repairs.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserialize} from '../src/persistence/files.ts';
import {footHoleSafetyConflict,holesOverlap} from '../src/rules/hole-collisions.ts';
import type {CabineoBore} from '../src/rules/cabineo.ts';
import {setSimpleSupport,setSimpleFeet} from '../src/commands/simple-supports.ts';
import {defaultFootDrilling} from '../src/rules/foot-drilling.ts';
test('adjacent inset doors surround the protruding divider and follow divider moves',()=>{
 const base=createCabinet(),split=addDivision(base,base.compartments.id,'vertical',282),openings=evaluate(split.cabinet).openings.map(o=>o.id),doors=addSimpleDoors(split.cabinet,'single',openings),candidate=editSimpleDoors(doors.cabinet,doors.featureIds,{placement:'inset'});assert.doesNotThrow(()=>evaluate(candidate));const fixed=candidate;assert.equal(fixed.compartments.kind==='split'?fixed.compartments.frontSetback??0:-1,0);
 for(const c of [fixed,moveDivision(fixed,split.featureId,320)]){const e=evaluate(c),[left,right]=e.fronts.doors,divider=e.panels.find(p=>p.role==='divider')!,a=left.center[0]+left.size[0]/2,b=right.center[0]-right.size[0]/2;assert.equal(b-a,divider.size[0]+2);assert.equal((a+b)/2,divider.center[0]);assert.ok(a<divider.center[0]-divider.size[0]/2);assert.ok(b>divider.center[0]+divider.size[0]/2);assert.ok(divider.center[2]+divider.size[2]/2>left.center[2]+left.size[2]/2);assert.deepEqual(deserialize(serialize(c)),c);}
 const withHinges={...fixed,fronts:fixed.fronts.map(d=>({...d,hinge:defaultHinge()}))},hinges=evaluate(withHinges).doorHardware.hinges;assert.ok(hinges.some(h=>h.supportId===split.featureId&&h.article==='71B3750'));assert.ok(hinges.some(h=>h.supportId.endsWith('/panel/left')&&h.article==='71B3750'));
 const store=new CabinetStore(doors.cabinet);assert.ok(store.commit(fixed));store.undo();assert.deepEqual(store.getSnapshot().committed,doors.cabinet);
});
test('foot holes require 4 mm material clearance, including perpendicular drilling and panel edges',()=>{
 const a:CabineoBore={id:'foot',panelId:'bottom',group:'foot',kind:'foot-pilot',point:[0,0,0],axis:1,sign:1,depth:18,diameter:3,through:true},b={...a,id:'other',group:'other',kind:'pilot' as const,point:[6,0,0] as [number,number,number]};assert.ok(!holesOverlap(a,b));assert.ok(footHoleSafetyConflict(a,b));assert.ok(!footHoleSafetyConflict(a,{...b,point:[7,0,0]}));assert.ok(footHoleSafetyConflict(a,{...b,axis:0,point:[-10,5,6]}));
 const c=setSimpleSupport(createCabinet(),'feet-concept');assert.throws(()=>evaluate(setSimpleFeet(c,{sideInset:37})),/4 mm safety/);assert.doesNotThrow(()=>evaluate(setSimpleFeet(c,{sideInset:40})));assert.throws(()=>evaluate(setSimpleFeet(c,{drilling:{...defaultFootDrilling(c),pitchX:6}})),/at least 4 mm/);
});
