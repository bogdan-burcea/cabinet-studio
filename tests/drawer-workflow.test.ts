import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addDrawerStack,setDrawerFrontHeight,setDrawerPlacement,duplicateDrawers,removeMetalDrawer,editDrawerGroup} from '../src/commands/drawers.ts';
import {drawerLengths,drawerPacks} from '../src/catalogue/drawers.ts';
import {resizeCabinet} from '../src/commands/dimensions.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {editRepairs} from '../src/commands/edit-repairs.ts';
import {flattenParts} from '../src/cnc/parts.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {drawerDisplayGeometry} from '../src/viewport/drawer-mesh.ts';
const stack=()=>{const c=createCabinet();return addDrawerStack(c,c.compartments.id,3);};
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-4,`${a} vs ${b}`);
test('drawer count fills an opening with equal physical fronts; bottom fills the remainder and 0 returns to auto',()=>{
 const created=stack(),model=evaluate(created.cabinet),drawers=model.drawers.drawers;
 assert.equal(drawers.length,3);drawers.forEach(d=>near(d.front[1],236));
 near(Math.min(...drawers.map(d=>d.parts.find(p=>p.id.endsWith('/front'))!.center[1]-d.front[1]/2)),2);
 near(Math.max(...drawers.map(d=>d.parts.find(p=>p.id.endsWith('/front'))!.center[1]+d.front[1]/2)),718);
 let c=setDrawerFrontHeight(created.cabinet,[created.featureIds[0]],200);
 c=setDrawerFrontHeight(c,[created.featureIds[1]],210);
 const edited=evaluate(c).drawers.drawers;near(edited[0].front[1],200);near(edited[1].front[1],210);near(edited[2].front[1],298);
 const zero=setDrawerFrontHeight(setDrawerFrontHeight(c,[created.featureIds[0]],0),[created.featureIds[1]],0);
 evaluate(zero).drawers.drawers.forEach(d=>near(d.front[1],236));
 const grown=evaluate(resizeCabinet(zero,'height',900));grown.drawers.drawers.forEach(d=>near(d.front[1],296));
 const bottom=setDrawerFrontHeight(c,[created.featureIds[2]],200);assert.deepEqual(bottom,c);
 assert.throws(()=>evaluate(setDrawerFrontHeight(c,[created.featureIds[0]],650)),/space|allocate/);
});
test('stack native intent, undo, duplication and removal preserve identities and recalculate the fill',()=>{
 const created=stack(),store=new CabinetStore(createCabinet());assert.ok(store.commit(created.cabinet));
 const saved=deserialize(serialize(created.cabinet));assert.deepEqual(saved,created.cabinet);
 const copy=duplicateDrawers(saved,[created.featureIds[0]]);assert.ok(store.commit(copy.cabinet));
 assert.equal(evaluate(copy.cabinet).drawers.drawers.length,4);evaluate(copy.cabinet).drawers.drawers.forEach(d=>near(d.front[1],176));
 store.undo();assert.deepEqual(store.getSnapshot().committed,created.cabinet);store.redo();assert.deepEqual(store.getSnapshot().committed,copy.cabinet);
 const removed=removeMetalDrawer(copy.cabinet,copy.featureIds[0]);assert.equal(removed.drawers!.length,3);assert.deepEqual(removed.drawers!.map(d=>d.id),created.featureIds);
 assert.ok(created.cabinet.drawers!.every((d,i)=>d.stack!.order===i));
 const legacy=createCabinet(),doc={format:'cabinet-studio',schemaVersion:34,evaluatorRevision:'assembly-hardware-34',cabinet:legacy};assert.deepEqual(deserializeWithInfo(JSON.stringify(doc)),{cabinet:legacy,migrated:true});
 for(const stack of [null,{groupId:'test',order:0,height:-1},{...saved.drawers![0].stack!,extra:true}]){const malformed=JSON.parse(serialize(saved));malformed.cabinet.drawers[0].stack=stack;assert.throws(()=>deserialize(JSON.stringify(malformed)));}
});
test('all catalogue lengths have matched packs, depth repairs offer shorter rails, and overlay gets editable optimum overlaps',()=>{
 assert.deepEqual(drawerLengths,[270,300,350,400,450,500,550,600,650]);
 const created=stack(),ids=created.featureIds;
 const tooLong=editDrawerGroup(created.cabinet,ids,{pack:{id:'blum-antaro-m-650-blumotion-sw',revision:'catalogue-2024-1'}});
 const repairs=editRepairs(tooLong,created.cabinet);assert.ok(repairs.some(r=>/rails to fit/.test(r.label)));assert.ok(repairs.some(r=>/depth/.test(r.label)));repairs.forEach(r=>assert.doesNotThrow(()=>evaluate(r.cabinet)));
 const inset=setDrawerPlacement(created.cabinet,ids,'inset');assert.ok(evaluate(inset));
 const overlay=setDrawerPlacement(inset,ids,'overlay');assert.equal(overlay.drawers![0].front!.left,18);assert.equal(overlay.drawers![0].front!.top,18);assert.equal(overlay.drawers!.at(-1)!.front!.bottom,18);
 const manual={...overlay,drawers:overlay.drawers!.map((d,i)=>i?d:{...d,front:{...d.front!,left:10}})};assert.equal(evaluate(manual).drawers.drawers[0].front[0],588);
});
test('front, back and bottom pilots are included in machining previews and all configured rail meshes have correct lengths',()=>{
 for(const pack of drawerPacks.filter(p=>p.family==='antaro')){
  const base=createCabinet(),c={...base,envelope:{...base.envelope,depth:pack.nominalLength+9}};
  const made=addDrawerStack(c,c.compartments.id,3,{id:pack.id,revision:pack.revision}),model=evaluate(made.cabinet);
  const boards=flattenParts(model).filter(p=>p.id.startsWith(made.featureIds[0]+'/'));
  assert.equal(boards.length,3);assert.ok(boards.every(p=>p.holes.length>=4&&p.holes.every(b=>b.depth<p.thickness)));
  const back=boards.find(p=>p.id.endsWith('/back'))!;assert.equal(back.holes.length,pack.sideHeight>100?6:4);
  for(const part of model.drawers.drawers[0].parts.filter(p=>p.id.includes('/runner-'))){const g=drawerDisplayGeometry(part);g.computeBoundingBox();near(g.boundingBox!.max.z-g.boundingBox!.min.z,pack.nominalLength-2.8);g.dispose();}
 }
});

test('stack duplication and removing a boundary drawer keep edited outer overlaps',()=>{
 const created=stack(),c={...created.cabinet,drawers:created.cabinet.drawers!.map((d,i)=>i===0?{...d,front:{...d.front!,top:10}}:d)};
 const copy=duplicateDrawers(c,[created.featureIds[0]]);assert.equal(evaluate(copy.cabinet).drawers.drawers.find(d=>d.intent.stack!.order===0)!.intent.front!.top,10);
 const removed=removeMetalDrawer(c,created.featureIds[0]);assert.equal(evaluate(removed).drawers.drawers.find(d=>d.intent.stack!.order===0)!.intent.front!.top,10);
});
