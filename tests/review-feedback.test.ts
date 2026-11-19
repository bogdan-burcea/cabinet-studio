import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCabinet} from '../src/domain/cabinet.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {deserializeWithInfo,serialize} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
import {toolingRepairs} from '../src/commands/tooling-repairs.ts';
import {editRepairs} from '../src/commands/edit-repairs.ts';
import {narrowToolCuts} from '../src/rules/dogbones.ts';
import {addInteriors} from '../src/commands/simple-interiors.ts';
import {setBackPanel} from '../src/commands/back-panel.ts';
import {setPuzzleCorners} from '../src/commands/stock.ts';
import {setInteriorFinger} from '../src/commands/interiors.ts';
import {cnc} from '../src/rules/cnc.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {panelDisplayGeometry,panelDisplayEdges} from '../src/viewport/part-mesh.ts';
const source=fs.readFileSync(new URL('./fixtures/with-machining-error.cabinet.json',import.meta.url),'utf8');
const fixture=()=>deserializeWithInfo(source).cabinet;
test('real machining report identifies back grooves and offers validated tooling or back-stock fixes without changing fit',()=>{
 const c=fixture(),e=evaluate(c),notice=e.issues.find(i=>i.code==='machining-tool-width')!;assert.match(notice.message,/3.2 mm/);assert.match(notice.message,/Ø6 mm/);const repairs=toolingRepairs(c);assert.equal(repairs.length,2);assert.match(repairs[0].label,/Ø3 mm/);assert.match(repairs[1].label,/6 mm back/);for(const repair of repairs){const next=evaluate(repair.cabinet);assert.equal(narrowToolCuts(repair.cabinet,next.pockets).length,0);assert.equal(cnc(repair.cabinet).tolerance,.2);assert.deepEqual(repair.cabinet.fronts,c.fronts);}
});
test('bulk adjustable creation completes both candidates and exposes one inset-clearance correction in one reversible transaction',()=>{
 const c=fixture(),ids=evaluate(c).openings.map(o=>o.id),added=addInteriors(c,ids,'adjustable');assert.equal(added.featureIds.length,2);assert.throws(()=>evaluate(added.cabinet),/inset slab conflicts/);const repair=editRepairs(added.cabinet,c).find(o=>o.label.includes('Set back interiors'))!;assert.ok(repair);const e=evaluate(repair.cabinet);assert.equal(e.adjustable.shelves.length,2);assert.equal(e.adjustable.shelves[0].origin[1],e.adjustable.shelves[1].origin[1]);assert.ok(repair.cabinet.contents.every(s=>s.drilling?.anchor==='centre'&&s.frontSetback>0));const store=new CabinetStore(c);assert.ok(store.commit(repair.cabinet));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(readSimpleCabinet(serialize(store.getSnapshot().committed)),repair.cabinet);
 const open={...c,fronts:[]};assert.doesNotThrow(()=>evaluate(addInteriors(open,ids,'adjustable').cabinet));assert.doesNotThrow(()=>evaluate(addInteriors(c,ids,'adjustable',25).cabinet));
});
test('real bores retain circular outlines without long cap-bridge diagonals at multiple hinge setbacks',()=>{
 const original=fixture();for(const endOffset of [60,100,120,140]){const c={...original,fronts:original.fronts.map(d=>({...d,hinge:{...d.hinge!,endOffset}}))},e=evaluate(c),bores=[...e.drilling,...e.backFasteners,...e.cabineo.flatMap(j=>j.bores)];let curves=0;for(const panel of e.panels){const mesh=panelDisplayGeometry(panel,e.pockets,bores),edges=panelDisplayEdges(panel,mesh,e.pockets,bores),v=edges.getAttribute('position');assert.ok(v.count>0);for(let i=0;i<v.count;i+=2){const delta=[v.getX(i+1)-v.getX(i),v.getY(i+1)-v.getY(i),v.getZ(i+1)-v.getZ(i)];if(delta.filter(n=>Math.abs(n)>.001).length>1){curves++;assert.ok(Math.hypot(...delta)<5,'triangulation bridge must not be a displayed edge');}}mesh.dispose();edges.dispose();}assert.ok(curves>50,'actual cup / drill arcs remain visible');}
});
test('continuous back stock and native 23 migration preserve explicit settings and reject impossible inputs',()=>{
 const c=fixture(),next=setBackPanel(c,{thickness:5.5});assert.equal(evaluate(next).panels.find(p=>p.role==='back')!.size[2],5.5);assert.deepEqual(readSimpleCabinet(serialize(next)),next);assert.ok(deserializeWithInfo(source).migrated);for(const thickness of [2.9,24.1,NaN,5.55])assert.throws(()=>setBackPanel(c,{thickness}),/3–24/);assert.equal(JSON.parse(source).schemaVersion,23);
});
test('every finger-joint entry point enables dogbones without changing the independent fit allowance',()=>{
 const c=createCabinet(),division=addInteriors(c,[c.compartments.id],'divider');for(const next of [setPuzzleCorners(c,true),setInteriorFinger(division.cabinet,division.featureIds[0],true),setBackPanel(c,{mode:'finger'})]){assert.equal(cnc(next).dogbones,true);assert.equal(cnc(next).tolerance,.2);assert.doesNotThrow(()=>evaluate(next));}
});
