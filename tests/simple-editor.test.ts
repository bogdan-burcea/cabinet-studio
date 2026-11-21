import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {isSimpleCabinet} from '../src/domain/simple-cabinet.ts';
import {readSimpleCabinet,SIMPLE_AUTOSAVE_KEY} from '../src/persistence/simple.ts';
import {AUTOSAVE_KEY,PREVIOUS_AUTOSAVE_KEYS,serialize} from '../src/persistence/files.ts';
import {resizeCabinet} from '../src/commands/dimensions.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {addMetalDrawer} from '../src/commands/drawers.ts';
import {addDoorPair} from '../src/commands/fronts.ts';
import {addDivision,centreDivision,moveDivision,removeDivision} from '../src/commands/interiors.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
test('simple draft storage never reads or overwrites an advanced version key',()=>{
 assert.notEqual(SIMPLE_AUTOSAVE_KEY,AUTOSAVE_KEY);assert.ok(!([...PREVIOUS_AUTOSAVE_KEYS] as string[]).includes(SIMPLE_AUTOSAVE_KEY));
});
test('a simple cabinet round trips with dimensions and five stable panel identities',()=>{
 const c=resizeCabinet(createCabinet(),'width',800),saved=serialize(c),loaded=readSimpleCabinet(saved);assert.ok(isSimpleCabinet(loaded));assert.deepEqual(loaded,c);assert.equal(evaluate(loaded).panels.length,5);assert.deepEqual(evaluate(loaded).panels.map(p=>p.id),evaluate(c).panels.map(p=>p.id));
});
test('advanced files fail intact instead of silently losing installation or exact drawer intent',()=>{
 const c=createCabinet();for(const advanced of [{...c,installation:{...c.installation,type:'floor' as const,mounting:{...c.installation.mounting,mode:'restraint-concept' as const}}}]){const source=serialize(advanced),copy=structuredClone(advanced);assert.throws(()=>readSimpleCabinet(source),/outside the simple editor/);assert.deepEqual(advanced,copy);assert.deepEqual(JSON.parse(source).cabinet,copy);}
});
test('size, new and open operations use normal reversible transactions; invalid sizes preserve the cabinet',()=>{
 const c=createCabinet(),store=new CabinetStore(c),resized=resizeCabinet(c,'depth',650);assert.ok(store.commit(resized));assert.equal(store.commit(resizeCabinet(resized,'width',50)),false);assert.deepEqual(store.getSnapshot().committed,resized);store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,resized);const fresh=createCabinet();assert.ok(store.commit(fresh));store.undo();assert.deepEqual(store.getSnapshot().committed,resized);assert.ok(store.commit(readSimpleCabinet(serialize(c))));store.undo();assert.deepEqual(store.getSnapshot().committed,resized);
});

test('simple shelves retain centred intent, nested openings and identity through save/load and resize',()=>{
 const c=createCabinet(),first=addDivision(c,c.compartments.id,'horizontal',342),centred=centreDivision(first.cabinet,first.featureId),child=evaluate(centred).openings[1],second=addDivision(centred,child.id,'horizontal',166.5),loaded=readSimpleCabinet(serialize(second.cabinet));assert.ok(isSimpleCabinet(loaded));assert.deepEqual(loaded,second.cabinet);assert.equal(evaluate(loaded).panels.length,7);const taller=resizeCabinet(centred,'height',900),shelf=evaluate(taller).divisions[0];assert.equal(shelf.position,432);assert.equal(shelf.before,shelf.after);assert.equal(shelf.id,first.featureId);
});
test('simple shelf movement/removal use reversible transactions and protect invalid or nested edits',()=>{
 const c=createCabinet(),first=addDivision(c,c.compartments.id,'horizontal',342),store=new CabinetStore(c);assert.ok(store.commit(first.cabinet));const moved=moveDivision(first.cabinet,first.featureId,250);assert.ok(store.commit(moved));assert.equal(store.commit(moveDivision(moved,first.featureId,5)),false);assert.deepEqual(store.getSnapshot().committed,moved);store.undo();assert.deepEqual(store.getSnapshot().committed,first.cabinet);store.redo();assert.deepEqual(store.getSnapshot().committed,moved);const child=evaluate(moved).openings[0],nested=addDivision(moved,child.id,'horizontal',120);assert.throws(()=>removeDivision(nested.cabinet,first.featureId));const removed=removeDivision(moved,first.featureId);assert.ok(isSimpleCabinet(removed));assert.equal(evaluate(removed).panels.length,5);assert.ok(store.commit(removed));store.undo();assert.deepEqual(store.getSnapshot().committed,moved);
});

test('simple dividers and shelves coexist with correct clear gaps and survive native round trips',()=>{
 const c=createCabinet(),split=addDivision(c,c.compartments.id,'vertical',282),centered=centreDivision(split.cabinet,split.featureId),left=evaluate(centered).openings[0],shelf=addDivision(centered,left.id,'horizontal',342),loaded=readSimpleCabinet(serialize(shelf.cabinet));assert.deepEqual(loaded,shelf.cabinet);assert.ok(isSimpleCabinet(loaded));assert.equal(evaluate(loaded).divisions.length,2);
 const moved=moveDivision(loaded,split.featureId,109),divider=evaluate(moved).divisions.find(d=>d.id===split.featureId)!;assert.equal(divider.before,100);assert.equal(divider.after,446);assert.throws(()=>removeDivision(loaded,split.featureId));
});
test('a simple divider removal is undoable and invalid movement preserves the committed layout',()=>{
 const c=createCabinet(),split=addDivision(c,c.compartments.id,'vertical',282),store=new CabinetStore(split.cabinet);assert.equal(store.commit(moveDivision(split.cabinet,split.featureId,10)),false);assert.deepEqual(store.getSnapshot().committed,split.cabinet);assert.ok(store.commit(removeDivision(split.cabinet,split.featureId)));assert.equal(evaluate(store.getSnapshot().committed).panels.length,5);store.undo();assert.deepEqual(store.getSnapshot().committed,split.cabinet);
});

test('TANDEMBOX drawers round-trip through the current editor',()=>{const c=createCabinet(),next=addMetalDrawer(c,c.compartments.id).cabinet;assert.deepEqual(readSimpleCabinet(serialize(next)),next);});
