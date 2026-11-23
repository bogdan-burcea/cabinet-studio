import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {setBackPanel} from '../src/commands/back-panel.ts';
import {backPilotLimits,backPilotCounts} from '../src/rules/applied-back.ts';
import {addAdjustable,moveAdjustable,setShelfHoles,removeAdjustable} from '../src/commands/adjustable.ts';
import {addDivision,removeDivisionTree,setInteriorFinger} from '../src/commands/interiors.ts';
import {setPuzzleCorners,setStockThickness} from '../src/commands/stock.ts';
import {setCnc} from '../src/commands/cnc.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
import {panelDisplayGeometry} from '../src/viewport/part-mesh.ts';
import {partPreview} from '../src/geometry/part-preview.ts';
import {editRepairs} from '../src/commands/edit-repairs.ts';
import {shelfHoleMaximum} from '../src/rules/shelf-drilling.ts';
import type {BufferGeometry} from 'three';
const close=(a:number,b:number,epsilon=1e-6)=>assert.ok(Math.abs(a-b)<epsilon,`${a} versus ${b}`);
function volume(g:BufferGeometry){const a=g.getAttribute('position'),ix=g.index;let n=0;for(let i=0;i<(ix?.count??a.count);i+=3){const v=[0,1,2].map(j=>{const k=ix?ix.getX(i+j):i+j;return [a.getX(k),a.getY(k),a.getZ(k)];});n+=(v[0][0]*(v[1][1]*v[2][2]-v[1][2]*v[2][1])-v[0][1]*(v[1][0]*v[2][2]-v[1][2]*v[2][0])+v[0][2]*(v[1][0]*v[2][1]-v[1][1]*v[2][0]))/6;}g.dispose();return n;}
test('back fingers partition corner/edge stock without overlap at zero allowance and retain the original envelope',()=>{
 for(const thickness of [3,6,18])for(const corners of [false,true]){
  const base=setCnc(setPuzzleCorners(setBackPanel(createCabinet(),{thickness}),corners),{tolerance:0,dogbones:false}),c=setCnc(setBackPanel(base,{mode:'finger',fingerPitch:40}),{dogbones:false}),e=evaluate(c);
  assert.deepEqual(e.panels.map(p=>p.id),evaluate(base).panels.map(p=>p.id));assert.deepEqual(e.panels.find(p=>p.role==='back')!.size,[600,720,thickness]);assert.equal(e.opening.origin[2],thickness);
  const expected=evaluate(base).panels.reduce((n,p)=>n+volume(panelDisplayGeometry(p,evaluate(base).pockets)),0),actual=e.panels.reduce((n,p)=>n+volume(panelDisplayGeometry(p,e.pockets)),0);close(actual,expected,20);
  for(const role of ['left','right','top','bottom','back'])assert.ok(e.pockets.some(p=>p.panelId.endsWith('/'+role)&&p.id.includes('/back-finger/')));
 }
});
test('back fingers share fit allowance, cutter relief and clipped part previews with existing interiors',()=>{
 const base=createCabinet(),s=addDivision(base,base.compartments.id,'horizontal',342),c=setCnc(setBackPanel(setInteriorFinger(setCabineo(s.cabinet,'cabineo-8'),s.featureId,true),{mode:'finger',thickness:6}),{dogbones:true,bitDiameter:4}),e=evaluate(c);
 assert.equal(e.divisions[0].id,s.featureId);assert.ok(e.pockets.some(p=>p.id.includes('/back-finger/')&&p.reliefs?.length));for(const panel of e.panels){assert.ok(partPreview(panel,e.drilling,e.pockets,-1).profile.length);const g=panelDisplayGeometry(panel,e.pockets,e.drilling);assert.ok(g.getAttribute('position').count);g.dispose();}
 assert.deepEqual(readSimpleCabinet(serialize(c)),c);
});
test('applied-back pilots centre on each receiving carcass edge, respect translation and drill through the back only',()=>{
 const base=createCabinet(),c=setBackPanel({...base,envelope:{...base.envelope,origin:[100,200,300]}},{mode:'applied',thickness:9,pilots:{revision:'back-pilot-1',spacing:250,diameter:4}}),e=evaluate(c);assert.equal(e.drilling.length,8);
 for(const b of e.drilling){assert.equal(b.axis,2);assert.equal(b.depth,9);assert.equal(b.point[2],300);assert.equal(b.through,true);assert.ok(b.panelId.endsWith('/back'));if(b.id.includes('/left/'))assert.equal(b.point[0],109);if(b.id.includes('/right/'))assert.equal(b.point[0],691);if(b.id.includes('/top/'))assert.equal(b.point[1],911);if(b.id.includes('/bottom/'))assert.equal(b.point[1],209);}
 const back=e.panels.find(p=>p.role==='back')!;assert.ok(partPreview(back,e.drilling,[],1).bores.find(b=>b.kind==='pilot')!.path);const removed=600*720*9-volume(panelDisplayGeometry(back,[],e.drilling));close(removed,8*Math.PI*2**2*9,10);
});
test('pilot diameter and count limits derive from stock and remain reversible with a repair choice',()=>{
 const c=setBackPanel(createCabinet(),{mode:'applied'});assert.equal(backPilotLimits(c).maxDiameter,6);assert.equal(evaluate(c).drilling.length,10);
 const store=new CabinetStore(c),thin=setStockThickness(c,6);assert.equal(backPilotLimits(thin).maxDiameter,2);assert.equal(store.commit(thin),false);const fixes=editRepairs(thin,c),fix=fixes.find(f=>f.label.startsWith('Fit pilot'))!;assert.ok(fix);assert.equal(fix.cabinet.carcass.back.joint!.pilots!.diameter,2);assert.ok(store.commit(fix.cabinet));store.undo();assert.deepEqual(store.getSnapshot().committed,c);
 assert.doesNotThrow(()=>evaluate(setBackPanel(c,{pilots:{revision:'back-pilot-1',spacing:100,diameter:6}})));assert.throws(()=>evaluate(setBackPanel(c,{pilots:{revision:'back-pilot-1',spacing:0,diameter:6}})));
});
test('adjustable shelves drill editable two-row patterns into actual side panels and dividers',()=>{
 const base=createCabinet(),d=addDivision(base,base.compartments.id,'vertical',282),opening=evaluate(d.cabinet).openings[0],added=addAdjustable(setCabineo(d.cabinet,'cabineo-8'),opening.id,{holes:5,frontSetback:0}),e=evaluate(added.cabinet);
 assert.equal(e.drilling.length,20);assert.ok(e.cabineo.every(j=>j.hostId!==added.featureId));assert.ok(!e.issues.some(i=>i.code==='machining-faces'&&i.featureId===d.featureId));assert.equal(e.adjustable.shelves.length,1);assert.equal(e.divisions.length,1);assert.ok(e.drilling.some(b=>b.panelId===d.featureId));assert.ok(e.drilling.every(b=>b.kind==='shelf-support'&&b.diameter===5&&b.depth===8));
 for(const panelId of new Set(e.drilling.map(b=>b.panelId))){const holes=e.drilling.filter(b=>b.panelId===panelId);assert.equal(new Set(holes.map(b=>b.point[2])).size,2);assert.equal(new Set(holes.map(b=>b.point[1])).size,5);const ys=[...new Set(holes.map(b=>b.point[1]))].sort((a,b)=>a-b);close(ys[1]-ys[0],32);}
 const c=setShelfHoles(added.cabinet,[added.featureId],7);assert.equal(evaluate(c).drilling.length,28);assert.deepEqual(readSimpleCabinet(serialize(c)),c);assert.equal(evaluate(removeAdjustable(c,added.featureId)).drilling.length,0);
});
test('adjustable drilling counts fit the opening, include the active level, deduplicate and survive undo/movement',()=>{
 const base=createCabinet(),first=addAdjustable(base,base.compartments.id,{holes:5}),opening=evaluate(first.cabinet).openings[0],max=shelfHoleMaximum(first.cabinet,opening),store=new CabinetStore(first.cabinet),moved=moveAdjustable(first.cabinet,first.featureId,73);
 assert.ok(store.commit(moved));assert.equal(evaluate(moved).adjustable.shelves[0].level,first.cabinet.contents[0].drilling!.firstLevel);assert.deepEqual(evaluate(moved).drilling,evaluate(first.cabinet).drilling);assert.equal(evaluate(moved).drilling.length,20);store.undo();assert.deepEqual(store.getSnapshot().committed,first.cabinet);
 assert.throws(()=>evaluate(setShelfHoles(first.cabinet,[first.featureId],max+1)));const second=addAdjustable(first.cabinet,base.compartments.id,{holes:max}),all=setShelfHoles(second.cabinet,[first.featureId,second.featureId],max),e=evaluate(all);assert.equal(e.drilling.length,4*max);
 const shrink={...first.cabinet,envelope:{...base.envelope,height:250}},fix=editRepairs(shrink,first.cabinet).find(f=>f.label.startsWith('Fit adjustable'));assert.ok(fix);assert.doesNotThrow(()=>evaluate(fix.cabinet));
});
test('removing nested fixed interiors also removes adjustable contents and their drilling in one undo step',()=>{
 const base=createCabinet(),parent=addDivision(base,base.compartments.id,'horizontal',342),shelf=addAdjustable(parent.cabinet,evaluate(parent.cabinet).openings[0].id,{holes:3}),store=new CabinetStore(shelf.cabinet),removed=removeDivisionTree(shelf.cabinet,parent.featureId);assert.equal(removed.contents.length,0);assert.equal(evaluate(removed).drilling.length,0);assert.ok(store.commit(removed));store.undo();assert.deepEqual(store.getSnapshot().committed,shelf.cabinet);
});
test('native drilling intent is strict, versioned and older files remain unchanged',()=>{
 const base=createCabinet(),added=addAdjustable(setBackPanel(base,{mode:'applied'}),base.compartments.id,{holes:5}),doc=JSON.parse(serialize(added.cabinet));assert.equal(doc.schemaVersion,61);assert.deepEqual(readSimpleCabinet(JSON.stringify(doc)),added.cabinet);
 for(const mutate of [(d:any)=>d.cabinet.contents[0].drilling.count=0,(d:any)=>d.cabinet.contents[0].drilling.extra=true,(d:any)=>d.cabinet.carcass.back.joint.pilots.diameter=99,(d:any)=>d.cabinet.carcass.back.joint.pilots.extra=true,(d:any)=>{d.schemaVersion=18;d.evaluatorRevision='fit-18';}]){const bad=structuredClone(doc);mutate(bad);assert.throws(()=>readSimpleCabinet(JSON.stringify(bad)));}
 const old=JSON.parse(serialize(base));old.schemaVersion=18;old.evaluatorRevision='fit-18';assert.deepEqual(deserializeWithInfo(JSON.stringify(old)),{cabinet:base,migrated:true});
});
