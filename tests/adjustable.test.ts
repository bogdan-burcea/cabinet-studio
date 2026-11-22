import test from 'node:test';
import assert from 'node:assert/strict';
import { createCabinet, defaultBinding, resize, type Cabinet } from '../src/domain/cabinet.ts';
import { evaluate } from '../src/geometry/evaluate.ts';
import { addAdjustable, moveAdjustable, duplicateAdjustable, removeAdjustable, fixedToAdjustable, adjustableToFixed, setShelfSetback } from '../src/commands/adjustable.ts';
import { addDivision, moveDivision, removeDivision } from '../src/commands/interiors.ts';
import { changeMaterial, setBanding } from '../src/commands/materials.ts';
import { CabinetStore } from '../src/commands/store.ts';
import { serialize, deserialize, deserializeWithInfo, PREVIOUS_AUTOSAVE_KEYS } from '../src/persistence/files.ts';
const pin = (id: string) => ({id,revision:'1'});
function furnished() {
  let c=createCabinet(); c.envelope.origin=[20,40,-30]; c.carcass.top.mode='rails'; c.carcass.back.mode='rails';
  c.installation.type='feet-concept'; c.installation.plinth={...c.installation.plinth,enabled:true,leftReturn:true,rightReturn:true}; c.installation.mounting.mode='restraint-concept';
  c=addDivision(c,c.compartments.id,'horizontal',340).cabinet;
  c=addDivision(c,evaluate(c).openings[0].id,'vertical',280).cabinet;
  c=changeMaterial(c,'interior',{...defaultBinding(pin('generic-panel-16')),finish:pin('oak-concept'),grain:'u'});
  c=setBanding(c,evaluate(c).panels.find(p=>p.role==='shelf')!.id,'v-max',pin('generic-edge-2'));
  return c;
}
function withShelf() { const c=furnished(); return addAdjustable(c,evaluate(c).openings.at(-1)!.id); }
function disjoint(a:{size:number[];center:number[]},b:{size:number[];center:number[]}) { return a.size.some((v,i)=>Math.min(a.center[i]+v/2,b.center[i]+b.size[i]/2)-Math.max(a.center[i]-v/2,b.center[i]-b.size[i]/2)<1e-6); }
test('adjustable shelves preserve every existing feature and do not split structural openings',()=>{
  const c=furnished(),before=evaluate(c),next=addAdjustable(c,before.openings.at(-1)!.id),e=evaluate(next.cabinet);
  assert.deepEqual(e.openings,before.openings); assert.deepEqual(e.divisions,before.divisions); assert.deepEqual(e.panels.filter(p=>p.id!==next.featureId),before.panels);
  assert.deepEqual(next.cabinet.compartments,c.compartments); assert.deepEqual(next.cabinet.materials,c.materials);assert.deepEqual(next.cabinet.banding,c.banding);
  assert.deepEqual(e.installation,before.installation);assert.deepEqual(e.mounting,before.mounting);assert.equal(e.adjustable.supports.length,4);assert.deepEqual(next.cabinet.hardware,[]);
});
test('support levels, setbacks, side clearances and pads derive from pinned concept rules with nonzero origin',()=>{
  const {cabinet:c,featureId:id}=withShelf(),e=evaluate(c),s=e.adjustable.shelves[0],o=e.openings.find(o=>o.id===s.nodeId)!;
  assert.equal(s.underside,64+32*c.contents[0].level);assert.equal(s.position,s.underside+8);assert.deepEqual(s.size,[o.size[0]-2,16,o.size[2]-10]);
  assert.deepEqual(s.origin,[o.origin[0]+1,o.origin[1]+s.underside,o.origin[2]]);
  for(const pad of e.adjustable.supports){assert.equal(pad.ownerId,id);assert.equal(pad.center[1]+pad.size[1]/2,s.origin[1]);assert.ok(pad.id.startsWith(`${id}/support/`));}
  const moved=evaluate(moveAdjustable(c,id,s.position+32));assert.equal(moved.adjustable.shelves[0].position,s.position+32);assert.deepEqual(moved.adjustable.supports.map(s=>s.id),e.adjustable.supports.map(s=>s.id));
});
test('numeric and drag positions snap through the same command; invalid levels preserve the entire prior cabinet',()=>{
  const {cabinet:c,featureId:id}=withShelf(),s=evaluate(c).adjustable.shelves[0],store=new CabinetStore(c);
  assert.deepEqual(moveAdjustable(c,id,s.position+30),moveAdjustable(c,id,s.position+32));
  for(const centre of [NaN,-100,99999]){assert.equal(store.commit(moveAdjustable(c,id,centre)),false);assert.equal(store.getSnapshot().issueFeatureId,id);assert.deepEqual(store.getSnapshot().committed,c);}
  store.preview(moveAdjustable(c,id,s.position+32));store.commit();store.undo();assert.deepEqual(store.getSnapshot().committed,c);assert.equal(store.getSnapshot().canUndo,false);store.redo();assert.equal(evaluate(store.getSnapshot().committed).adjustable.shelves[0].position,s.position+32);
});
test('all stock/top/back combinations keep adjustable panels, support pads, body and installation disjoint',()=>{
  for(const thickness of [16,18,19,22])for(const top of ['full','rails'] as const)for(const back of ['full','rails'] as const){
    let c=createCabinet();c.carcass.top.mode=top;c.carcass.back.mode=back;c=changeMaterial(c,'interior',defaultBinding(pin(`generic-panel-${thickness}`)));
    c=addAdjustable(c,c.compartments.id).cabinet;c=addAdjustable(c,c.compartments.id).cabinet;
    const e=evaluate(c),bodies=[...e.panels,...e.adjustable.supports];
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)assert.ok(disjoint(bodies[i],bodies[j]),`${thickness}/${top}/${back}`);
    assert.equal(e.adjustable.supports.length,8);
  }
});
test('adding and moving siblings enforce 60 mm clearances and legal level lists exclude collisions',()=>{
  let c=createCabinet();const first=addAdjustable(c,c.compartments.id);c=duplicateAdjustable(first.cabinet,first.featureId).cabinet;
  const e=evaluate(c),a=e.adjustable.shelves[0],b=e.adjustable.shelves[1],store=new CabinetStore(c);
  assert.ok(a.before>=60&&a.after>=60&&b.before>=60&&b.after>=60);assert.ok(!a.legalPositions.includes(b.position));
  assert.equal(store.commit(moveAdjustable(c,a.id,b.position)),false);assert.deepEqual(store.getSnapshot().committed,c);
});
test('material thickness updates shelf centres and geometry while preserving the stored support level and underside',()=>{
  const {cabinet:c,featureId:id}=withShelf(),before=evaluate(c).adjustable.shelves[0];
  const changed=changeMaterial(c,'interior',defaultBinding(pin('generic-panel-22'))),after=evaluate(changed).adjustable.shelves[0];
  assert.equal(changed.contents[0].level,c.contents[0].level);assert.equal(after.underside,before.underside);assert.equal(after.position,before.position+3);assert.equal(after.size[1],22);assert.equal(after.id,id);
});
test('shelf banding and duplication preserve the finished envelope and independent identities; removal/Undo restore them',()=>{
  let {cabinet:c,featureId:id}=withShelf();c=setBanding(c,id,'v-max',pin('generic-edge-2'));
  const panel=evaluate(c).panels.find(p=>p.id===id)!,duplicate=duplicateAdjustable(c,id);
  assert.notEqual(duplicate.featureId,id);assert.deepEqual(duplicate.cabinet.banding[duplicate.featureId],c.banding[id]);assert.equal(panel.coreSize[2],panel.size[2]-2);
  const store=new CabinetStore(duplicate.cabinet);store.commit(removeAdjustable(duplicate.cabinet,id));assert.ok(!store.getSnapshot().committed.banding[id]);store.undo();assert.deepEqual(store.getSnapshot().committed,duplicate.cabinet);
});
test('dividing or merging an occupied opening is rejected instead of orphaning adjustable contents',()=>{
  const {cabinet:c,featureId:id}=withShelf(),s=evaluate(c).adjustable.shelves[0],store=new CabinetStore(c),o=evaluate(c).openings.find(o=>o.id===s.nodeId)!;
  assert.equal(store.commit(addDivision(c,o.id,'vertical',o.size[0]/2).cabinet),false);assert.equal(store.getSnapshot().issueFeatureId,id);assert.deepEqual(store.getSnapshot().committed,c);
  const parent=c.compartments;assert.equal(parent.kind,'split');if(parent.kind==='split')assert.throws(()=>removeDivision(c,parent.featureId));
});
test('parent/body resizing and depth/setback changes validate dependent shelves without rewriting local levels',()=>{
  const {cabinet:c,featureId:id}=withShelf(),store=new CabinetStore(c);
  assert.equal(store.commit(setShelfSetback(c,id,51)),false);assert.deepEqual(store.getSnapshot().committed,c);
  const base=createCabinet(), plain=addAdjustable(base,base.compartments.id).cabinet, state=new CabinetStore(plain);
  assert.equal(state.commit(resize(plain,'height',200)),false);assert.deepEqual(state.getSnapshot().committed,plain);
  assert.equal(state.commit(resize(plain,'depth',100)),false);assert.deepEqual(state.getSnapshot().committed,plain);
  const parent=c.compartments;if(parent.kind==='split'){const next=moveDivision(c,parent.featureId,600);assert.equal(store.commit(next),false);assert.deepEqual(store.getSnapshot().committed,c);}
});

test('fixed/adjustable conversion previews preserve panel identity and banding; nested content conversion is blocked',()=>{
  let c=createCabinet();const fixed=addDivision(c,c.compartments.id,'horizontal',342);c=setBanding(fixed.cabinet,fixed.featureId,'v-max',pin('generic-edge-1'));
  const converted=fixedToAdjustable(c,fixed.featureId);assert.equal(converted.contents[0].id,fixed.featureId);assert.deepEqual(converted.banding,c.banding);assert.equal(evaluate(converted).openings.length,1);
  const restored=adjustableToFixed(converted,fixed.featureId);assert.equal(evaluate(restored).divisions[0].id,fixed.featureId);assert.deepEqual(restored.banding,c.banding);assert.equal(restored.contents.length,0);
  const nested=addDivision(c,evaluate(c).openings[0].id,'vertical',280).cabinet;assert.throws(()=>fixedToAdjustable(nested,fixed.featureId),/Remove child/);
  const multiple=duplicateAdjustable(converted,fixed.featureId).cabinet,split=adjustableToFixed(multiple,fixed.featureId);assert.equal(evaluate(split).adjustable.shelves.length,1);assert.deepEqual(evaluate(split).adjustable.shelves[0].origin,evaluate(multiple).adjustable.shelves.find(s=>s.id!==fixed.featureId)!.origin);
  const store=new CabinetStore(c);store.preview(converted);store.cancel();assert.deepEqual(store.getSnapshot().committed,c);store.commit(converted);store.undo();assert.deepEqual(store.getSnapshot().committed,c);
});
test('schema 11 preserves all adjustable intent/geometry and schema 6 migrates a copy without changing prior features',()=>{
  const {cabinet:c}=withShelf();assert.deepEqual(deserialize(serialize(c)),c);assert.deepEqual(evaluate(deserialize(serialize(c))),evaluate(c));
  const previous=furnished(),text=JSON.stringify({format:'cabinet-studio',schemaVersion:6,evaluatorRevision:'mounting-6',cabinet:previous}),result=deserializeWithInfo(text);
  assert.equal(result.migrated,true);assert.deepEqual(result.cabinet,previous);assert.deepEqual(evaluate(result.cabinet),evaluate(previous));assert.ok(PREVIOUS_AUTOSAVE_KEYS.includes('cabinet-studio.autosave.v6'));assert.deepEqual(JSON.parse(text).cabinet,previous);
});
test('malformed shelf policies/products, vanished parents and colliding shelf/pad/panel/tree IDs are rejected',()=>{
  const {cabinet:c}=withShelf(),store=new CabinetStore(c);
  const mutations=[
    (d:any)=>d.cabinet.contents[0].support.revision='99',
    (d:any)=>d.cabinet.contents[0].policyRevision='other',
    (d:any)=>d.cabinet.contents[0].level=1.5,
    (d:any)=>d.cabinet.contents[0].frontSetback='10',
    (d:any)=>d.cabinet.contents[0].openingId='missing',
    (d:any)=>d.cabinet.contents[0].id=c.id,
    (d:any)=>d.cabinet.contents[0].id=`${c.id}/panel/left`,
    (d:any)=>d.cabinet.compartments.id=`${c.contents[0].id}/support/front-left`,
    (d:any)=>d.cabinet.contents.push({...d.cabinet.contents[0]}),
    (d:any)=>d.cabinet.contents[0].extra=true
  ];
  for(const mutate of mutations){const doc=JSON.parse(serialize(c));mutate(doc);assert.throws(()=>store.commit(deserialize(JSON.stringify(doc))));assert.deepEqual(store.getSnapshot().committed,c);}
});
