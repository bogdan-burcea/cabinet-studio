import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {setSimpleSupport,setSimpleFeet,setSimplePlinth} from '../src/commands/simple-supports.ts';
import {applySimplePreset} from '../src/commands/simple-presets.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {setBackFastener} from '../src/commands/back-panel.ts';
import {addInteriors} from '../src/commands/simple-interiors.ts';
import {addSimpleDoors} from '../src/commands/simple-doors.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
import {editRepairs} from '../src/commands/edit-repairs.ts';
import {explodedLayout} from '../src/viewport/display.ts';
test('base style exposes independent supports without enabling them on preset selection; supports preserve all existing features',()=>{
 let c=setCabineo(createCabinet(),'cabineo-8');c=addInteriors(c,[c.compartments.id],'fixed').cabinet;c=addSimpleDoors(c,'pair').cabinet;const base=applySimplePreset(c,'base');assert.equal(base.cabinetType,'base');assert.equal(base.installation.type,'unassigned');const feet=setSimpleSupport(base,'feet-concept'),fitted=setSimplePlinth(feet,{enabled:true,leftReturn:true,rightReturn:true}),e=evaluate(fitted);assert.equal(e.installation.feet.length,4);assert.equal(e.installation.panels.length,3);assert.equal(e.installation.installedHeight,820);assert.equal(e.installation.plinthHeight,95);assert.deepEqual(e.divisions.map(p=>p.id),evaluate(c).divisions.map(p=>p.id));assert.deepEqual(fitted.fronts,c.fronts);assert.deepEqual(e.cabineo.map(j=>j.id),evaluate(c).cabineo.map(j=>j.id));assert.deepEqual(readSimpleCabinet(serialize(fitted)),fitted);const store=new CabinetStore(base);assert.ok(store.commit(fitted));store.undo();assert.deepEqual(store.getSnapshot().committed,base);store.redo();assert.deepEqual(store.getSnapshot().committed,fitted);const off=setSimpleSupport(fitted,'unassigned');assert.equal(evaluate(off).installation.feet.length,0);assert.equal(off.installation.plinth.enabled,false);
});
test('bottom housings and back fastener drill from the exterior while matched receivers retain their geometry',()=>{
 const c=setBackFastener(setCabineo(createCabinet(),'cabineo-8'),true),e=evaluate(c),bottom=e.panels.find(p=>p.role==='bottom')!,low=bottom.center[1]-bottom.size[1]/2;
 const housings=e.cabineo.filter(j=>j.hostId===bottom.id).flatMap(j=>j.bores).filter(b=>b.kind==='housing');assert.ok(housings.length>0);assert.ok(housings.every(b=>b.point[1]===low&&b.sign===1&&b.depth===11));const back=e.backFasteners.find(b=>b.panelId===bottom.id)!;assert.equal(back.point[1],low);assert.equal(back.sign,1);assert.equal(back.depth,12.5);assert.equal(e.cabineo.filter(j=>j.hostId===bottom.id).flatMap(j=>j.bores).filter(b=>b.kind==='receiver').length,e.cabineo.filter(j=>j.hostId===bottom.id).length);
});
test('plinth/foot interference is rejected and offers a reversible fitting-position correction',()=>{
 const c=setSimplePlinth(setSimpleSupport(applySimplePreset(createCabinet(),'base'),'feet-concept'),{enabled:true}),bad=setSimplePlinth(c,{footGap:130}),store=new CabinetStore(c);assert.equal(store.commit(bad),false);assert.deepEqual(store.getSnapshot().committed,c);const repair=editRepairs(bad,c).find(o=>o.label.includes('Fit foot positions'))!;assert.ok(repair);assert.equal(repair.cabinet.installation.plinth.footGap,130);assert.equal(repair.cabinet.installation.feet.frontInset,178);assert.doesNotThrow(()=>evaluate(repair.cabinet));assert.ok(store.commit(repair.cabinet));store.undo();assert.deepEqual(store.getSnapshot().committed,c);
});
test('exploded foot parts move below the separated bottom and native 25 still migrates',()=>{
 const c=setSimpleSupport(applySimplePreset(createCabinet(),'base'),'feet-concept'),e=evaluate(c),offsets=explodedLayout(e.panels,80),bottom=e.panels.find(p=>p.role==='bottom')!,bottomY=bottom.center[1]-bottom.size[1]/2+offsets.get(bottom.id)![1];for(const foot of e.installation.feet)assert.ok(foot.parts.every(p=>p.center[1]+p.size[1]/2-80<=bottomY+1e-6));const doc=JSON.parse(serialize(createCabinet()));doc.schemaVersion=25;doc.evaluatorRevision='alerts-names-25';assert.ok(deserializeWithInfo(JSON.stringify(doc)).migrated);
});
