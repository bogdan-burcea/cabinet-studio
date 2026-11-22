import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet,resize} from '../src/domain/cabinet';
import {setConstructionMode,defaultFrontRails} from '../src/commands/construction';
import {addDivision,setInteriorFinger} from '../src/commands/interiors';
import {evaluate} from '../src/geometry/evaluate';
import {flattenParts} from '../src/cnc/parts';
import {planSheets} from '../src/cnc/layout';
import {calculateEstimate,costQuantities} from '../src/costs/estimate';
import {decodeCostPreferences} from '../src/costs/preferences';
import {setCabineo} from '../src/commands/cabineo';
import {setBackPanel,setBackFastener} from '../src/commands/back-panel';
import {editRepairs} from '../src/commands/edit-repairs';
import {serialize,deserializeWithInfo} from '../src/persistence/files';
import {CabinetStore} from '../src/commands/store';
import {disjointAfterNotches} from './notched-overlap';

test('bottom and rear rail intersections produce relieved notches and keep the rails fixed',()=>{
 for(const top of ['full','rails','open'] as const)for(const back of ['rails','rails-panel'] as const){
  let c=setConstructionMode(setConstructionMode(createCabinet(),'top',top),'back',back);c.carcass.frontRails=defaultFrontRails();c.carcass.frontRails.top={enabled:true,width:120};c.carcass.frontRails.bottom={enabled:true,width:80};c=addDivision(c,c.compartments.id,'vertical',282).cabinet;c=setCabineo(c,'cabineo-8');
  const m=evaluate(c),p=m.panels.find(p=>p.role==='divider')!,cuts=m.pockets.filter(cut=>cut.kind==='rail-notch'&&cut.panelId===p.id);
  assert.equal(p.center[1]-p.size[1]/2,18);assert.equal(p.center[2]-p.size[2]/2,back==='rails-panel'?24:0);
  for(const role of back==='rails-panel'?['front-lower-rail']:['front-lower-rail','back-lower-rail','back-upper-rail'])assert.ok(cuts.some(cut=>cut.id.endsWith('/'+role)&&(cut.reliefs?.length??0)>0));
  for(const a of m.panels.filter(p=>p.role!=='back'))for(const b of m.panels.filter(p=>p.role!=='back'))if(a.id!==b.id)assert.ok(disjointAfterNotches(a,b,m.pockets),`${top}/${back}: ${a.role}/${b.role}`);
  assert.ok(!m.issues.some(i=>i.code==='machining-collision'));assert.ok(flattenParts(m).find(part=>part.id===p.id)!.cuts.some(cut=>cut.reliefs?.length));
  assert.equal(m.panels.filter(p=>p.role==='back').length,back==='rails-panel'?1:0);assert.equal(planSheets(flattenParts(m),{},.2).unplaced.length,0);
  assert.deepEqual(deserializeWithInfo(serialize(c)).cabinet,c);
 }
});
test('hybrid back keeps panel and rail identities and survives Undo',()=>{
 const c=createCabinet(),next=setConstructionMode(setBackPanel(c,{mode:'applied'}),'back','rails-panel'),m=evaluate(next);assert.equal(m.panels.find(p=>p.role==='back')!.size[2],6);assert.equal(m.panels.find(p=>p.role==='back-upper-rail')!.center[2],9);assert.ok(m.pockets.some(p=>p.id.includes('/back-seat/')));
 const store=new CabinetStore(c);assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,next);
 const captured=setBackFastener(c,true),screwed=setBackPanel(setConstructionMode(captured,'back','rails-panel'),{mode:'rail-screws'});assert.equal(screwed.carcass.back.joint!.fastener,undefined);assert.doesNotThrow(()=>evaluate(screwed));
 const crowded=structuredClone(next);crowded.carcass.back.upperHeight=500;crowded.carcass.back.lowerHeight=500;assert.throws(()=>evaluate(crowded),/20 mm between/);
 const shallow=structuredClone(next);shallow.envelope.depth=80;assert.throws(()=>evaluate(shallow),/Depth|60 mm/);
});

test('rear notches preserve existing paired finger joints instead of adding unpaired tabs',()=>{
 const c=createCabinet(),s=addDivision(c,c.compartments.id,'horizontal',300),joined=setInteriorFinger(s.cabinet,s.featureId,true),next=setConstructionMode(joined,'back','rails');
 const m=evaluate(next),shelf=m.panels.find(p=>p.id===s.featureId)!;assert.equal(shelf.center[2]-shelf.size[2]/2,18);
 assert.ok(m.pockets.some(p=>p.kind==='puzzle'&&p.panelId===shelf.id));assert.deepEqual(deserializeWithInfo(serialize(next)).cabinet,next);
});
