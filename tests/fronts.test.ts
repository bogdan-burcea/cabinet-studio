import test from 'node:test';
import assert from 'node:assert/strict';
import { createCabinet, defaultBinding, resize } from '../src/domain/cabinet.ts';
import { addDoor, addDoorPair, splitDoor, updateDoor, removeDoor } from '../src/commands/fronts.ts';
import { addDivision, moveDivision } from '../src/commands/interiors.ts';
import { addAdjustable, setShelfSetback } from '../src/commands/adjustable.ts';
import { changeMaterial, setBanding } from '../src/commands/materials.ts';
import { applyPreset } from '../src/commands/presets.ts';
import { CabinetStore } from '../src/commands/store.ts';
import { evaluate } from '../src/geometry/evaluate.ts';
import { overlaps } from '../src/rules/fronts.ts';
import { inspectionRotation } from '../src/viewport/front-pose.ts';
import { deserialize, deserializeWithInfo, serialize, AUTOSAVE_KEY, PREVIOUS_AUTOSAVE_KEYS } from '../src/persistence/files.ts';
const pin=(id:string)=>({id,revision:'1'});
function baseline(){let c=createCabinet();c.envelope.origin=[15,35,-20];c.carcass.top.mode='rails';c.carcass.back.mode='rails';c.installation.type='feet-concept';c.installation.plinth={...c.installation.plinth,enabled:true,leftReturn:true,rightReturn:true};c.installation.mounting.mode='restraint-concept';c=addDivision(c,c.compartments.id,'horizontal',340).cabinet;c=addDivision(c,evaluate(c).openings[0].id,'vertical',282).cabinet;c=addAdjustable(c,evaluate(c).openings.at(-1)!.id).cabinet;c=changeMaterial(c,'interior',{...defaultBinding(pin('generic-panel-16')),finish:pin('oak-concept'),grain:'u'});return setBanding(c,c.contents[0].id,'v-max',pin('generic-edge-2'));}
test('full-height overlay fronts preserve every existing construction/interior/material/band/installation feature',()=>{
 const c=baseline(),before=evaluate(c),next=addDoor(c),e=evaluate(next.cabinet);
 assert.deepEqual(e.panels.filter(p=>p.role!=='door'),before.panels);assert.deepEqual(e.divisions,before.divisions);assert.deepEqual(e.openings,before.openings);assert.deepEqual(e.adjustable,before.adjustable);assert.deepEqual(e.installation,before.installation);assert.deepEqual(e.mounting,before.mounting);
 for(const key of ['id','envelope','carcass','compartments','contents','materials','banding','installation','hardware'] as const)assert.deepEqual(next.cabinet[key],c[key]);
 assert.equal(e.fronts.doors.length,1);assert.deepEqual(e.fronts.doors[0].size,[596,716,18]);assert.equal(e.fronts.overallDepth,612);assert.ok(e.issues.some(i=>i.code==='provisional-fronts'));
});
test('paired fronts have disjoint canonical slabs and handles across stock, construction and body sizes',()=>{
 for(const thickness of [16,18,19,22])for(const width of [400,600,1000])for(const back of ['full','rails'] as const){let c=createCabinet();c.envelope.width=width;c.carcass.back.mode=back;c=changeMaterial(c,'carcass',defaultBinding(pin(`generic-panel-${thickness}`)));c=addDoorPair(c).cabinet;const e=evaluate(c),bodies=[...e.panels,...e.fronts.handles];assert.equal(e.fronts.doors.length,2);assert.equal(e.fronts.handles.length,6);assert.equal(e.fronts.doors[1].handing,'right');for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)assert.ok(!overlaps(bodies[i],bodies[j]),`${thickness}/${width}/${back}: ${i}/${j}`);}
});
test('front regions remain independent when existing compartments move or are divided',()=>{
 let c=createCabinet();const added=addDoor(c);c=added.cabinet;const before=evaluate(c).fronts;const division=addDivision(c,c.compartments.id,'horizontal',342);const moved=moveDivision(division.cabinet,division.featureId,400);assert.deepEqual(evaluate(moved).fronts,before);assert.deepEqual(moved.fronts,c.fronts);
 const opening=evaluate(moved).openings[0],partial=addDoor({...moved,fronts:[]},opening.id);const region=partial.cabinet.fronts[0].region;assert.equal(region.bottom,0);assert.equal(region.top,418/720);assert.deepEqual(moveDivision(partial.cabinet,division.featureId,350).fronts,partial.cabinet.fronts);
});
test('front splits preserve the first identity and copy material/edge/handle intent without changing interiors',()=>{
 let c=baseline();const added=addDoor(c);c=setBanding(added.cabinet,added.featureId,'u-min',pin('generic-edge-1'));c=changeMaterial(c,'front',{...defaultBinding(pin('generic-panel-19')),finish:pin('white-concept'),grain:'v'},added.featureId);
 const next=splitDoor(c,added.featureId,'vertical',0.4),rows=splitDoor(next.cabinet,next.cabinet.fronts[1].id,'horizontal',0.5).cabinet;assert.equal(rows.fronts.length,3);assert.equal(rows.fronts[0].id,added.featureId);assert.deepEqual(rows.compartments,c.compartments);assert.deepEqual(rows.contents,c.contents);assert.equal(rows.fronts[0].region.right,0.4);assert.deepEqual(rows.fronts[1].material,c.fronts[0].material);assert.deepEqual(rows.banding[rows.fronts[2].id],c.banding[added.featureId]);evaluate(rows);
});
test('inset doors fit an empty carcass and reject fixed/divider/adjustable conflicts instead of trimming them',()=>{
 const c=createCabinet(),added=addDoor(c),inset=updateDoor(added.cabinet,added.featureId,{placement:'inset'}),e=evaluate(inset);assert.deepEqual(e.fronts.doors[0].size,[560,680,18]);assert.equal(e.fronts.doors[0].center[2],549);
 const fixed=addDivision(inset,inset.compartments.id,'horizontal',342),store=new CabinetStore(inset);assert.equal(store.commit(fixed.cabinet),false);assert.deepEqual(store.getSnapshot().committed,inset);
 const base=createCabinet(),shelf=addAdjustable(base,base.compartments.id),front=addDoor(shelf.cabinet),candidate=updateDoor(front.cabinet,front.featureId,{placement:'inset'});assert.throws(()=>evaluate(candidate),/inset slab conflicts/);const corrected=setShelfSetback(candidate,shelf.featureId,24);evaluate(corrected);assert.equal(corrected.contents[0].frontSetback,24);
});
test('handle handing, pitch, direction and knob/none choices derive canonical placement without altering slab geometry',()=>{
 const body=createCabinet(),supported=addDivision(body,body.compartments.id,'vertical',282).cabinet,pair=addDoorPair(supported).cabinet,id=pair.fronts[0].id,original=evaluate(pair);const right=updateDoor(pair,id,{handing:'right'}),e=evaluate(right);const leftBar=original.fronts.handles.find(p=>p.ownerId===id&&p.id.endsWith('/bar'))!,rightBar=e.fronts.handles.find(p=>p.ownerId===id&&p.id.endsWith('/bar'))!;assert.equal(leftBar.center[0]+rightBar.center[0],2*original.fronts.doors[0].center[0]);
 const horizontal=updateDoor(pair,id,{handle:{...pair.fronts[0].handle,orientation:'horizontal',height:'top'}});const bar=evaluate(horizontal).fronts.handles.find(p=>p.ownerId===id&&p.id.endsWith('/bar'))!;assert.deepEqual(bar.size,[152,10,10]);
 const knob=updateDoor(pair,id,{handle:{...pair.fronts[0].handle,kind:'knob'}});assert.equal(evaluate(knob).fronts.handles.filter(p=>p.ownerId===id).length,1);assert.equal(evaluate(knob).fronts.handles.find(p=>p.ownerId===id)!.shape,'cylinder');
 const none=updateDoor(pair,id,{handle:{...pair.fronts[0].handle,kind:'none',pitch:320}});assert.equal(evaluate(none).fronts.handles.filter(p=>p.ownerId===id).length,0);assert.deepEqual(evaluate(none).fronts.doors,original.fronts.doors);
});
test('invalid front bounds, overlaps, handle fit, revisions and dependent body resizing preserve the committed cabinet',()=>{
 const pair=addDoorPair(createCabinet()).cabinet,id=pair.fronts[0].id,store=new CabinetStore(pair);
 for(const next of [updateDoor(pair,id,{reveal:0}),updateDoor(pair,id,{clearance:NaN}),updateDoor(pair,id,{region:{left:0,right:1.2,bottom:0,top:1}}),addDoor(pair).cabinet,updateDoor(pair,id,{handle:{...pair.fronts[0].handle,orientation:'horizontal',pitch:320}}),updateDoor(pair,id,{handle:{...pair.fronts[0].handle,geometry:pin('unknown')}}),resize(pair,'width',160)]){assert.equal(store.commit(next),false);assert.deepEqual(store.getSnapshot().committed,pair);}
 assert.throws(()=>splitDoor(pair,id,'vertical',0.01));
});
test('front material overrides are per door; inherited fronts follow carcass stock and per-edge banding retains finished size',()=>{
 let c=addDoorPair(createCabinet()).cabinet;const id=c.fronts[0].id,other=c.fronts[1].id;c=changeMaterial(c,'front',{...defaultBinding(pin('generic-panel-16')),finish:pin('oak-concept'),grain:'u'},id);c=setBanding(c,id,'v-max',pin('generic-edge-2'));
 const e=evaluate(c),door=e.panels.find(p=>p.id===id)!,inherited=e.panels.find(p=>p.id===other)!;assert.equal(door.size[2],16);assert.equal(door.coreSize[1],door.size[1]-2);assert.equal(door.finish.id,'oak-concept');assert.equal(door.grain,'u');assert.equal(inherited.size[2],18);assert.equal(c.materials.carcass.stock.id,'generic-panel-18');
 const changed=changeMaterial(c,'carcass',defaultBinding(pin('generic-panel-22')));assert.equal(evaluate(changed).panels.find(p=>p.id===id)!.size[2],16);assert.equal(evaluate(changed).panels.find(p=>p.id===other)!.size[2],22);
 assert.equal(evaluate(changeMaterial(c,'front',null,id)).panels.find(p=>p.id===id)!.size[2],18);
});
test('front preview/cancel/apply, splitting and removal use atomic history and restore identities/bands',()=>{
 const c=baseline(),pair=addDoorPair(c).cabinet,store=new CabinetStore(c);store.preview(pair);store.cancel();assert.deepEqual(store.getSnapshot().committed,c);assert.equal(store.getSnapshot().canUndo,false);store.preview(pair);store.commit();store.undo();assert.deepEqual(store.getSnapshot().committed,c);assert.equal(store.getSnapshot().canUndo,false);store.redo();assert.deepEqual(store.getSnapshot().committed,pair);
 const banded=setBanding(pair,pair.fronts[0].id,'v-max',pin('generic-edge-1'));store.commit(banded);store.commit(removeDoor(banded,banded.fronts[0].id));assert.equal(store.getSnapshot().committed.fronts.length,1);assert.ok(!store.getSnapshot().committed.banding[banded.fronts[0].id]);store.undo();assert.deepEqual(store.getSnapshot().committed,banded);
 for(const preset of ['open','base','wall','tall'] as const)assert.deepEqual(applyPreset(banded,preset).fronts,banded.fronts);
});
test('inspection rotation is outward for each handing, clamped and separate from persisted cabinet intent',()=>{
 assert.equal(inspectionRotation('left',90),-Math.PI/2);assert.equal(inspectionRotation('right',90),Math.PI/2);assert.equal(inspectionRotation('left',NaN),0);assert.equal(inspectionRotation('right',200),110*Math.PI/180);const c=addDoorPair(baseline()).cabinet,json=serialize(c);inspectionRotation('left',95);assert.equal(serialize(c),json);assert.deepEqual(deserialize(json),c);
});
test('schema 21 round trips fronts and all existing intent; schema 7 upgrades as an unchanged copy',()=>{
 const c=baseline(),previous=JSON.stringify({format:'cabinet-studio',schemaVersion:7,evaluatorRevision:'interiors-7',cabinet:c}),result=deserializeWithInfo(previous);assert.equal(result.migrated,true);assert.deepEqual(result.cabinet,c);assert.deepEqual(evaluate(result.cabinet),evaluate(c));assert.deepEqual(JSON.parse(previous).cabinet,c);
 const pair=addDoorPair(c).cabinet,encoded=serialize(pair),loaded=deserializeWithInfo(encoded);assert.equal(JSON.parse(encoded).schemaVersion,58);assert.equal(loaded.migrated,false);assert.deepEqual(loaded.cabinet,pair);assert.deepEqual(evaluate(loaded.cabinet),evaluate(pair));assert.equal(AUTOSAVE_KEY,'cabinet-studio.autosave.v58');assert.ok(PREVIOUS_AUTOSAVE_KEYS.includes('cabinet-studio.autosave.v7'));
});
test('strict native validation rejects malformed fronts, unknown pins and shared front/handle/tree/content identities',()=>{
 const c=addDoorPair(baseline()).cabinet,store=new CabinetStore(c),id=c.fronts[0].id;
 const mutations=[(d:any)=>d.cabinet.fronts[0].policyRevision='slab-9',(d:any)=>d.cabinet.fronts[0].region.extra=1,(d:any)=>d.cabinet.fronts[0].handle.kind='bought-unverified',(d:any)=>d.cabinet.fronts[0].handle.geometry.revision='2',(d:any)=>d.cabinet.fronts[0].material={...defaultBinding(pin('generic-back-6'))},(d:any)=>d.cabinet.fronts[1].id=id,(d:any)=>d.cabinet.fronts[1].id=`${id}/handle/post-1`,(d:any)=>d.cabinet.fronts[0].id=c.contents[0].id,(d:any)=>d.cabinet.fronts[0].id=`${c.id}/panel/left`,(d:any)=>d.cabinet.compartments.id=`${id}/handle/bar`,(d:any)=>d.cabinet.fronts[0].clearance='2'];
 for(const mutate of mutations){const doc=JSON.parse(serialize(c));mutate(doc);assert.throws(()=>store.commit(deserialize(JSON.stringify(doc))));assert.deepEqual(store.getSnapshot().committed,c);}
});
