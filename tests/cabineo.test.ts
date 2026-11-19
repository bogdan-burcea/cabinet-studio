import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {partFace,preferredFace} from '../src/geometry/part-face.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
import {resizeCabinet} from '../src/commands/dimensions.ts';
import {addDivision,moveDivision,removeDivision} from '../src/commands/interiors.ts';

test('Cabineo 8 and 12 reproduce Workshop matched pattern, fixed underside and side face datum',()=>{
 for(const id of ['cabineo-8','cabineo-12'] as const){
  const c=setCabineo(createCabinet(),id),e=evaluate(c);assert.equal(e.cabineo.length,12);
  for(const j of e.cabineo){const [a,b,d,r]=j.bores;
   assert.deepEqual(j.bores.map(b=>b.diameter),[15,15,15,5]);assert.deepEqual(j.bores.map(b=>b.depth),[11,11,11,id==='cabineo-8'?8:12]);
   assert.ok(Math.abs(Math.abs(b.point[0]-a.point[0])-11.2)<1e-6);assert.ok(Math.abs(Math.abs(d.point[0]-a.point[0])-22.4)<1e-6);
   assert.equal(Math.abs(a.point[1]-r.point[1]),5);
  }
  const shelf=addDivision(c,c.compartments.id,'horizontal',342),se=evaluate(shelf.cabinet),sp=se.panels.find(p=>p.id===shelf.featureId)!;
  assert.equal(se.cabineo.filter(j=>j.hostId===sp.id).length,6);
  assert.ok(se.cabineo.filter(j=>j.hostId===sp.id).every(j=>j.bores[0].point[1]===sp.center[1]-sp.size[1]/2));
 }
});
test('long joint spacing never exceeds 300 and existing panel identities survive joinery, resize and move',()=>{
 const c=setCabineo(resizeCabinet(createCabinet(),'depth',1000),'cabineo-8'),e=evaluate(c),positions=e.cabineo.filter(j=>j.hostId.endsWith('/bottom')&&j.receiverId.endsWith('/left')).map(j=>j.bores[0].point[2]);
 assert.equal(positions[0],50);assert.equal(positions.at(-1),950);for(let i=1;i<positions.length;i++)assert.ok(positions[i]-positions[i-1]<=300);
 const s=addDivision(c,c.compartments.id,'vertical',282),m=moveDivision(s.cabinet,s.featureId,200);assert.ok(evaluate(m).cabineo.some(j=>j.hostId===s.featureId));assert.deepEqual(evaluate(m).panels.map(p=>p.id),evaluate(s.cabinet).panels.map(p=>p.id));assert.equal(evaluate(removeDivision(m,s.featureId)).cabineo.length,e.cabineo.length);
});
test('shared 18 mm dividers accept opposing Cabineo 8 but reject overlapping 12 mm fixing bores',()=>{
 const c=createCabinet(),d=addDivision(c,c.compartments.id,'vertical',282),open=evaluate(d.cabinet).openings,a=addDivision(d.cabinet,open[0].id,'horizontal',342),b=addDivision(a.cabinet,open[1].id,'horizontal',342);
 assert.doesNotThrow(()=>evaluate(setCabineo(b.cabinet,'cabineo-8')));const store=new CabinetStore(setCabineo(b.cabinet,'cabineo-8'));assert.equal(store.commit(setCabineo(b.cabinet,'cabineo-12')),false);assert.match(store.getSnapshot().error!,/overlap/);assert.equal(store.getSnapshot().committed.hardware[0].id,'cabineo-8');
});
test('Cabineo intent saves, opens, undoes and migrates version 12 without altering earlier data',()=>{
 const c=createCabinet(),s=new CabinetStore(c),next=setCabineo(c,'cabineo-8');assert.ok(s.commit(next));assert.deepEqual(readSimpleCabinet(serialize(next)),next);s.undo();assert.deepEqual(s.getSnapshot().committed,c);s.redo();assert.deepEqual(s.getSnapshot().committed,next);
 const legacy=JSON.parse(serialize(c));legacy.schemaVersion=12;legacy.evaluatorRevision='drawers-12';assert.deepEqual(deserializeWithInfo(JSON.stringify(legacy)),{cabinet:c,migrated:true});legacy.cabinet.hardware=next.hardware;assert.throws(()=>readSimpleCabinet(JSON.stringify(legacy)));
 const bad=structuredClone(next);bad.hardware[0].revision='unknown';assert.throws(()=>evaluate(bad));
});
test('face-up thumbnails keep housing/receiver coordinates in bounds and separate opposite faces',()=>{
 const c=setCabineo(createCabinet(),'cabineo-8'),e=evaluate(c),bores=e.cabineo.flatMap(j=>j.bores);
 for(const p of e.panels){const face=partFace(p,bores,preferredFace(p,bores));assert.ok(face.width>0&&face.height>0);for(const b of face.bores){assert.ok(b.x>=0&&b.x<=face.width&&b.y>=0&&b.y<=face.height);assert.equal(b.sign,-preferredFace(p,bores));}}
 const right=e.panels.find(p=>p.role==='right')!;assert.equal(partFace(right,bores,preferredFace(right,bores)).bores.length,6);
});
