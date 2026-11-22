import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {setConstructionMode,defaultFrontRails} from '../src/commands/construction';
import {setCabineo} from '../src/commands/cabineo';
import {setCnc,setPartCabineoCount,resetGlobalCabineoCount} from '../src/commands/cnc';
import {CabinetStore} from '../src/commands/store';
import {addDivision} from '../src/commands/interiors';
import {evaluate} from '../src/geometry/evaluate';
import {serialize,deserializeWithInfo} from '../src/persistence/files';
function fixture(width=100){let c=setConstructionMode(setConstructionMode(createCabinet(),'top','rails'),'back','rails');c.carcass.top.rearDepth=width;return setCnc(setCabineo(c,'cabineo-8'),{cabineoPerSide:2});}
function ends(c:ReturnType<typeof createCabinet>,role='top-rear-rail'){return evaluate(c).cabineo.filter(j=>j.hostId.endsWith('/'+role)&&j.id.includes('/cabineo/-1/'));}
test('two-axis rail support uses a centred connector through 100 mm, with pairs on wider rails',()=>{
 for(const width of [80,100,101,120]){const c=fixture(width),joints=ends(c);assert.equal(joints.length,width<=100?1:2);if(width<=100)assert.equal(joints[0].bores[0].point[2],evaluate(c).panels.find(p=>p.role==='top-rear-rail')!.center[2]);}
 const c=fixture();assert.equal(ends(setConstructionMode(c,'back','open')).length,1,'narrow contacts stay capped even without long-edge support');
});
test('part overrides take priority, reset independently, persist and undo/redo with stable joint IDs',()=>{
 const c=fixture(120),id=`${c.id}/panel/top-rear-rail`,overridden=setPartCabineoCount(c,id,1),store=new CabinetStore(c);
 assert.equal(ends(overridden).length,1);assert.equal(ends(overridden,'top-front-rail').length,ends(c,'top-front-rail').length);
 assert.equal(ends(setCnc(overridden,{cabineoPerSide:3})).length,1);
 assert.deepEqual(evaluate(deserializeWithInfo(serialize(overridden)).cabinet),evaluate(overridden));
 assert.ok(store.commit(overridden));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,overridden);
 const reset=setPartCabineoCount(overridden,id,undefined);assert.equal(ends(reset).length,2);assert.deepEqual(ends(reset),ends(c));
 const other=`${c.id}/panel/bottom`,both=setPartCabineoCount(overridden,other,1);assert.equal(setPartCabineoCount(both,id,undefined).carcass.machining!.partCabineoCounts![other],1);
});
test('invalid or physically crowded overrides reject without changing committed settings',()=>{
 const c=fixture(),id=`${c.id}/panel/top-rear-rail`,store=new CabinetStore(c);
 for(const value of [0,1.5,21,NaN])assert.throws(()=>evaluate(setPartCabineoCount(c,id,value)),/1–20 Cabineos/);
 assert.equal(store.commit(setPartCabineoCount(c,id,20)),false);assert.deepEqual(store.getSnapshot().committed,c);
 assert.throws(()=>deserializeWithInfo(serialize(c).replace('"cabineoPerSide": 2','"cabineoPerSide": 2, "partCabineoCounts": []')),/1–20 Cabineos/);
});

test('divider overrides distribute one and two across separate top contacts instead of multiplying the target',()=>{
 for(const front of [false,true])for(const count of [1,2]){
  let base=fixture(80);if(front){base.carcass.frontRails=defaultFrontRails();base.carcass.frontRails.top.enabled=true;}
  const split=addDivision(base,base.compartments.id,'vertical',282),c=setPartCabineoCount(split.cabinet,split.featureId,count),m=evaluate(c),joints=m.cabineo.filter(j=>j.hostId===split.featureId);
  assert.equal(joints.filter(j=>j.receiverId.endsWith('/bottom')).length,count);
  for(const role of ['top-front-rail','top-rear-rail'])assert.equal(joints.filter(j=>j.receiverId.endsWith('/'+role)).length,front?0:1);
  for(const role of ['back-upper-rail','back-lower-rail',...(front?['front-upper-rail']:[])])assert.equal(joints.filter(j=>j.receiverId.endsWith('/'+role)).length,1);
  assert.ok(!m.issues.some(i=>['machining-collision','machining-hole-collision'].includes(i.code)));
  assert.deepEqual(evaluate(deserializeWithInfo(serialize(c)).cabinet).cabineo,m.cabineo);
 }
});
test('global reset restores automatic placement and clears all part overrides through Undo',()=>{
 const c=fixture(),id=`${c.id}/panel/bottom`,before=setPartCabineoCount(c,id,1),reset=resetGlobalCabineoCount(before),store=new CabinetStore(before);
 assert.equal(reset.carcass.machining!.cabineoPerSide,0);assert.equal(reset.carcass.machining!.partCabineoCounts,undefined);
 assert.deepEqual(ends(reset),ends(setCnc(before,{cabineoPerSide:0})));
 assert.ok(store.commit(reset));store.undo();assert.deepEqual(store.getSnapshot().committed,before);store.redo();assert.deepEqual(store.getSnapshot().committed,reset);
});

test('80 mm rail contacts cap global targets and reject crowded part counts without altering committed geometry',()=>{
 const c=fixture(80),id=`${c.id}/panel/top-rear-rail`,store=new CabinetStore(c);
 for(const count of [1,2,3,20])assert.equal(ends(setCnc(c,{cabineoPerSide:count})).length,1);
 assert.equal(store.commit(setPartCabineoCount(c,id,2)),false);assert.deepEqual(store.getSnapshot().committed,c);
 const split=addDivision(c,c.compartments.id,'vertical',282);assert.throws(()=>evaluate(setPartCabineoCount(split.cabinet,split.featureId,3)),/too short/);
});
