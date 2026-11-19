import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet,type Cabinet} from '../src/domain/cabinet.ts';
import {addMetalDrawer,updateMetalDrawer,removeMetalDrawer} from '../src/commands/drawers.ts';
import {addDivision,moveDivision} from '../src/commands/interiors.ts';
import {addDoor,addDoorPair} from '../src/commands/fronts.ts';
import {addAdjustable} from '../src/commands/adjustable.ts';
import {resizeCabinet} from '../src/commands/dimensions.ts';
import {antaroM500} from '../src/catalogue/drawers.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserialize,deserializeWithInfo,AUTOSAVE_KEY,PREVIOUS_AUTOSAVE_KEYS} from '../src/persistence/files.ts';
function fitted(){const c=createCabinet();return addMetalDrawer(c,c.compartments.id);}
test('official-drawing fixture: 600 cabinet / 18 sides / 500 NL produces 489×476×16 bottom, 477×84×16 back',()=>{
 const {cabinet,featureId}=fitted(),d=evaluate(cabinet).drawers.drawers[0];assert.deepEqual(d.bottom,[489,16,476]);assert.deepEqual(d.back,[477,84,16]);assert.deepEqual(d.front,[560,156,18]);assert.equal(d.requiredDepth,503);assert.equal(d.id,featureId);
 assert.deepEqual(antaroM500.components.map(p=>[p.article,p.quantity]),[['578.5001M',1],['378M5002SA',1],['Z30M000S.04',1],['ZSF.35A2',2]]);
 assert.equal(new Set(d.parts.map(p=>p.id)).size,d.parts.length);assert.ok(d.parts.filter(p=>p.article).every(p=>p.fidelity==='envelope'));
});
test('503 mm depth boundary works across full back and rear rails; 502.9 rejects without changing state',()=>{
 for(const rails of [false,true]){let c=createCabinet();if(rails)c={...c,carcass:{...c.carcass,back:{...c.carcass.back,mode:'rails'}}};c=resizeCabinet(c,'depth',503+(rails?18:6));const result=addMetalDrawer(c,c.compartments.id),store=new CabinetStore(result.cabinet);assert.equal(store.commit(resizeCabinet(result.cabinet,'depth',c.envelope.depth-.1)),false);assert.deepEqual(store.getSnapshot().committed,result.cabinet);}
});
test('stacking allocations preserve all existing features; overlap, NaN, undersize and missing pack revisions reject',()=>{
 const first=fitted(),second=addMetalDrawer(first.cabinet,first.cabinet.compartments.id),e=evaluate(second.cabinet);assert.equal(e.drawers.drawers[1].intent.offset,160);assert.throws(()=>updateMetalDrawer(second.cabinet,second.featureId,{offset:159.9}),/overlap/);assert.throws(()=>updateMetalDrawer(second.cabinet,second.featureId,{frontHeight:98.4}),/98.5/);assert.throws(()=>updateMetalDrawer(second.cabinet,second.featureId,{offset:NaN}));
 const corrupt=structuredClone(first.cabinet);corrupt.drawers![0].pack.revision='unknown';assert.throws(()=>evaluate(corrupt),/revision/);assert.deepEqual(first.cabinet.materials,second.cabinet.materials);assert.deepEqual(first.cabinet.installation,second.cabinet.installation);
});
test('runner mounting supports can be a full-depth divider; moving it recalculates board widths and preserves IDs',()=>{
 let c=createCabinet();c=resizeCabinet(c,'width',900);const split=addDivision(c,c.compartments.id,'vertical',432);const opening=evaluate(split.cabinet).openings[0];const fitted=addMetalDrawer(split.cabinet,opening.id),before=evaluate(fitted.cabinet).drawers.drawers[0],after=evaluate(moveDivision(fitted.cabinet,split.featureId,452)).drawers.drawers[0];assert.equal(after.bottom[0],before.bottom[0]+20);assert.equal(after.id,before.id);assert.deepEqual(after.parts.map(p=>p.id),before.parts.map(p=>p.id));
 const recessed=structuredClone(fitted.cabinet);if(recessed.compartments.kind==='split'){recessed.compartments.policyRevision='fixed-2';recessed.compartments.frontSetback=10;}assert.throws(()=>evaluate(recessed),/uninterrupted/);
});
test('existing front coverage and adjustable contents reject a drawer in their occupied allocation',()=>{
 const c=createCabinet(),pair=addDoorPair(c).cabinet;assert.throws(()=>addMetalDrawer(pair,c.compartments.id),/slab door/);
 const shelf=addAdjustable(c,c.compartments.id),withDrawer=addMetalDrawer(shelf.cabinet,c.compartments.id);assert.throws(()=>updateMetalDrawer(withDrawer.cabinet,withDrawer.featureId,{offset:300}),/adjustable shelf/);
});
test('removing or dividing a drawer opening cannot silently lose its contents',()=>{
 const {cabinet}=fitted(),candidate=addDivision(cabinet,cabinet.compartments.id,'horizontal',300).cabinet,store=new CabinetStore(cabinet);assert.equal(store.commit(candidate),false);assert.match(store.getSnapshot().error??'',/opening no longer exists/);assert.deepEqual(store.getSnapshot().committed,cabinet);
});
test('drawer addition, changes and removal remain atomic through Undo/Redo and native files',()=>{
 const c=createCabinet(),store=new CabinetStore(c),added=addMetalDrawer(c,c.compartments.id);assert.ok(store.commit(added.cabinet));const moved=updateMetalDrawer(added.cabinet,added.featureId,{offset:200,frontHeight:180});assert.ok(store.commit(moved));store.undo();assert.deepEqual(store.getSnapshot().committed,added.cabinet);store.redo();assert.deepEqual(store.getSnapshot().committed,moved);assert.deepEqual(deserialize(serialize(moved)),moved);assert.deepEqual(evaluate(deserialize(serialize(moved))),evaluate(moved));assert.ok(store.commit(removeMetalDrawer(moved,added.featureId)));store.undo();assert.deepEqual(store.getSnapshot().committed,moved);
});
test('schema 21 pins exact pack and policies; malformed, duplicate and future data fail without replacement',()=>{
 const c=fitted().cabinet,original=serialize(c);assert.equal(JSON.parse(original).schemaVersion,34);assert.equal(AUTOSAVE_KEY,'cabinet-studio.autosave.v34');assert.ok(PREVIOUS_AUTOSAVE_KEYS.includes('cabinet-studio.autosave.v11'));
 for(const change of [(d:any)=>d.cabinet.drawers.push(d.cabinet.drawers[0]),(d:any)=>d.cabinet.drawers[0].offset='0',(d:any)=>d.cabinet.drawers[0].extra=true,(d:any)=>d.cabinet.drawers[0].id=d.cabinet.compartments.id,(d:any)=>d.cabinet.drawers[0].pack.revision='99',(d:any)=>d.schemaVersion++]){const doc=JSON.parse(original);change(doc);assert.throws(()=>deserialize(JSON.stringify(doc)));}
 const old=createCabinet(),text=JSON.stringify({format:'cabinet-studio',schemaVersion:11,evaluatorRevision:'constraints-11',cabinet:old}),loaded=deserializeWithInfo(text);assert.ok(loaded.migrated);assert.deepEqual(loaded.cabinet,old);assert.deepEqual(JSON.parse(text).cabinet,old);
});

test('a drawer in one opening preserves shelves, a divider, doors, bindings, bands, feet, plinth and wall layout elsewhere',()=>{
 let c=createCabinet();c={...c,carcass:{...c.carcass,top:{...c.carcass.top,mode:'rails'},back:{...c.carcass.back,mode:'rails'}},installation:{...c.installation,type:'feet-concept',plinth:{...c.installation.plinth,enabled:true},mounting:{...c.installation.mounting,mode:'restraint-concept'}},banding:{[`${c.id}/panel/left`]:{'u-min':{id:'generic-edge-1',revision:'1'}}}};
 const split=addDivision(c,c.compartments.id,'horizontal',200);c=split.cabinet;const [low,upper]=evaluate(c).openings;
 const divided=addDivision(c,upper.id,'vertical',282);c=divided.cabinet;
 const upperLeft=evaluate(c).openings[1];c=addAdjustable(c,upperLeft.id).cabinet;c=addDoor(c,upperLeft.id).cabinet;
 const before=structuredClone(c),result=addMetalDrawer(c,low.id);assert.deepEqual({...result.cabinet,drawers:undefined},{...before,drawers:undefined});assert.equal(evaluate(result.cabinet).drawers.drawers.length,1);
});
