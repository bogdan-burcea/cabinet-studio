import {readSimpleCabinet} from '../src/persistence/simple';
import {setWallHanging} from '../src/commands/wall-hanging';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {deserializeWithInfo,serialize} from '../src/persistence/files';
import {evaluate} from '../src/geometry/evaluate';
import {stock} from '../src/catalogue/materials';
import {setBackPanel} from '../src/commands/back-panel';
import {setStockThickness} from '../src/commands/stock';
import {setConstructionMode} from '../src/commands/construction';
import {setCnc} from '../src/commands/cnc';
import {flattenParts} from '../src/cnc/parts';
import {CabinetStore} from '../src/commands/store';
const fixture=()=>deserializeWithInfo(fs.readFileSync(new URL('./fixtures/wall-rails-hanger.cabinet.json',import.meta.url),'utf8'));

test('saved wall cabinet migrates its back inset to rail thickness and cuts both hanger passages through the rail',()=>{
 const {cabinet:c,migrated}=fixture(),m=evaluate(c),t=stock(c,'carcass').thickness,rail=m.panels.find(p=>p.role==='back-upper-rail')!;
 assert.deepEqual(readSimpleCabinet(fs.readFileSync(new URL('./fixtures/wall-rails-hanger.cabinet.json',import.meta.url),'utf8')),c);
 assert.ok(migrated);assert.equal(c.carcass.back.joint!.inset,t);assert.equal(m.panels.find(p=>p.role==='back')!.center[2]-1.5,t);
 const cuts=m.pockets.filter(p=>p.kind==='hanger-access'&&p.panelId===rail.id);assert.equal(cuts.length,2);
 for(const cut of cuts){assert.equal(cut.origin[2],0);assert.equal(cut.size[2],t);const back=m.pockets.find(p=>p.id===cut.id.replace('/back-upper-rail-notch','/back-notch'))!;for(const axis of [0,1]){assert.ok(cut.origin[axis]>=back.origin[axis]);assert.ok(cut.origin[axis]+cut.size[axis]<=back.origin[axis]+back.size[axis]+1e-6);}}
 assert.ok(!m.issues.some(i=>i.code==='machining-collision'||i.code==='machining-hole-collision'));
 const housings=m.cabineo.filter(j=>j.hostId===rail.id&&j.receiverId!==`${c.id}/panel/top`).flatMap(j=>j.bores.filter(b=>b.kind==='housing'));
 for(const hole of housings)assert.ok(cuts.every(p=>hole.point[1]+hole.diameter/2<=p.origin[1]-10+1e-6));
 assert.equal(flattenParts(m).find(p=>p.id===rail.id)!.cuts.filter(p=>p.kind==='hanger-access').length,2);
 assert.deepEqual(deserializeWithInfo(serialize(c)),{cabinet:c,migrated:false});
});

test('rail thickness drives either seating and hanger pilot datums after stock edits, including translated cabinets',()=>{
 for(const mode of ['groove','rail-screws'] as const){
  let c=setBackPanel(fixture().cabinet,{mode,inset:60});c=setStockThickness(c,20);c.envelope.origin=[100,200,300];
  const m=evaluate(c),back=m.panels.find(p=>p.role==='back')!,cuts=m.pockets.filter(p=>p.kind==='hanger-access');assert.equal(back.center[2]-back.size[2]/2,320);
  assert.ok(cuts.every(p=>p.origin[0]>=100&&p.origin[1]>=200&&p.origin[2]>=300));
  assert.ok(m.drilling.filter(p=>p.id.includes('/installation/mounting/')).every(p=>[334,366].includes(p.point[2])));
  const rail=m.panels.find(p=>p.role==='back-upper-rail')!;assert.ok(cuts.filter(p=>p.panelId===rail.id).every(p=>p.size[2]===20));
  const store=new CabinetStore(c),open=setConstructionMode(c,'top','open');assert.ok(store.commit(open));store.undo();assert.deepEqual(store.getSnapshot().committed,c);
 }
});

test('omitted upper rail gets no orphan hanger cut and multiple connector targets stay clear',()=>{
 const c=fixture().cabinet;for(const count of [1,2,3]){const m=evaluate(setCnc(c,{cabineoPerSide:count}));assert.ok(!m.issues.some(i=>i.code==='machining-collision'));}
 c.carcass.back.upperHeight=0;const m=evaluate(c);assert.ok(!m.pockets.some(p=>p.id.endsWith('/back-upper-rail-notch')));assert.equal(m.pockets.filter(p=>p.kind==='hanger-access').length,2);
});

test('wall hanging works with rear rails alone in either edit order, without orphan back cuts',()=>{
 const source=fixture().cabinet;
 for(const first of [true,false]){
  const noBack=setConstructionMode(setWallHanging(source,false),'back','rails');
  const c=first?setConstructionMode(source,'back','rails'):setWallHanging(noBack,true),m=evaluate(c),rail=m.panels.find(p=>p.role==='back-upper-rail')!;
  assert.ok(!m.panels.some(p=>p.role==='back'));assert.equal(m.drilling.filter(b=>b.id.includes('/installation/mounting/')).length,4);
  assert.equal(m.pockets.filter(p=>p.kind==='hanger-access'&&p.panelId===rail.id).length,2);assert.ok(!m.pockets.some(p=>p.id.endsWith('/back-notch')));
  assert.ok(!m.issues.some(i=>i.code==='machining-collision'));assert.deepEqual(deserializeWithInfo(serialize(c)).cabinet,c);
  const store=new CabinetStore(c),withBack=setConstructionMode(c,'back','rails-panel');assert.ok(store.commit(withBack));assert.equal(evaluate(withBack).pockets.filter(p=>p.id.endsWith('/back-notch')).length,2);store.undo();assert.deepEqual(store.getSnapshot().committed,c);
 }
});


test('active wall side notch insets rails, back, seating and matched hardware by its 8 mm depth',()=>{
 for(const mode of ['groove','rail-screws'] as const)for(const backMode of ['rails-panel','rails','full'] as const){
  if(backMode==='full'&&mode==='rail-screws')continue;
  let c=setConstructionMode(fixture().cabinet,'back',backMode);c=setWallHanging(c,true);
  if(backMode!=='rails')c=setBackPanel(c,{mode});
  c.envelope.origin=[110,220,330];
  const before=evaluate(c),notched={...c,installation:{...c.installation,mounting:{...c.installation.mounting,sideNotch:60}}},after=evaluate(notched);
  for(const role of ['back-upper-rail','back-lower-rail','back']){
   const a=before.panels.find(p=>p.role===role),b=after.panels.find(p=>p.role===role);if(!a)continue;
   assert.deepEqual(b!.size,a.size);assert.equal(b!.center[2],a.center[2]+8);
  }
  for(const bore of after.drilling.filter(b=>b.id.includes('/installation/mounting/')||b.id.includes('/rail-screw-receiver/')||b.id.includes('/back-pilot/'))){const old=before.drilling.find(b=>b.id===bore.id)!;assert.equal(bore.point[2],old.point[2]+8);}
  for(const pocket of after.pockets.filter(p=>p.id.includes('/back-seat/')||p.id.endsWith('/back-notch')||p.id.endsWith('/back-upper-rail-notch'))){const old=before.pockets.find(p=>p.id===pocket.id)!;assert.equal(pocket.origin[2],old.origin[2]+8);}
  assert.ok(!after.issues.some(i=>['machining-collision','machining-hole-collision'].includes(i.code)));
  assert.deepEqual(deserializeWithInfo(serialize(notched)).cabinet,notched);
  const store=new CabinetStore(c);assert.ok(store.commit(notched));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,notched);
  const disabled=setWallHanging(notched,false);assert.equal(evaluate(disabled).panels.find(p=>p.role=== (backMode==='rails'?'back-upper-rail':'back'))!.center[2],before.panels.find(p=>p.role===(backMode==='rails'?'back-upper-rail':'back'))!.center[2]);
 }
});
