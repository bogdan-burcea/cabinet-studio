import {holesOverlap,intentionalHoleUnion} from '../src/rules/hole-collisions';
import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {setBackPanel,setBackFastener} from '../src/commands/back-panel';
import {setConstructionMode} from '../src/commands/construction';
import {evaluate} from '../src/geometry/evaluate';
import {serialize,deserializeWithInfo} from '../src/persistence/files';
import {flattenParts} from '../src/cnc/parts';
import {holeSpacingRepairs} from '../src/commands/hole-spacing-repairs';
import {setCabineo} from '../src/commands/cabineo';
import {addDivision} from '../src/commands/interiors';
import {addInteriors} from '../src/commands/simple-interiors';
import {setCnc} from '../src/commands/cnc';
import {positionShelfHoles} from '../src/commands/adjustable';
import {CabinetStore} from '../src/commands/store';

test('flush rear rails accept grooves or inside screws with separate physical Cut parts',()=>{
 for(const top of ['full','rails','open'] as const)for(const mode of ['groove','rail-screws'] as const){
  const c=setBackPanel(setConstructionMode(setConstructionMode(createCabinet(),'top',top),'back','rails-panel'),{mode}),m=evaluate(c),panel=m.panels.find(p=>p.role==='back')!;
  assert.equal(c.carcass.back.joint!.mode,mode);
  for(const rail of m.panels.filter(p=>p.role.startsWith('back-')))assert.ok(rail.center[2]+rail.size[2]/2<=panel.center[2]-panel.size[2]/2+1e-6);
  assert.equal(flattenParts(m).filter(p=>p.panel.role.startsWith('back')).length,3);assert.deepEqual(deserializeWithInfo(serialize(c)).cabinet,c);
  if(mode==='groove')assert.ok(m.pockets.some(p=>p.id.includes('/back-seat/')));else assert.ok(m.drilling.some(p=>p.kind==='pilot'));
 }
 const c=setConstructionMode(setBackFastener(createCabinet(),true),'back','rails-panel');assert.equal(evaluate(c).backFasteners.length,4);
 for(const mode of ['inset','applied','rebate','finger'] as const)assert.throws(()=>evaluate(setBackPanel(c,{mode})),/grooves|Ixconnect/);
});
function collision(){
 const base=setCabineo(createCabinet(),'cabineo-8'),d=addDivision(base,base.compartments.id,'vertical',282);let c=d.cabinet;
 const ids=evaluate(c).openings.map(o=>o.id);c=addInteriors(c,[ids[1]],'fixed').cabinet;c=addInteriors(c,[ids[0]],'adjustable').cabinet;
 const m=evaluate(c),b=m.cabineo.flatMap(j=>j.bores).find(b=>b.kind==='receiver'&&b.panelId===d.featureId)!,s=c.contents[0],o=m.openings.find(o=>o.id===s.openingId)!;
 c=setCnc(c,{shelfRowInsets:{rear:b.point[2]-o.origin[2],front:37},throughHoles:{[d.featureId]:'adjustment'}});c=positionShelfHoles(c,[s.id],'height',b.point[1]-o.origin[1]);return c;
}
test('shelf and fastener hole collisions offer the nearest safe spacing without removing hardware',()=>{
 const c=collision(),before=evaluate(c),hits=before.issues.filter(i=>i.code==='machining-hole-collision');assert.ok(hits.length);
 const repairs=holeSpacingRepairs(c,hits);assert.ok(repairs.length>0);assert.ok(repairs.every(r=>!evaluate(r.cabinet).issues.some(i=>i.code==='machining-hole-collision')));
 for(const repair of repairs){const model=evaluate(repair.cabinet),bores=[...model.drilling,...model.backFasteners,...model.cabineo.flatMap(j=>j.bores)];for(const a of bores.filter(b=>b.kind==='shelf-support'))for(const b of bores)if(a.id!==b.id&&a.panelId===b.panelId&&!intentionalHoleUnion(a,b))assert.ok(!holesOverlap({...a,diameter:a.diameter+20},b),'Safe correction needs a 10 mm edge gap');}
 const next=repairs[0].cabinet;assert.deepEqual(next.hardware,c.hardware);assert.deepEqual(next.compartments,c.compartments);assert.deepEqual(next.contents.map(({drilling,...s})=>s),c.contents.map(({drilling,...s})=>s));assert.deepEqual(deserializeWithInfo(serialize(next)).cabinet,next);
 const store=new CabinetStore(c);assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,next);
});
