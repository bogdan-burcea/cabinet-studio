import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {setConstructionMode,defaultFrontRails} from '../src/commands/construction';
import {setCabineo} from '../src/commands/cabineo';
import {setCnc} from '../src/commands/cnc';
import {addDivision} from '../src/commands/interiors';
import {evaluate} from '../src/geometry/evaluate';
import {editRepairs} from '../src/commands/edit-repairs';
import {CabinetStore} from '../src/commands/store';
import {serialize,deserializeWithInfo} from '../src/persistence/files';
import {holesOverlap} from '../src/rules/hole-collisions';
function fixture(width=80){let c=setConstructionMode(setConstructionMode(createCabinet(),'top','rails'),'back','rails');c.carcass.back.upperHeight=width;return c;}
function assertSafe(c:ReturnType<typeof createCabinet>){const m=evaluate(c),joints=m.cabineo.filter(j=>j.hostId===m.divisions[0].id);assert.ok(!m.issues.some(i=>i.code==='machining-collision'||i.code==='machining-hole-collision'));for(const a of joints.filter(j=>j.id.includes('/cabineo/rail/')))for(const b of joints.filter(j=>j!==a))for(const x of a.bores)for(const y of b.bores)if(x.panelId===y.panelId)assert.ok(!holesOverlap({...x,diameter:x.diameter+20},y),'rail joints need 10 mm edge clearance');return m;}

test('rails supported by middle or divider connectors use one Cabineo at each side end',()=>{
 const c=fixture(100);c.carcass.frontRails=defaultFrontRails();c.carcass.frontRails.top.enabled=true;
 for(const divided of [false,true]){let next=divided?addDivision(c,c.compartments.id,'vertical',282).cabinet:c;next=setCnc(setCabineo(next,'cabineo-8'),{cabineoPerSide:3});const m=evaluate(next);
  for(const role of ['back-upper-rail','back-lower-rail','front-upper-rail'])for(const side of [-1,1])assert.equal(m.cabineo.filter(j=>j.hostId.endsWith('/'+role)&&j.id.includes(`/cabineo/${side}/`)).length,1);
 }
});
test('two intersecting rails receive safely slid whole joints, independent of construction order',()=>{
 const base=createCabinet(),split=addDivision(base,base.compartments.id,'vertical',282),first=setCabineo(setConstructionMode(setConstructionMode(split.cabinet,'top','rails'),'back','rails'),'cabineo-8');
 const rails=fixture(),second=setCabineo({...rails,id:base.id,compartments:structuredClone(split.cabinet.compartments)},'cabineo-8');
 const a=assertSafe(first),b=assertSafe(second);assert.deepEqual(a.cabineo,b.cabineo);assert.deepEqual(evaluate(deserializeWithInfo(serialize(first)).cabinet).cabineo,a.cabineo);
 for(const j of a.cabineo.filter(j=>j.id.includes('/cabineo/rail/'))){const xs=j.bores.filter(b=>b.kind==='housing');assert.deepEqual(xs.map(b=>b.depth),[11,11,11]);assert.equal(Math.abs(xs[2].point[2]-xs[0].point[2]),22.4);}
});
test('narrow rail conflicts offer evaluated minimum widening with safe placement, preserving the edit and Undo',()=>{
 const previous=fixture(50),split=addDivision(previous,previous.compartments.id,'vertical',282),candidate=setCabineo(split.cabinet,'cabineo-8');
 assert.throws(()=>evaluate(candidate),/10 mm clearance/);const options=editRepairs(candidate,previous);assert.ok(options.length);assert.ok(options.every(o=>o.label.startsWith('Widen')));
 for(const option of options){assertSafe(option.cabinet);assert.deepEqual(option.cabinet.compartments,candidate.compartments);assert.deepEqual(option.cabinet.hardware,candidate.hardware);const store=new CabinetStore(previous);assert.ok(store.commit(option.cabinet));store.undo();assert.deepEqual(store.getSnapshot().committed,previous);store.redo();assert.deepEqual(store.getSnapshot().committed,option.cabinet);}
});
