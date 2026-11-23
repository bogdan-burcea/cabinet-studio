import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {addSimpleDoors} from '../src/commands/simple-doors';
import {defaultHinge,selectableHinges,hafeleMetalla110} from '../src/catalogue/hinges';
import {fitMetallaHinges} from '../src/commands/metalla-hinges';
import {evaluate} from '../src/geometry/evaluate';
import {serialize,deserialize,deserializeWithInfo,AUTOSAVE_KEY,PREVIOUS_AUTOSAVE_KEYS} from '../src/persistence/files';
import {CabinetStore} from '../src/commands/store';
import {safeDoorAngles,drawerOpeningIssue,openingGeometryKey} from '../src/rules/door-motion';
import {readFileSync} from 'node:fs';
function custom(){const c=addSimpleDoors(createCabinet(),'pair').cabinet;return {...c,fronts:c.fronts.map(d=>({...d,hinge:defaultHinge('custom-hinge')}))};}
test('EXPANDO is retired from selections while common Metalla 110/155 applications are fitted and saved',()=>{
 assert.ok(selectableHinges.every(h=>h.id!=='blum-thin-110'));assert.ok(selectableHinges.every(h=>h.softClose));
 const b=addSimpleDoors(createCabinet(),'pair').cabinet;
 for(const placement of ['inset','overlay'] as const){const c=fitMetallaHinges({...b,fronts:b.fronts.map(d=>({...d,placement}))},b.fronts.map(d=>d.id),hafeleMetalla110.id),e=evaluate(c);
 assert.deepEqual(deserialize(serialize(c)),c);assert.ok(e.doorHardware.hinges.every(h=>h.article===(placement==='inset'?'311.04.254':'311.04.248')&&h.maxAngle===110&&h.plate==='311.70.610'));assert.equal(safeDoorAngles(e,{},c.fronts.map(d=>d.id),110).blocked,false);}
});
test('custom hinge mounting drives actual cup, screw holes, plate location and collision envelopes reversibly',()=>{
 const base=custom(),c={...base,fronts:base.fronts.map(d=>({...d,hinge:{...d.hinge!,custom:{...d.hinge!.custom!,article:'Test 95',plate:'Plate 4',cupDiameter:26,cupDepth:9,screwPitch:38,screwOffset:7,plateLine:45,platePitch:40,doorPilotDiameter:3,doorPilotDepth:8,platePilotDiameter:4,platePilotDepth:10,maxAngle:95,mountingReach:15,mountingHeight:60,mountingDepth:70}}}))},e=evaluate(c);
 for(const h of e.doorHardware.hinges){assert.equal(h.article,'Test 95');assert.equal(h.plate,'Plate 4');assert.equal(h.maxAngle,95);assert.deepEqual(h.mountingZone.size,[15,60,70]);
 const holes=e.drilling.filter(b=>b.id.startsWith(h.id)),cup=holes.find(b=>b.kind==='hinge-cup')!;assert.deepEqual([cup.diameter,cup.depth],[26,9]);
 const screws=holes.filter(b=>b.id.includes('/cup-screw/'));assert.equal(Math.abs(screws[0].point[1]-screws[1].point[1]),38);assert.ok(screws.every(b=>b.diameter===3&&b.depth===8));
 const plate=holes.filter(b=>b.id.includes('/plate-screw/'));assert.ok(plate.every(b=>b.diameter===4&&b.depth===10&&b.point[2]===515));assert.equal(Math.abs(plate[0].point[1]-plate[1].point[1]),40);
 }
 assert.deepEqual(deserialize(serialize(c)),c);const store=new CabinetStore(base);assert.ok(store.commit(c));store.undo();assert.deepEqual(store.getSnapshot().committed,base);store.redo();assert.deepEqual(store.getSnapshot().committed,c);
 for(const patch of [{cupDepth:19},{platePilotDepth:18},{maxAngle:NaN},{cupDiameter:0}])assert.throws(()=>evaluate({...c,fronts:c.fronts.map(d=>({...d,hinge:{...d.hinge!,custom:{...d.hinge!.custom!,...patch}}}))}));
 const doc=JSON.parse(serialize(c));doc.schemaVersion=58;doc.evaluatorRevision='merivobox-58';assert.throws(()=>deserialize(JSON.stringify(doc)),/version 59/);assert.ok(AUTOSAVE_KEY.endsWith('v61'));assert.ok(PREVIOUS_AUTOSAVE_KEYS.includes('cabinet-studio.autosave.v58'));assert.ok(deserializeWithInfo(readFileSync(new URL('./fixtures/pantry-inset-inner-drawers.json',import.meta.url),'utf8')).migrated);
});
test('cached opening checks never mask edited bodies, mounting zones or opening limits',()=>{
 const original=deserialize(readFileSync(new URL('./fixtures/pantry-inset-inner-drawers.json',import.meta.url),'utf8')),c=fitMetallaHinges(original,original.fronts.map(d=>d.id)),e=evaluate(c);
 assert.equal(drawerOpeningIssue(e),null);assert.equal(drawerOpeningIssue(evaluate(c)),null);
 const altered={...e,doorHardware:{...e.doorHardware,hinges:e.doorHardware.hinges.map(h=>({...h,maxAngle:90}))}};assert.notEqual(openingGeometryKey(altered),openingGeometryKey(e));
 const customClear={...c,fronts:c.fronts.map(d=>({...d,hinge:{...defaultHinge('custom-hinge'),count:d.hinge!.count,endOffset:d.hinge!.endOffset,...d.hinge!.offsets?{offsets:d.hinge!.offsets}:{},custom:{...defaultHinge('custom-hinge').custom!,maxAngle:155,plateLine:56.5,openProtrusion:2}}}))};
 assert.equal(drawerOpeningIssue(evaluate(customClear)),null);assert.ok(drawerOpeningIssue(evaluate({...customClear,fronts:customClear.fronts.map(d=>({...d,hinge:{...d.hinge,custom:{...d.hinge.custom,openProtrusion:20}}}))})));
 assert.deepEqual(deserialize(serialize(customClear)),customClear);
 const part={...e.panels[0],id:'new obstruction',size:[1000,3000,1000] as [number,number,number],center:[300,1000,900] as [number,number,number]};assert.ok(drawerOpeningIssue({...e,panels:[...e.panels,part]}));assert.equal(drawerOpeningIssue(e),null);
 const closed={...e,doorHardware:{...e.doorHardware,hinges:e.doorHardware.hinges.map(h=>({...h,maxAngle:0}))}};assert.ok(drawerOpeningIssue(closed));
});
