import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deserialize,serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {setBackFastener} from '../src/commands/back-panel.ts';
import {backFixingRepairs} from '../src/commands/machining-repairs.ts';
import {toolingRepairs} from '../src/commands/tooling-repairs.ts';
import {renameItem} from '../src/commands/item-names.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {cnc} from '../src/rules/cnc.ts';
const source=fs.readFileSync(new URL('./fixtures/with-machining-error.cabinet.json',import.meta.url),'utf8');
const fixture=()=>setBackFastener(deserialize(source),true);
test('back-fixing collisions identify both affected parts and offer nearest clear positions in each direction',()=>{
 const c=fixture(),e=evaluate(c),collisions=e.issues.filter(i=>i.code==='machining-collision');assert.ok(collisions.some(i=>i.message.includes('collides with divider')));const divider=e.panels.find(p=>p.role==='divider')!;assert.ok(collisions.some(i=>i.relatedIds?.includes(divider.id)));assert.ok(collisions.every(i=>i.operationIds?.length));
 const repairs=backFixingRepairs(c);assert.equal(repairs.length,2);assert.match(repairs[0].label,/left/);assert.match(repairs[1].label,/right/);
 for(const repair of repairs){const r=evaluate(repair.cabinet),backIds=new Set(r.backFasteners.map(b=>b.id));assert.ok(!r.issues.some(i=>i.code==='machining-collision'&&i.operationIds?.some(id=>backIds.has(id))));assert.deepEqual(repair.cabinet.compartments,c.compartments);assert.deepEqual(repair.cabinet.fronts,c.fronts);assert.equal(r.backFasteners.length,e.backFasteners.length);const offset=repair.cabinet.carcass.back.joint!.fastener!.offset!;assert.ok(Number.isInteger(offset));if(Math.abs(offset)>1){const before={...repair.cabinet,carcass:{...repair.cabinet.carcass,back:{...repair.cabinet.carcass.back,joint:{...repair.cabinet.carcass.back.joint!,fastener:{...repair.cabinet.carcass.back.joint!.fastener!,offset:offset-Math.sign(offset)}}}}};const prior=evaluate(before);assert.ok(prior.issues.some(i=>i.code==='machining-collision'&&i.operationIds?.some(id=>backIds.has(id))));}assert.deepEqual(deserialize(serialize(repair.cabinet)),repair.cabinet);}
});
test('tooling always offers the two valid approaches for a thin Ixconnect back, explicitly removing incompatible fixings',()=>{
 const c=fixture(),options=toolingRepairs(c);assert.equal(options.length,2);assert.match(options[0].label,/Ø3 mm/);assert.match(options[1].label,/6 mm back stock; remove incompatible Ixconnect/);assert.ok(!options[1].cabinet.carcass.back.joint!.fastener);for(const o of options){assert.ok(!evaluate(o.cabinet).issues.some(i=>i.code==='machining-tool-width'));assert.equal(cnc(o.cabinet).tolerance,.2);}
});
test('item names are stable metadata with geometry identity, Undo, opening names and native round trips preserved',()=>{
 const c=fixture(),e=evaluate(c),part=e.panels.find(p=>p.role==='divider')!,opening=e.openings[0],named=renameItem(renameItem(c,part.id,'Centre partition'),opening.id,'Left bay'),store=new CabinetStore(c);assert.equal(evaluate(named).panels.find(p=>p.id===part.id)!.label,'Centre partition');assert.equal(evaluate(named).divisions.find(p=>p.id===part.id)!.label,'Centre partition');assert.equal(evaluate(named).openings[0].label,'Left bay');assert.deepEqual(evaluate(named).panels.map(p=>[p.id,p.center,p.size]),e.panels.map(p=>[p.id,p.center,p.size]));assert.ok(store.commit(named));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(deserialize(serialize(store.getSnapshot().committed)),named);assert.throws(()=>renameItem(c,part.id,' '));assert.throws(()=>renameItem(c,part.id,'x'.repeat(61)));const doc=JSON.parse(serialize(c));doc.cabinet.names=null;assert.throws(()=>deserialize(JSON.stringify(doc)));
});
test('BLUMOTION soft close is intrinsic to the family and legacy switches migrate without changing machining',()=>{
 const raw=JSON.parse(source);raw.cabinet.fronts[0].hinge.softClose=false;const migrated=deserializeWithInfo(JSON.stringify(raw));assert.ok(migrated.migrated);assert.ok(!('softClose' in migrated.cabinet.fronts[0].hinge!));assert.ok(evaluate(migrated.cabinet).doorHardware.hinges.every(h=>h.softClose));assert.deepEqual(evaluate(migrated.cabinet).drilling,evaluate(deserialize(source)).drilling);
});
