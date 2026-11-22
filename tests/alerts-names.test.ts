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
test('side-only back fixings preserve the divider and need no separate collision repair',()=>{
 const c=fixture(),e=evaluate(c),ids=new Set(e.backFasteners.map(b=>b.id));
 assert.equal(e.backFasteners.length,4);assert.ok(e.backFasteners.every(b=>b.axis===0));
 assert.ok(!e.issues.some(i=>i.operationIds?.some(id=>ids.has(id))));
 assert.deepEqual(evaluate(deserialize(serialize(c))).backFasteners,e.backFasteners);
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
