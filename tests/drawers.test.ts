import {drawerPacks} from '../src/catalogue/drawers.ts';
import {drawerDisplayGeometry} from '../src/viewport/drawer-mesh.ts';
import {editRepairs} from '../src/commands/edit-repairs.ts';
import {duplicateDrawers,editDrawerGroup} from '../src/commands/drawers.ts';
import {flattenParts} from '../src/cnc/parts.ts';
import {sheetForExport,cabinetForExport} from '../src/cnc/sheet-export.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
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
test('depth reduction automatically switches to the longest fitting rail and preserves undo state',()=>{
 for(const rails of [false,true]){let c=createCabinet();if(rails)c={...c,carcass:{...c.carcass,back:{...c.carcass.back,mode:'rails'}}};c=resizeCabinet(c,'depth',503+(rails?18:6));const result=addMetalDrawer(c,c.compartments.id),store=new CabinetStore(result.cabinet);assert.ok(store.commit(resizeCabinet(result.cabinet,'depth',c.envelope.depth-.1)));assert.match(store.getSnapshot().committed.drawers![0].pack.id,/-450-/);store.undo();assert.deepEqual(store.getSnapshot().committed,result.cabinet);}
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
 const c=fitted().cabinet,original=serialize(c);assert.equal(JSON.parse(original).schemaVersion,56);assert.equal(AUTOSAVE_KEY,'cabinet-studio.autosave.v56');assert.ok(PREVIOUS_AUTOSAVE_KEYS.includes('cabinet-studio.autosave.v11'));
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


test('inset fronts reserve depth, move drawer bodies back and preserve front settings through Undo and native files',()=>{
 const initial=fitted(),base=evaluate(initial.cabinet).drawers.drawers[0];
 const front={placement:'inset' as const,gap:2,clearance:3,left:0,right:0,top:0,bottom:0};
 const inset=updateMetalDrawer(initial.cabinet,initial.featureId,{front});
 const evaluated=evaluate(inset),drawer=evaluated.drawers.drawers[0];
 const panel=drawer.parts.find(p=>p.id.endsWith('/front'))!;
 assert.equal(panel.center[2]+panel.size[2]/2,inset.envelope.depth-3);
 assert.equal(drawer.parts.find(p=>p.id.endsWith('/bottom'))!.center[2],base.parts.find(p=>p.id.endsWith('/bottom'))!.center[2]-21);
 const store=new CabinetStore(initial.cabinet);assert.ok(store.commit(inset));store.undo();assert.deepEqual(store.getSnapshot().committed,initial.cabinet);
 assert.deepEqual(readSimpleCabinet(serialize(inset)),inset);
 assert.throws(()=>updateMetalDrawer(inset,initial.featureId,{front:{...front,gap:NaN}}),/front gaps/);
 assert.match(resizeCabinet(inset,'depth',524).drawers![0].pack.id,/-450-/);
 const parts=flattenParts(evaluated).filter(p=>p.id.startsWith(initial.featureId+'/'));
 assert.equal(parts.length,3);assert.equal(parts.filter(p=>p.thickness===16).length,2);
 assert.ok(cabinetForExport(evaluated,'Test').parts.length===evaluated.panels.length+3);
});

test('overlay front dimensions follow independent overlaps and reject collisions between adjacent fronts',()=>{
 const first=fitted(),second=addMetalDrawer(first.cabinet,first.cabinet.compartments.id);
 const settings={placement:'overlay' as const,gap:2,clearance:2,left:16,right:16,top:0,bottom:0};
 const cabinet=updateMetalDrawer(second.cabinet,first.featureId,{front:settings});
 assert.equal(evaluate(cabinet).drawers.drawers[0].front[0],592);
 assert.throws(()=>updateMetalDrawer(cabinet,first.featureId,{front:{...settings,top:10}}),/fronts overlap/);
 assert.throws(()=>updateMetalDrawer(cabinet,first.featureId,{front:{...settings,left:50}}),/beyond the cabinet/);
 const doc=JSON.parse(serialize(cabinet));doc.cabinet.drawers[0].front.extra=true;assert.throws(()=>readSimpleCabinet(JSON.stringify(doc)));
});


test('drawer duplication and shared edits preserve group spacing, identities and reversible native state',()=>{
 const first=fitted(),second=duplicateDrawers(first.cabinet,[first.featureId]),ids=[first.featureId,second.featureIds[0]];
 assert.equal(evaluate(second.cabinet).drawers.drawers[1].intent.offset,160);
 const moved=editDrawerGroup(second.cabinet,ids,{offset:20,frontHeight:170});
 assert.deepEqual(moved.drawers!.map(d=>d.offset),[20,190]);
 const store=new CabinetStore(second.cabinet);
 assert.ok(store.commit(moved));store.undo();assert.deepEqual(store.getSnapshot().committed,second.cabinet);
 assert.deepEqual(readSimpleCabinet(serialize(moved)),moved);
 const copied=duplicateDrawers(second.cabinet,ids);
 assert.equal(copied.cabinet.drawers!.length,4);
 assert.equal(new Set(copied.cabinet.drawers!.map(d=>d.id)).size,4);
 assert.throws(()=>duplicateDrawers(copied.cabinet,copied.featureIds),/no free space/);
});

test('height edits shift every drawer above, including unselected drawers, and offer clear shelf repairs',()=>{
 const base=fitted(),second=addMetalDrawer(base.cabinet,base.cabinet.compartments.id);
 const changed=editDrawerGroup(second.cabinet,[base.featureId],{frontHeight:200});
 assert.deepEqual(changed.drawers!.map(d=>d.offset),[0,200]);
 const shelf=addDivision(second.cabinet,second.cabinet.compartments.id,'horizontal',342);
 const corrections=editRepairs(shelf.cabinet,second.cabinet);
 assert.ok(corrections.length);
 for(const option of corrections){assert.doesNotThrow(()=>evaluate(option.cabinet));if(!option.label.startsWith('Remove '))assert.deepEqual(option.cabinet.drawers!.map(d=>d.id),second.cabinet.drawers!.map(d=>d.id));}
 const fittedShelf=corrections[0].cabinet;
 const tooTall=editDrawerGroup(fittedShelf,[base.featureId],{frontHeight:250});
 const repairs=editRepairs(tooTall,fittedShelf);
 assert.ok(repairs.length);
 repairs.forEach(option=>assert.doesNotThrow(()=>evaluate(option.cabinet)));
});


test('reference-based wall and runner meshes follow selectable M/K height and 500/550 length',()=>{
 for(const pack of drawerPacks){
  const base=createCabinet(),c={...base,envelope:{...base.envelope,depth:720}};
  const created=addMetalDrawer(c,c.compartments.id,{id:pack.id,revision:pack.revision});
  const drawer=evaluate(created.cabinet).drawers.drawers[0];
  assert.equal(drawer.bottom[2],pack.nominalLength-24);
  assert.equal(drawer.back[1],pack.backHeight);
  for(const part of drawer.parts.filter(p=>p.id.includes('/side-')||p.id.includes('/runner-'))){
   const geometry=drawerDisplayGeometry(part);
   try{
    geometry.computeBoundingBox();
    assert.ok(geometry.getAttribute('position').count>100);
    const size=geometry.boundingBox!;
    part.size.forEach((n,i)=>assert.ok(Math.abs((size.max.getComponent(i)-size.min.getComponent(i))-n)<.01));
   }finally{geometry.dispose();}
  }
  assert.deepEqual(readSimpleCabinet(serialize(created.cabinet)),created.cabinet);
 }
});

test('K550 assembly preserves full-size runner section and original board datums, with side-panel fixing bores',()=>{
 const base=createCabinet(),pack=drawerPacks.find(p=>p.id==='blum-antaro-k-550-blumotion-sw')!;
 const c={...base,envelope:{...base.envelope,depth:720}};
 const created=addMetalDrawer(c,c.compartments.id,{id:pack.id,revision:pack.revision});
 const model=evaluate(created.cabinet),drawer=model.drawers.drawers[0];
 const part=(key:string)=>drawer.parts.find(p=>p.id===drawer.id+'/'+key)!;
 const origin=(key:string)=>part(key).center.map((n,i)=>n-part(key).size[i]/2);
 const [x,low]=drawer.allocation.origin,front=drawer.allocation.origin[2]+pack.minimumDepth;
 assert.deepEqual(part('runner-left').size,[32.605,43.6,547.2]);
 assert.ok(Math.abs(origin('runner-left')[0]-x)<1e-6);
 assert.ok(Math.abs(origin('runner-left')[1]-low-.2)<1e-6);
 assert.ok(Math.abs(origin('runner-left')[2]-(front-551.2))<1e-6);
 assert.equal(origin('bottom')[1],low+9);
 assert.equal(origin('bottom')[2],front-526);
 assert.equal(origin('back')[2],front-542);
 assert.ok(Math.abs(origin('side-left')[0]-x-5.39946)<1e-6);
 const pilots=model.drilling.filter(b=>b.id.startsWith(drawer.id+'/runner-'));
 assert.equal(pilots.length,4);
 assert.deepEqual([...new Set(pilots.map(b=>front-b.point[2]))],[37,261]);
 assert.ok(pilots.every(b=>b.point[1]===low+33&&b.diameter===2.5&&b.depth===10));
 assert.equal(new Set(pilots.map(b=>b.panelId)).size,2);
});
