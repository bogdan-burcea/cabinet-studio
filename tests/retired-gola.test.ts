import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {addDoor} from '../src/commands/fronts';
import {addDrawerStack} from '../src/commands/drawers';
import {serialize,deserializeWithInfo} from '../src/persistence/files';
import {defaultDrawerHandle} from '../src/rules/handles';
import {evaluate} from '../src/geometry/evaluate';

test('temporary GOLA drafts reopen without handles while keeping front sizes, IDs and other settings',()=>{
 const base=createCabinet();
 for(const c of [addDoor(base).cabinet,addDrawerStack(base,base.compartments.id,3).cabinet]){
  for(const front of [...c.fronts,...c.drawers??[]])if(front.handle)front.handle.kind='none';
  const doc=JSON.parse(serialize(c));
  for(const front of [...doc.cabinet.fronts,...doc.cabinet.drawers??[]]){
   if(!front.handle)front.handle=defaultDrawerHandle();
   front.handle.kind='gola';
  }
  const loaded=deserializeWithInfo(JSON.stringify(doc));assert.equal(loaded.migrated,true);
  assert.ok([...loaded.cabinet.fronts,...loaded.cabinet.drawers??[]].every(f=>f.handle?.kind==='none'));
  assert.deepEqual(evaluate(loaded.cabinet).fronts.doors,evaluate(c).fronts.doors);
  assert.deepEqual(evaluate(loaded.cabinet).drawers.drawers.map(d=>d.front),evaluate(c).drawers.drawers.map(d=>d.front));
 }
});
