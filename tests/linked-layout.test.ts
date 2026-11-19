import {clearInsetInteriors} from '../src/commands/corrections.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet,resize} from '../src/domain/cabinet.ts';
import {addDivision,centreDivision,findDivision,moveDivision,removeDivision} from '../src/commands/interiors.ts';
import {addDoorPair,resizeDoor,updateDoor,splitDoor} from '../src/commands/fronts.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {deserialize,deserializeWithInfo,serialize} from '../src/persistence/files.ts';
function furnished(){const c=createCabinet(),division=addDivision(c,c.compartments.id,'vertical',282);let pair=addDoorPair(division.cabinet).cabinet;pair=updateDoor(pair,pair.fronts[0].id,{handing:'right'});return {c:pair,id:division.featureId,door:pair.fronts[0].id};}
test('moving an attached divider resizes both door leaves and preserves hinge support, bands, IDs and history',()=>{
 const {c,id,door}=furnished(),store=new CabinetStore(c),before=evaluate(c),moved=moveDivision(c,id,312);assert.ok(store.commit(moved));const after=evaluate(moved);assert.equal(after.fronts.doors[0].size[0],before.fronts.doors[0].size[0]+30);assert.equal(after.fronts.doors[1].size[0],before.fronts.doors[1].size[0]-30);assert.equal(after.fronts.doors[0].id,door);assert.deepEqual(moved.banding,c.banding);store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,moved);assert.deepEqual(deserialize(serialize(moved)),moved);
});
test('editing door width moves its shared divider, changes its neighbor and stays valid for inset leaves',()=>{
 for(const inset of [false,true]){const original=furnished(),c=inset?clearInsetInteriors(updateDoor(original.c,original.door,{placement:'inset'})).cabinet:original.c,before=evaluate(c),width=before.fronts.doors[0].size[0];const next=resizeDoor(c,original.door,'width',width+20),e=evaluate(next);assert.equal(e.divisions[0].position,before.divisions[0].position+20);assert.equal(e.fronts.doors[0].size[0],width+20);assert.equal(e.fronts.doors[1].size[0],before.fronts.doors[1].size[0]-20);assert.deepEqual(next.installation,c.installation);assert.deepEqual(next.materials,c.materials);}
});
test('centre is a persistent constraint across body and parent resizing and linked door edits can release it',()=>{
 const {c,id,door}=furnished(),centred=centreDivision(c,id),wide=resize(centred,'width',800),e=evaluate(wide);assert.equal(findDivision(wide.compartments,id)!.anchor,'centre');assert.equal(e.divisions[0].before,e.divisions[0].after);assert.equal(e.fronts.doors[0].size[0],e.fronts.doors[1].size[0]);assert.deepEqual(deserialize(serialize(wide)),wide);
 const manual=resizeDoor(wide,door,'width',e.fronts.doors[0].size[0]+20);assert.equal(findDivision(manual.compartments,id)!.anchor,undefined);assert.equal(evaluate(manual).divisions[0].position,e.divisions[0].position+20);
 const body=createCabinet(),parent=addDivision(body,body.compartments.id,'vertical',282),child=addDivision(parent.cabinet,evaluate(parent.cabinet).openings[0].id,'horizontal',342),nested=centreDivision(child.cabinet,child.featureId),taller=resize(nested,'height',1000),shelf=evaluate(taller).divisions.find(d=>d.id===child.featureId)!;assert.equal(shelf.before,shelf.after);
});
test('old absolute divisions remain absolute and old matching doors gain links before moving',()=>{
 const {c,id}=furnished(),legacy={...c,fronts:c.fronts.map(({boundaryLinks,...door})=>door)};const text=JSON.stringify({format:'cabinet-studio',schemaVersion:10,evaluatorRevision:'doors-10',cabinet:legacy}),loaded=deserializeWithInfo(text);assert.ok(loaded.migrated);assert.deepEqual(loaded.cabinet,legacy);const moved=moveDivision(loaded.cabinet,id,300);evaluate(moved);assert.ok(moved.fronts[0].boundaryLinks?.right);assert.equal(evaluate(resize(moved,'width',800)).divisions[0].position,300);
});
test('invalid dependency edits and malformed links never replace the committed cabinet',()=>{
 const {c,id}=furnished(),store=new CabinetStore(c);assert.equal(store.commit(moveDivision(c,id,550)),false);assert.deepEqual(store.getSnapshot().committed,c);const doc=JSON.parse(serialize(centreDivision(c,id)));doc.cabinet.compartments.anchor='unknown';assert.throws(()=>deserialize(JSON.stringify(doc)));
 const link=JSON.parse(serialize(c));link.cabinet.fronts[0].boundaryLinks.right='missing';assert.throws(()=>deserialize(JSON.stringify(link)));link.cabinet.fronts[0].boundaryLinks={wrong:id};assert.throws(()=>deserialize(JSON.stringify(link)));
 const hinge=removeDivision(c,id);assert.equal(store.commit(hinge),false);
 const outer=updateDoor(c,c.fronts[0].id,{handing:'left'}),removed=removeDivision(outer,id);evaluate(removed);assert.equal(removed.fronts[0].boundaryLinks,undefined);
});
test('splitting retains outside links',()=>{
 const {c,door}=furnished(),rows=splitDoor(c,door,'horizontal').cabinet;evaluate(rows);assert.ok(rows.fronts[0].boundaryLinks?.right);assert.ok(rows.fronts[1].boundaryLinks?.right);
});
test('native files strictly validate centre constraints and link targets without overwriting old documents',()=>{
 const {c,id}=furnished(),centred=centreDivision(c,id),text=serialize(centred);
 for(const mutate of [(d:any)=>d.cabinet.compartments.anchor='random',(d:any)=>d.cabinet.fronts[0].boundaryLinks={right:'missing'},(d:any)=>d.cabinet.fronts[0].boundaryLinks={unknown:id},(d:any)=>d.cabinet.fronts[0].boundaryLinks={left:c.id}]){const doc=JSON.parse(text);mutate(doc);assert.throws(()=>deserialize(JSON.stringify(doc)));}
 const plain=createCabinet(),old=JSON.stringify({format:'cabinet-studio',schemaVersion:10,evaluatorRevision:'doors-10',cabinet:plain}),migrated=deserializeWithInfo(old);assert.ok(migrated.migrated);assert.deepEqual(migrated.cabinet,plain);assert.equal(JSON.parse(old).schemaVersion,10);
});
test('removing a free-edge divider detaches its links and preserves front sizes; hinge-bearing removal stays invalid',()=>{
 const c=createCabinet(),division=addDivision(c,c.compartments.id,'vertical',282),pair=addDoorPair(division.cabinet).cabinet,before=evaluate(pair),removed=removeDivision(pair,division.featureId);assert.deepEqual(evaluate(removed).fronts.doors,before.fronts.doors);assert.ok(removed.fronts.every(d=>!d.boundaryLinks));const bearing=updateDoor(pair,pair.fronts[0].id,{handing:'right'});assert.throws(()=>evaluate(removeDivision(bearing,division.featureId)),/hinge edge/);
});
