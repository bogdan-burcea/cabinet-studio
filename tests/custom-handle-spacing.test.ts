import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {addDoor} from '../src/commands/fronts';
import {addDrawerStack} from '../src/commands/drawers';
import {editFrontFeatures} from '../src/commands/front-features';
import {CabinetStore} from '../src/commands/store';
import {evaluate} from '../src/geometry/evaluate';
import {serialize,deserializeWithInfo} from '../src/persistence/files';

test('custom pull spacing drives matched holes on doors and grouped drawer fronts and survives native files and Undo',()=>{
 const base=createCabinet(),door=addDoor(base),drawers=addDrawerStack(base,base.compartments.id,3);
 for(const source of [door.cabinet,drawers.cabinet]){
  const ids=[...source.fronts.map(d=>d.id),...(source.drawers??[]).map(d=>d.id)],next=editFrontFeatures(source,ids,{handle:{kind:'pull',pitch:143.5,orientation:'horizontal',horizontal:'centre',height:'centre'}}),model=evaluate(next);
  const holes=model.drilling.filter(b=>b.kind==='handle');
  assert.equal(holes.length,ids.length*2);
  for(const panel of new Set(holes.map(b=>b.panelId))){const pair=holes.filter(b=>b.panelId===panel);assert.equal(Math.abs(pair[1].point[0]-pair[0].point[0]),143.5);assert.ok(pair.every(b=>b.through));}
  assert.deepEqual(evaluate(deserializeWithInfo(serialize(next)).cabinet),model);
  const store=new CabinetStore(source);assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,source);store.redo();assert.deepEqual(store.getSnapshot().committed,next);
 }
});
test('custom handle pitches retain precision, range and actual front-fit rejection',()=>{
 const source=addDoor(createCabinet()).cabinet,ids=source.fronts.map(d=>d.id),store=new CabinetStore(source);
 for(const pitch of [0,9.9,2000.1,NaN,143.55,1000]){
  assert.equal(store.commit(editFrontFeatures(source,ids,{handle:{kind:'pull',pitch,orientation:'horizontal'}})),false);
  assert.deepEqual(store.getSnapshot().committed,source);
 }
});
