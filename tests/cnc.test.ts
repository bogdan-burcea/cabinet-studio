import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {stock} from '../src/catalogue/materials.ts';
import {cnc} from '../src/rules/cnc.ts';
import {setCnc} from '../src/commands/cnc.ts';
import {setStockThickness,setPuzzleCorners} from '../src/commands/stock.ts';
import {setBackFastener} from '../src/commands/back-panel.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {addDivision,setInteriorFinger,centreDivision} from '../src/commands/interiors.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
import {partPreview} from '../src/geometry/part-preview.ts';
import {panelDisplayGeometry} from '../src/viewport/part-mesh.ts';

test('user stock accepts 3–24 mm including decimal thickness, survives save/load, and rejects out-of-range input',()=>{
 for(const thickness of [3,3.5,5.2,12.1,24]){const c=setStockThickness(createCabinet(),thickness);assert.equal(stock(c,'carcass').thickness,thickness);assert.equal(evaluate(c).panels.find(p=>p.role==='left')!.size[0],thickness);assert.deepEqual(readSimpleCabinet(serialize(c)),c);}
 for(const invalid of [2.9,24.1,3.05,NaN])assert.throws(()=>setStockThickness(createCabinet(),invalid));
});
test('0.2 mm default fit allowance offsets mating cuts independently of tooling',()=>{
 const c=setPuzzleCorners(createCabinet(),true),zero=evaluate(setCnc(c,{tolerance:0})),standard=evaluate(c);assert.equal(cnc(c).tolerance,.2);const a=zero.pockets.find(p=>p.kind==='puzzle'&&p.id.endsWith('/4'))!,b=standard.pockets.find(p=>p.id===a.id)!;assert.ok(Math.abs(b.size[2]-a.size[2]-.2)<1e-9);assert.ok(Math.abs(b.size[1]-a.size[1]-.2)<1e-9);assert.doesNotThrow(()=>evaluate(setCnc(c,{tolerance:.5})));
});
test('dogbone reliefs match cutter radius and are shared by real 3D cuts and clipped flat previews',()=>{
 const c=setCnc(setPuzzleCorners(createCabinet(),true),{dogbones:true,bitDiameter:4}),e=evaluate(c),cut=e.pockets.find(p=>p.reliefs?.length)!,relief=cut.reliefs![0];assert.equal(relief.radius,2);const panel=e.panels.find(p=>p.id===cut.panelId)!,preview=partPreview(panel,[],e.pockets,cut.face),plain=partPreview(panel,[],e.pockets.map(p=>({...p,reliefs:[]})),cut.face);assert.notEqual(preview.outline,plain.outline);assert.ok(preview.profile.length);const mesh=panelDisplayGeometry(panel,e.pockets);assert.ok(mesh.getAttribute('position').count>0);mesh.dispose();
});
test('reverse receiving bores become through from the common face, while matched housings stay blind',()=>{
 const c=createCabinet(),d=addDivision(c,c.compartments.id,'vertical',282),o=evaluate(d.cabinet).openings,a=addDivision(d.cabinet,o[0].id,'horizontal',342),b=addDivision(a.cabinet,o[1].id,'horizontal',342),cab=setCabineo(b.cabinet,'cabineo-8'),planned=evaluate(cab),bores=planned.cabineo.flatMap(j=>j.bores);
 assert.ok(bores.some(b=>b.through&&b.panelId===d.featureId&&b.depth===18));assert.ok(bores.filter(b=>b.kind==='housing').every(b=>b.depth===11&&!b.through));assert.ok(!planned.issues.some(i=>i.code==='machining-faces'));assert.ok(evaluate(setCnc(cab,{throughOpposed:false})).issues.some(i=>i.code==='machining-faces'));
});
test('per-side Cabineo quantities regenerate matched groups and reject unsupported spacing transactionally',()=>{
 const c=setCabineo(createCabinet(),'cabineo-8'),next=setCnc(c,{cabineoPerSide:4}),store=new CabinetStore(next);assert.equal(evaluate(next).cabineo.length,16);assert.equal(store.commit(setCnc(c,{cabineoPerSide:2})),true);store.undo();assert.equal(store.commit(setCnc(c,{cabineoPerSide:21})),false);assert.deepEqual(store.getSnapshot().committed,next);assert.equal(evaluate(setCnc(c,{cabineoPerSide:1})).cabineo.length,4);
});
test('fixed shelves and dividers get mating finger slots, preserve IDs, and round trip with tooling settings',()=>{
 for(const axis of ['horizontal','vertical'] as const){const c=createCabinet(),d=addDivision(c,c.compartments.id,axis,axis==='horizontal'?342:282),before=evaluate(d.cabinet),next=setCnc(setInteriorFinger(setCabineo(d.cabinet,'cabineo-8'),d.featureId,true,40),{dogbones:true,bitDiameter:3}),e=evaluate(next),panel=e.panels.find(p=>p.id===d.featureId)!,original=before.panels.find(p=>p.id===d.featureId)!;assert.equal(panel.size[axis==='horizontal'?0:1]-original.size[axis==='horizontal'?0:1],36);assert.ok(e.pockets.some(p=>p.panelId===d.featureId));assert.ok(e.pockets.some(p=>p.panelId!==d.featureId));assert.ok(!e.cabineo.some(j=>j.hostId===d.featureId));assert.deepEqual(readSimpleCabinet(serialize(next)),next);assert.deepEqual(e.panels.map(p=>p.id),before.panels.map(p=>p.id));const store=new CabinetStore(d.cabinet);assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,d.cabinet);}
});
test('schema 16 loads without losing intent; malformed CNC and finger settings are rejected',()=>{
 const c=createCabinet(),old=JSON.parse(serialize(c));old.schemaVersion=16;old.evaluatorRevision='machining-16';assert.deepEqual(deserializeWithInfo(JSON.stringify(old)),{cabinet:c,migrated:true});const current=JSON.parse(serialize(setCnc(c,{dogbones:true})));for(const key of ['bitDiameter','cabineoPerSide']){const bad=structuredClone(current);bad.cabinet.carcass.machining[key]=-1;assert.throws(()=>readSimpleCabinet(JSON.stringify(bad)));}const bad=structuredClone(current);bad.cabinet.carcass.machining.extra=true;assert.throws(()=>readSimpleCabinet(JSON.stringify(bad)));
});

test('mixed dogbones, captured-back seats, fasteners and interior fingers remain renderable at fractional finger pitches',()=>{
 for(const thickness of [18,19,24]){
  let c=setStockThickness(createCabinet(),thickness),shelf=addDivision(c,c.compartments.id,'horizontal',342);c=centreDivision(shelf.cabinet,shelf.featureId);const divider=addDivision(c,evaluate(c).openings[0].id,'vertical',209);c=setCnc(setPuzzleCorners(setCabineo(setBackFastener(divider.cabinet,true),'cabineo-12'),true),{dogbones:true,bitDiameter:4});
  for(const fingers of [false,true]){let layout=c;if(fingers){layout=setInteriorFinger(layout,shelf.featureId,true,40);layout=setInteriorFinger(layout,divider.featureId,true,40);}const e=evaluate(layout),bores=e.cabineo.flatMap(j=>j.bores).concat(e.backFasteners);for(const p of e.panels){const g=panelDisplayGeometry(p,e.pockets,bores);assert.ok(g.getAttribute('position').count>0);g.dispose();assert.ok(partPreview(p,bores,e.pockets,p.role==='right'||p.role==='top'?-1:1).profile.length);}}
 }
});
