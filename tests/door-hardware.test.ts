import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addSimpleDoors} from '../src/commands/simple-doors.ts';
import {updateDoor} from '../src/commands/fronts.ts';
import {defaultHinge} from '../src/catalogue/hinges.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {setStockThickness} from '../src/commands/stock.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {safeDoorAngles,openingPivot} from '../src/rules/door-motion.ts';
import {explodedLayout} from '../src/viewport/display.ts';
import {addDivision} from '../src/commands/interiors.ts';
import {partPreview} from '../src/geometry/part-preview.ts';
const pair=()=>{const c=addSimpleDoors(createCabinet(),'pair').cabinet;return {...c,fronts:c.fronts.map(d=>({...d,hinge:defaultHinge()}))};};
test('Blum overlay and inset articles generate matched cups and physical support pilots',()=>{
 for(const placement of ['overlay','inset'] as const){let c=pair();c={...c,fronts:c.fronts.map(d=>({...d,placement}))};const e=evaluate(c);assert.equal(e.doorHardware.hinges.length,4);assert.ok(e.doorHardware.hinges.every(h=>h.article===(placement==='inset'?'71B3750':'71B3550')&&h.plate==='173H7100'));assert.equal(e.drilling.filter(b=>b.kind==='hinge-cup'&&b.diameter===35&&b.depth===13).length,4);assert.equal(e.drilling.filter(b=>b.kind==='hinge-pilot').length,16);assert.ok(e.doorHardware.hinges.every(h=>e.panels.some(p=>p.id===h.supportId)));assert.deepEqual(readSimpleCabinet(serialize(c)),c);const panel=e.panels.find(p=>p.id===c.fronts[0].id)!;assert.ok(partPreview(panel,e.drilling,[],-1).bores.find(b=>b.kind==='hinge-cup')!.path);}
});
test('hinges reject shallow stock, crowded positions, unknown revisions and unsupported mounting lines without replacing intent',()=>{
 const c=pair(),store=new CabinetStore(c);for(const bad of [setStockThickness(c,12),updateDoor(c,c.fronts[0].id,{hinge:{...defaultHinge(),count:6,endOffset:300}}),updateDoor(c,c.fronts[0].id,{hinge:{...defaultHinge(),revision:'future' as any}})]){assert.equal(store.commit(bad),false);assert.deepEqual(store.getSnapshot().committed,c);}const next=updateDoor(c,c.fronts[0].id,{hinge:{...defaultHinge(),count:3}});assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(readSimpleCabinet(serialize(store.getSnapshot().committed)),next);
});
test('vertical/horizontal pulls, knobs and finger holes share placement and actual through drilling',()=>{
 for(const kind of ['pull','knob','hole'] as const)for(const orientation of ['vertical','horizontal'] as const)for(const horizontal of ['left','centre','right','latch'] as const){let c=addSimpleDoors(createCabinet(),'single').cabinet;const d=c.fronts[0];c=updateDoor(c,d.id,{handle:{...d.handle,kind,orientation,horizontal,height:'top',endOffset:60,diameter:30,projection:32,drillDiameter:4}});const e=evaluate(c),holes=e.drilling.filter(b=>b.kind==='handle');assert.equal(holes.length,kind==='pull'?2:1);assert.ok(holes.every(b=>b.through&&b.depth===18&&b.diameter===(kind==='hole'?30:4)));assert.equal(e.fronts.handles.length,kind==='hole'?0:kind==='knob'?1:3);assert.deepEqual(readSimpleCabinet(serialize(c)),c);}
});
test('inset/overlay door sweeps open outward without hitting the carcass; real obstacles stop the sweep',()=>{
 for(const placement of ['overlay','inset'] as const){let c=pair();c={...c,fronts:c.fronts.map(d=>({...d,placement}))};const e=evaluate(c),ids=c.fronts.map(d=>d.id),result=safeDoorAngles(e,{},ids,110);assert.equal(result.blocked,false);assert.equal(result.angles[ids[0]],110);assert.equal(openingPivot(e.fronts.doors[0])[2],e.fronts.doors[0].center[2]+9);const obstacle={...e.panels[0],id:'obstruction',size:[1000,1000,1000] as [number,number,number],center:[300,360,900] as [number,number,number]};assert.equal(safeDoorAngles({...e,panels:[...e.panels,obstacle]}, {},ids,110).blocked,true);assert.equal(safeDoorAngles(e,result.angles,ids,0).blocked,false);}
});
test('exploded divider remains between the outside panels with compact shelf separation',()=>{
 let c=createCabinet();const split=addDivision(c,c.compartments.id,'vertical',282);c=split.cabinet;const openings=evaluate(c).openings;for(const o of openings)c=addDivision(c,o.id,'horizontal',300).cabinet;const e=evaluate(c),offsets=explodedLayout(e.panels,80),divider=e.panels.find(p=>p.role==='divider')!,left=e.panels.find(p=>p.role==='left')!,right=e.panels.find(p=>p.role==='right')!;const x=(p:typeof divider)=>p.center[0]+offsets.get(p.id)![0];assert.ok(x(left)<x(divider)&&x(divider)<x(right));assert.ok(e.panels.filter(p=>p.role==='shelf').every(p=>offsets.get(p.id)![2]===80));for(const a of e.panels)for(const b of e.panels){if(a.id>=b.id)continue;assert.equal([0,1,2].every(i=>Math.abs(a.center[i]+offsets.get(a.id)![i]-b.center[i]-offsets.get(b.id)![i])<(a.size[i]+b.size[i])/2-.001),false);}
});
test('native 22 keeps legacy doors unchanged; corrupt extended hardware is rejected',()=>{
 const c=addSimpleDoors(createCabinet(),'single').cabinet,old=JSON.parse(serialize(c));old.schemaVersion=22;old.evaluatorRevision='simple-doors-22';assert.deepEqual(deserializeWithInfo(JSON.stringify(old)),{cabinet:c,migrated:true});const current=JSON.parse(serialize(pair()));current.cabinet.fronts[0].hinge.extra=true;assert.throws(()=>readSimpleCabinet(JSON.stringify(current)));
});
