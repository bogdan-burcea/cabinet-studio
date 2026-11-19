import test from 'node:test';
import assert from 'node:assert/strict';
import {holesOverlap} from '../src/rules/hole-collisions.ts';
import {machiningReview} from '../src/rules/machining-review.ts';
import type {CabineoBore} from '../src/rules/cabineo.ts';
import {createCabinet} from '../src/domain/cabinet.ts';
import {setSimpleSupport,setSimpleFeet} from '../src/commands/simple-supports.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {footHoleRepairs} from '../src/commands/clearance-repairs.ts';
import {serialize,deserialize} from '../src/persistence/files.ts';
const bore=(id:string,point:[number,number,number],axis:0|1|2,diameter=4,depth=10):CabineoBore=>({id,group:id,panelId:'panel',kind:'foot-pilot',point,axis,sign:1,diameter,depth});
test('finite bore collision checks distinguish parallel, perpendicular, tangential and near-miss cuts',()=>{
 const a=bore('a',[0,0,0],1);assert.ok(holesOverlap(a,bore('b',[3,4,0],1)));assert.ok(!holesOverlap(a,bore('b',[4,0,0],1)));assert.ok(!holesOverlap(a,bore('b',[0,11,0],1)));assert.ok(holesOverlap(a,bore('b',[-5,5,0],0)));assert.ok(!holesOverlap(a,bore('b',[-5,5,5],0)));assert.ok(!holesOverlap(a,bore('b',[2.5,11.5,2],0)));assert.ok(!holesOverlap(a,bore('b',[-5,5,4],0)));
});
test('machining review reports both operation identities, ignores compound Cabineo cuts and shared shelf through bores',()=>{
 const panels=[{id:'panel',role:'bottom',orientation:'xz' as const,center:[0,5,0] as [number,number,number],size:[100,10,100] as [number,number,number]}],a=bore('a',[0,0,0],1),b=bore('b',[2,0,0],1);
 const issues=machiningReview(panels,[],[a,b],[]).filter(i=>i.code==='machining-hole-collision');assert.equal(issues.length,1);assert.deepEqual(issues[0].operationIds,['a','b']);assert.deepEqual(issues[0].relatedIds,['a','b']);
 const housing={...a,kind:'housing' as const,group:'joint'},pilot={...b,kind:'pilot' as const,group:'joint'};assert.ok(!machiningReview(panels,[],[housing,pilot],[]).some(i=>i.code==='machining-hole-collision'));
 const shelf={...a,kind:'shelf-support' as const,through:true};assert.ok(!machiningReview(panels,[],[shelf,{...shelf,id:'opposed',point:[0,10,0],sign:-1}],[]).some(i=>i.code==='machining-hole-collision'));
});
test('actual foot/Cabineo hole overlap is visible and has a minimal evaluated placement repair',()=>{
 let c=setSimpleFeet(setSimpleSupport(setCabineo(createCabinet(),'cabineo-8'),'feet-concept'),{frontInset:66,sideInset:50});const e=evaluate(c);assert.ok(e.issues.some(i=>i.code==='machining-hole-collision'));const repairs=footHoleRepairs(c);assert.ok(repairs.length);for(const r of repairs){assert.ok(!evaluate(r.cabinet).issues.some(i=>i.code==='machining-hole-collision'&&i.operationIds?.some(id=>id.includes('/installation/foot/'))));assert.deepEqual(r.cabinet.fronts,c.fronts);assert.deepEqual(deserialize(serialize(r.cabinet)),r.cabinet);}
});
test('legacy blind foot pilots migrate to through holes and current geometry always passes through bottom stock',()=>{
 const c=setSimpleSupport(createCabinet(),'feet-concept'),doc=JSON.parse(serialize(c));doc.schemaVersion=27;doc.evaluatorRevision='support-drilling-27';doc.cabinet.installation.feet.drilling.through=false;const loaded=deserialize(JSON.stringify(doc));assert.equal(loaded.installation.feet.drilling!.through,true);assert.ok(evaluate(loaded).drilling.filter(b=>b.kind==='foot-pilot').every(b=>b.through&&b.depth===18));
});
