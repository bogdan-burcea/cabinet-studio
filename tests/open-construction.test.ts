import {editRepairs} from '../src/commands/edit-repairs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet,type Cabinet} from '../src/domain/cabinet';
import {setConstructionMode,defaultFrontRails} from '../src/commands/construction';
import {evaluate} from '../src/geometry/evaluate';
import {readSimpleCabinet} from '../src/persistence/simple';
import {serialize,deserializeWithInfo} from '../src/persistence/files';
import {setCabineo} from '../src/commands/cabineo';
import {setBackPanel,setBackFastener} from '../src/commands/back-panel';
import {addDivision,setInteriorFinger} from '../src/commands/interiors';
import {addDrawerStack} from '../src/commands/drawers';
import {setPuzzleCorners} from '../src/commands/stock';
import {CabinetStore} from '../src/commands/store';
import {flattenParts} from '../src/cnc/parts';
import {planSheets} from '../src/cnc/layout';
const rails=(c:Cabinet)=>{const next=structuredClone(c);next.carcass.frontRails=defaultFrontRails();next.carcass.frontRails.top={enabled:true,width:90};next.carcass.frontRails.bottom={enabled:true,width:60};return next;};

test('every top/back combination produces actual independent rail parts and valid machining',()=>{
 for(const top of ['full','rails','open'] as const)for(const back of ['full','rails','open'] as const){
  let c=setConstructionMode(setConstructionMode(createCabinet(),'top',top),'back',back);
  c.carcass.top.frontDepth=70;c.carcass.top.rearDepth=95;c.carcass.back.upperHeight=110;c.carcass.back.lowerHeight=65;
  c=setCabineo(rails(c),'cabineo-8');const m=evaluate(c),part=(role:string)=>m.panels.find(p=>p.role===role);
  assert.equal(!!part('top'),top==='full');assert.equal(!!part('back'),back==='full');
  assert.equal(part('top-front-rail')?.size[2],top==='rails'?70:undefined);assert.equal(part('top-rear-rail')?.size[2],top==='rails'?95:undefined);
  assert.equal(part('back-upper-rail')?.size[1],back==='rails'?110:undefined);assert.equal(part('back-lower-rail')?.size[1],back==='rails'?65:undefined);
  assert.equal(part('front-upper-rail')?.size[1],90);assert.equal(part('front-lower-rail')?.size[1],60);
  assert.ok(m.cabineo.every(j=>m.panels.some(p=>p.id===j.hostId)&&m.panels.some(p=>p.id===j.receiverId)));
  assert.deepEqual(m.issues,[]);assert.deepEqual(readSimpleCabinet(serialize(c)),c);
  assert.equal(flattenParts(m).length,m.panels.length);assert.equal(planSheets(flattenParts(m),{},.2).unplaced.length,0);
  // No rectangular bodies intersect; neighbouring boards share boundary faces.
  for(let i=0;i<m.panels.length;i++)for(const q of m.panels.slice(i+1)){const p=m.panels[i];assert.ok(![0,1,2].every(a=>Math.min(p.center[a]+p.size[a]/2,q.center[a]+q.size[a]/2)-Math.max(p.center[a]-p.size[a]/2,q.center[a]-q.size[a]/2)>.001),`${top}/${back}: ${p.role} intersects ${q.role}`);}
 }
});

test('front reinforcement reserves a usable opening for dividers and drawer stacks and is undoable',()=>{
 const c=createCabinet(),before=addDivision(c,c.compartments.id,'vertical',282).cabinet,next=rails(before),m=evaluate(next),divider=m.divisions[0];
 assert.equal(divider.id,evaluate(before).divisions[0].id);assert.equal(divider.origin[1],78);assert.equal(divider.size[1],534);
 const drawers=addDrawerStack(rails(c),c.compartments.id,3).cabinet,model=evaluate(drawers);assert.equal(model.drawers.drawers.length,3);
 const store=new CabinetStore(before);assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,before);store.redo();assert.deepEqual(store.getSnapshot().committed,next);
 const invalid=rails(c);invalid.carcass.frontRails!.top.width=600;invalid.carcass.frontRails!.bottom.width=600;assert.throws(()=>evaluate(invalid),/60 mm/);
});

test('open backs retain dormant back settings without orphan holes; captured backs seat in the rear top rail',()=>{
 let c=setBackFastener(createCabinet(),true);const saved=structuredClone(c.carcass.back.joint);
 c=setConstructionMode(c,'back','open');const m=evaluate(c);assert.equal(m.backFasteners.length,0);assert.equal(m.pockets.filter(p=>p.id.includes('/back-seat/')).length,0);assert.deepEqual(c.carcass.back.joint,saved);
 c=setConstructionMode(c,'back','full');c=setConstructionMode(c,'top','rails');assert.ok(evaluate(c).backFasteners.every(b=>b.axis===0));assert.ok(evaluate(c).pockets.some(p=>p.panelId.endsWith('/top-rear-rail')));
 for(const mode of ['groove','rebate','applied','finger'] as const){const base=setBackPanel(createCabinet(),{mode});for(const top of ['rails','open'] as const){const next=setConstructionMode(base,'top',top),model=evaluate(next),ids=new Set(model.panels.map(p=>p.id));assert.ok(model.pockets.every(p=>ids.has(p.panelId)),`${mode}/${top} has an orphan cut`);assert.ok(model.drilling.every(h=>ids.has(h.panelId)));}}
});

test('open tops retain bottom finger corners, and dividers attach to both top rails with Cabineos',()=>{
 const c=createCabinet(),open=setConstructionMode(setPuzzleCorners(c,true),'top','open'),m=evaluate(open);assert.ok(m.pockets.some(p=>p.panelId.endsWith('/bottom')));assert.ok(!m.pockets.some(p=>p.panelId.endsWith('/top')));
 const split=addDivision(c,c.compartments.id,'vertical',282),next=setCabineo(setConstructionMode(split.cabinet,'top','rails'),'cabineo-8'),model=evaluate(next);
 assert.ok(model.cabineo.some(j=>j.hostId===split.featureId&&j.receiverId.endsWith('/top-front-rail')));assert.ok(model.cabineo.some(j=>j.hostId===split.featureId&&j.receiverId.endsWith('/top-rear-rail')));
 const old=JSON.parse(serialize(c));old.schemaVersion=41;old.evaluatorRevision='t-bone-seats-41';assert.equal(deserializeWithInfo(JSON.stringify(old)).migrated,true);
 const invalid=JSON.parse(serialize(next));invalid.cabinet.carcass.frontRails={revision:'front-rail-1',top:{enabled:'yes',width:80},bottom:{enabled:false,width:80}};assert.throws(()=>readSimpleCabinet(JSON.stringify(invalid)),/invalid/i);
});


test('construction conflicts offer evaluated minimum rail sizing and unsupported-divider joint repairs',()=>{
 const small=createCabinet();small.envelope.height=120;small.carcass.frontRails=defaultFrontRails();small.carcass.frontRails.top.enabled=true;
 const sized=editRepairs(small,createCabinet()).find(r=>r.label.includes('24 mm top'));
 assert.ok(sized);assert.equal(sized.cabinet.carcass.frontRails!.top.width,24);assert.doesNotThrow(()=>evaluate(sized.cabinet));
 const base=createCabinet(),split=addDivision(base,base.compartments.id,'vertical',282),joined=setInteriorFinger(split.cabinet,split.featureId,true);
 const requested=setConstructionMode(joined,'top','rails');assert.throws(()=>evaluate(requested),/continuous supporting/);
 const repaired=editRepairs(requested,joined).find(r=>r.label.includes('butt joints'));assert.ok(repaired);assert.equal(repaired.cabinet.carcass.top.mode,'rails');assert.equal(evaluate(repaired.cabinet).divisions[0].id,split.featureId);
});
