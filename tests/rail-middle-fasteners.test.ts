import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {defaultFrontRails,setConstructionMode} from '../src/commands/construction';
import {setCabineo} from '../src/commands/cabineo';
import {setCnc} from '../src/commands/cnc';
import {evaluate} from '../src/geometry/evaluate';
import {resolveCabineo} from '../src/rules/cabineo';
import {serialize,deserializeWithInfo} from '../src/persistence/files';
import {flattenParts} from '../src/cnc/parts';
function fixture(){let c=setConstructionMode(setConstructionMode(createCabinet(),'top','rails'),'back','rails');c.carcass.frontRails=defaultFrontRails();c.carcass.frontRails.top.enabled=true;c.carcass.frontRails.bottom.enabled=true;return setCabineo(c,'cabineo-8');}

test('rear and front reinforcement rails gain one centred Cabineo at each real horizontal butt joint',()=>{
 const c=fixture();c.envelope.origin=[120,250,300];
 const joints=resolveCabineo(c),middle=joints.filter(j=>j.id.includes('/middle/'));
 assert.equal(middle.length,4);
 assert.deepEqual(middle.map(j=>[j.hostId.split('/').at(-1),j.receiverId.split('/').at(-1)]),[
  ['back-upper-rail','top-rear-rail'],['back-lower-rail','bottom'],['front-upper-rail','top-front-rail'],['front-lower-rail','bottom']
 ]);
 for(const joint of middle){assert.equal(joint.bores.length,4);assert.ok(joint.bores.every(b=>b.point[0]===420));
  assert.ok(joint.bores.filter(b=>b.kind==='housing').every(b=>b.axis===2&&b.depth===11&&!b.through));assert.equal(joint.bores.find(b=>b.kind==='receiver')!.axis,1);
  assert.ok(joints.some(j=>j.hostId===joint.hostId&&!j.id.includes('/middle/')),'side connections remain');
 }
 const m=evaluate(c);assert.deepEqual(m.issues,[]);const parts=flattenParts(m);for(const joint of middle)assert.ok(parts.find(p=>p.id===joint.hostId)!.holes.some(h=>h.group===joint.id));
});

test('middle rail connectors follow selected hardware, actual neighbours and native persistence',()=>{
 const c=fixture(),open=evaluate(setConstructionMode(c,'top','open'));
 assert.equal(open.cabineo.filter(j=>j.id.includes('/middle/')).length,2);
 assert.ok(open.cabineo.filter(j=>j.id.includes('/middle/')).every(j=>j.receiverId.endsWith('/bottom')));
 assert.equal(evaluate(setCabineo(c,'')).cabineo.length,0);
 assert.equal(evaluate(setCnc(c,{cabineoPerSide:1})).cabineo.filter(j=>j.id.includes('/middle/')).length,4);
 const full=evaluate(setConstructionMode(c,'top','full'));assert.equal(full.cabineo.filter(j=>j.id.includes('/middle/')&&j.receiverId.endsWith('/top')).length,2);
 const encoded=serialize(c),loaded=deserializeWithInfo(encoded);assert.deepEqual(evaluate(loaded.cabinet),evaluate(c));assert.equal(loaded.migrated,false);
 const old=JSON.parse(encoded);old.schemaVersion=42;old.evaluatorRevision='open-construction-42';assert.equal(deserializeWithInfo(JSON.stringify(old)).migrated,true);
});


test('120 mm rails spread pairs symmetrically without increasing automatic counts on narrower rails',()=>{
 let c=setConstructionMode(createCabinet(),'top','rails');
 c.carcass.top.frontDepth=120;c.carcass.top.rearDepth=120;
 c=setCabineo(c,'cabineo-8');
 c.envelope.origin=[110,200,300];
 const check=(cabinet:typeof c)=>{
  const m=evaluate(cabinet);assert.deepEqual(m.issues,[]);
  for(const role of ['top-front-rail','top-rear-rail']){
   const panel=m.panels.find(p=>p.role===role)!;
   const pair=m.cabineo.filter(j=>j.hostId===panel.id&&j.id.includes('/cabineo/-1/'));
   assert.equal(pair.length,2);
   const centers=pair.map(j=>j.bores[0].point[2]).sort((a,b)=>a-b);
   assert.equal(centers[1]-centers[0],60);
   assert.equal((centers[0]+centers[1])/2,panel.center[2]);
  }
  return m;
 };
 const m=check(c);check(setCnc(c,{cabineoPerSide:2}));
 c.carcass.top.frontDepth=80;
 assert.equal(evaluate(c).cabineo.filter(j=>j.hostId.endsWith('/top-front-rail')).length,2,'one per side on an 80 mm rail');
 const bottom=m.cabineo.filter(j=>j.hostId.endsWith('/bottom')&&j.id.includes('/cabineo/-1/'));
 assert.equal(bottom[0].bores[0].point[2],350,'full panel keeps 50 mm setback');
 const doc=JSON.parse(serialize(c));doc.schemaVersion=43;doc.evaluatorRevision='rail-connectors-43';
 const loaded=deserializeWithInfo(JSON.stringify(doc));assert.equal(loaded.migrated,true);assert.deepEqual(evaluate(loaded.cabinet),evaluate(c));
});
