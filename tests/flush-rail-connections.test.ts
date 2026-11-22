import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {setConstructionMode,defaultFrontRails} from '../src/commands/construction';
import {setBackPanel,setBackFastener} from '../src/commands/back-panel';
import {setCabineo} from '../src/commands/cabineo';
import {addDivision} from '../src/commands/interiors';
import {setCnc} from '../src/commands/cnc';
import {evaluate} from '../src/geometry/evaluate';
import {serialize,deserializeWithInfo} from '../src/persistence/files';
import {CabinetStore} from '../src/commands/store';
import {machiningReview} from '../src/rules/machining-review';
import {resolveBackFasteners} from '../src/rules/back-fasteners';
import {billOfMaterials} from '../src/docs/project';
import {planSheets} from '../src/cnc/layout';
import {flattenParts} from '../src/cnc/parts';

test('divider notches receive matched Cabineos into intersected vertical rails; rear housings face the interior',()=>{
 for(const top of ['full','rails','open'] as const){
  let c=setConstructionMode(setConstructionMode(createCabinet(),'back','rails'),'top',top);
  c.carcass.frontRails=defaultFrontRails();c.carcass.frontRails.top={enabled:true,width:120};c.carcass.frontRails.bottom={enabled:true,width:80};
  const split=addDivision(c,c.compartments.id,'vertical',282);c=setCnc(setCabineo(split.cabinet,'cabineo-8'),{throughOpposed:false});
  const m=evaluate(c),joints=m.cabineo.filter(j=>j.hostId===split.featureId&&j.id.includes('/cabineo/rail/'));
  assert.equal(joints.length,4);
  for(const joint of joints){const rail=m.panels.find(p=>p.id===joint.receiverId)!,receiver=joint.bores.find(b=>b.kind==='receiver')!;assert.equal(receiver.axis,2);assert.equal(receiver.point[2],rail.center[2]+(rail.role.startsWith('back-')?1:-1)*rail.size[2]/2);assert.equal(receiver.sign,rail.role.startsWith('back-')?-1:1);assert.equal(joint.bores.filter(b=>b.kind==='housing').length,3);}
  for(const j of m.cabineo.filter(j=>j.hostId.includes('/panel/back-')))assert.ok(j.bores.filter(b=>b.kind==='housing').every(b=>b.axis===2&&b.sign===-1&&b.point[2]===18));
  assert.ok(!m.issues.some(i=>i.code==='machining-collision'||i.code==='machining-hole-collision'));
  assert.deepEqual(evaluate(deserializeWithInfo(serialize(c)).cabinet).cabineo,m.cabineo);
 }
});

test('inside screws traverse the panel and pilot the actual rails, with translated origins and correct quantities',()=>{
 const base=createCabinet();base.envelope.origin=[100,200,300];
 const c=setBackPanel(setConstructionMode(base,'back','rails-panel'),{mode:'rail-screws'}),m=evaluate(c),holes=m.drilling.filter(b=>b.panelId.endsWith('/back')),receivers=m.drilling.filter(b=>b.id.includes('/rail-screw-receiver/'));
 assert.equal(holes.length,2);assert.equal(receivers.length,2);
 for(const hole of holes){assert.equal(hole.point[2],324);assert.equal(hole.sign,-1);assert.equal(hole.depth,6);assert.equal(hole.through,true);const receiver=receivers.find(b=>b.group===hole.group)!;assert.deepEqual(receiver.point,[hole.point[0],hole.point[1],318]);assert.equal(receiver.sign,-1);assert.equal(receiver.depth,10);}
 assert.equal(billOfMaterials(c,m,planSheets(flattenParts(m),{},.2)).hardware.find(h=>h.id==='Applied-back screws')?.count,2);
 assert.deepEqual(deserializeWithInfo(serialize(c)).cabinet,c);
 const store=new CabinetStore(base);assert.ok(store.commit(c));store.undo();assert.deepEqual(store.getSnapshot().committed,base);store.redo();assert.deepEqual(store.getSnapshot().committed,c);
 const empty=structuredClone(c);empty.carcass.back.upperHeight=empty.carcass.back.lowerHeight=0;assert.throws(()=>evaluate(empty),/at least one rear rail/);
});

test('an uncovered rear panel reaches the side tops and its grooves remain open at the top',()=>{
 for(const seat of ['inset','groove','rebate','rail-screws'] as const)for(const top of ['open','rails'] as const){
  let c=setConstructionMode(createCabinet(),'top',top);c.carcass.top.rearDepth=0;
  if(seat==='rail-screws')c=setConstructionMode(c,'back','rails-panel');
  c=setBackPanel(c,{mode:seat});const m=evaluate(c),back=m.panels.find(p=>p.role==='back')!;
  assert.equal(back.center[1]+back.size[1]/2,c.envelope.height);
  for(const pocket of m.pockets.filter(p=>p.id.includes('/back-seat/')&&p.axis===0))assert.equal(pocket.origin[1]+pocket.size[1],c.envelope.height);
  assert.ok(!m.pockets.some(p=>p.id.endsWith('/back-seat/top-rear-rail')));
 }
});

test('side Ixconnect shifts to a safe height automatically with a 10 mm gap, without deleting fixings or altering the shelf',()=>{
 const base=setBackPanel(setBackFastener(createCabinet(),true),{fastener:{id:'hafele-26009765',revision:'rpc-1',perSide:1}}),c=addDivision(base,base.compartments.id,'horizontal',333).cabinet,m=evaluate(c),nominal=resolveBackFasteners(c);
 const ids=new Set(m.backFasteners.map(b=>b.id));assert.equal(ids.size,2);assert.ok(m.backFasteners.every(b=>b.axis===0&&b.diameter===15&&b.depth===12.5));
 assert.ok(m.backFasteners.some(b=>b.point[1]!==nominal.find(n=>n.id===b.id)!.point[1]));
 assert.ok(!m.issues.some(i=>i.operationIds?.some(id=>ids.has(id))));
 for(const bore of m.backFasteners){const old=nominal.find(n=>n.id===bore.id)!,direction=Math.sign(bore.point[1]-old.point[1]);if(direction){const closer={...bore,point:[bore.point[0],bore.point[1]-direction,bore.point[2]] as typeof bore.point,diameter:bore.diameter+20};assert.ok(machiningReview(m.panels,m.cabineo,[...m.drilling,closer],m.pockets).some(i=>i.operationIds?.includes(bore.id)));}}
 assert.deepEqual(deserializeWithInfo(serialize(c)).cabinet,c);
});

test('inside screw rows move clear of rear Cabineos without changing the matched screw pairs',()=>{
 const c=setBackPanel(setCabineo(setConstructionMode(createCabinet(),'back','rails-panel'),'cabineo-8'),{mode:'rail-screws'}),m=evaluate(c);
 assert.ok(!m.issues.some(i=>i.code==='machining-hole-collision'||i.code==='machining-collision'));
 for(const hole of m.drilling.filter(b=>b.id.includes('/back-pilot/'))){const receiver=m.drilling.find(b=>b.group===hole.group&&b.id!==hole.id)!;assert.equal(hole.point[0],receiver.point[0]);assert.equal(hole.point[1],receiver.point[1]);}
});

test('top-rail Cabineos may open into their matching divider notch but unrelated cuts still report conflicts',()=>{
 const c=setCabineo(setConstructionMode(createCabinet(),'top','rails'),'cabineo-8'),split=addDivision(c,c.compartments.id,'vertical',282),m=evaluate(split.cabinet);
 assert.ok(!m.issues.some(i=>i.code==='machining-collision'));
 const joint=m.cabineo.find(j=>j.hostId===split.featureId&&j.receiverId.endsWith('/top-front-rail'))!,housing=joint.bores.find(b=>b.kind==='housing')!;
 const unrelated={id:`${split.featureId}/rail-notch/unrelated-rail`,panelId:split.featureId,kind:'rail-notch' as const,axis:0 as const,face:1 as const,origin:housing.point.map((n,i)=>n-(i===0?11:5)) as typeof housing.point,size:[11,10,10] as typeof housing.point};
 assert.ok(machiningReview(m.panels,m.cabineo,m.drilling,[...m.pockets,unrelated]).some(i=>i.operationIds?.includes(housing.id)));
 const store=new CabinetStore(split.cabinet);assert.ok(store.commit(setCnc(split.cabinet,{cabineoPerSide:2})));assert.ok(store.commit(setCabineo(store.getSnapshot().committed,'')));assert.equal(evaluate(store.getSnapshot().committed).cabineo.length,0);
});
