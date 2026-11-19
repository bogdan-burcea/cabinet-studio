import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {setBackPanel} from '../src/commands/back-panel.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {addDivision} from '../src/commands/interiors.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
import {panelDisplayGeometry} from '../src/viewport/part-mesh.ts';

test('back construction changes sheet bounds, seats and clear depth together inside the overall envelope',()=>{
 for(const thickness of [3,6,9,12,16,18])for(const mode of ['inset','applied','groove','rebate'] as const){
  const c=setBackPanel(createCabinet(),{mode,thickness}),e=evaluate(c),back=e.panels.find(p=>p.role==='back')!;
  assert.equal(back.size[2],thickness);assert.equal(e.opening.origin[2],(mode==='groove'?10:0)+thickness);assert.equal(e.opening.size[2]+e.opening.origin[2],560);
  assert.deepEqual(back.size.slice(0,2),mode==='applied'?[600,720]:mode==='inset'?[564,684]:[574,694]);
  assert.equal(e.pockets.length,['groove','rebate'].includes(mode)?4:0);
  for(const p of e.panels)for(let i=0;i<3;i++){assert.ok(p.center[i]-p.size[i]/2>=-.001);assert.ok(p.center[i]+p.size[i]/2<=[600,720,560][i]+.001);}
  if(mode==='applied'){for(const p of e.panels.filter(p=>p.role!=='back'))assert.equal(p.center[2]-p.size[2]/2,thickness);}
 }
});
test('back edits preserve fixed interior identity, adapt depth and are reversible with joinery enabled',()=>{
 const c=createCabinet(),s=addDivision(c,c.compartments.id,'horizontal',342),base=setCabineo(s.cabinet,'cabineo-8'),store=new CabinetStore(base),next=setBackPanel(base,{mode:'groove',thickness:9,inset:30}),before=evaluate(base),after=evaluate(next);
 assert.deepEqual(after.panels.map(p=>p.id),before.panels.map(p=>p.id));assert.deepEqual(next.compartments,base.compartments);assert.equal(after.divisions[0].size[2],521);assert.equal(after.divisions[0].before,before.divisions[0].before);
 assert.ok(after.cabineo.flatMap(j=>j.bores).every(b=>b.point[2]>=39));assert.ok(store.commit(next));assert.deepEqual(readSimpleCabinet(serialize(next)),next);store.undo();assert.deepEqual(store.getSnapshot().committed,base);store.redo();assert.deepEqual(store.getSnapshot().committed,next);
 assert.equal(store.commit(setBackPanel(next,{depth:18})),false);assert.deepEqual(store.getSnapshot().committed,next);
});
test('native version 13 retains original geometry, strict joint parsing rejects unknown future intent',()=>{
 const original=createCabinet(),doc=JSON.parse(serialize(original));doc.schemaVersion=13;doc.evaluatorRevision='joinery-13';assert.deepEqual(deserializeWithInfo(JSON.stringify(doc)),{cabinet:original,migrated:true});
 const c=setBackPanel(original,{mode:'groove'}),saved=JSON.parse(serialize(c));for(const mutate of [(x:any)=>x.cabinet.carcass.back.joint.mode='invented',(x:any)=>x.cabinet.carcass.back.joint.depth=-1,(x:any)=>x.cabinet.carcass.back.joint.extra=true,(x:any)=>x.schemaVersion=13]){const bad=structuredClone(saved);mutate(bad);assert.throws(()=>readSimpleCabinet(JSON.stringify(bad)));}
});
test('display back grooves remove only their pocket volume and retain canonical bounds',()=>{
 const c=setBackPanel(createCabinet(),{mode:'groove'}),e=evaluate(c),p=e.panels.find(p=>p.role==='left')!,g=panelDisplayGeometry(p,e.pockets),position=g.getAttribute('position');let volume=0;
 // Box pieces share no interior volume. Sum their oriented triangle volumes.
 const ix=g.index;for(let i=0;i<(ix?.count??position.count);i+=3){const ids=[0,1,2].map(j=>ix?ix.getX(i+j):i+j),v=ids.map(j=>[position.getX(j),position.getY(j),position.getZ(j)]);volume+=(v[0][0]*(v[1][1]*v[2][2]-v[1][2]*v[2][1])-v[0][1]*(v[1][0]*v[2][2]-v[1][2]*v[2][0])+v[0][2]*(v[1][0]*v[2][1]-v[1][1]*v[2][0]))/6;}
 assert.ok(Math.abs(volume-(18*720*560-6*720*8))<1);g.dispose();assert.deepEqual(p.size,[18,720,560]);
});
