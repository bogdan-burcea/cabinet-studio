import {drawerOpeningEditIssue} from '../src/commands/drawer-opening-preflight';
import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {addSimpleDoors} from '../src/commands/simple-doors';
import {defaultHinge,blumThin110,hingeProfiles} from '../src/catalogue/hinges';
import {evaluate} from '../src/geometry/evaluate';
import {serialize,deserialize} from '../src/persistence/files';
import {CabinetStore} from '../src/commands/store';
import {addDrawerStack} from '../src/commands/drawers';
import {antaroPin} from '../src/catalogue/drawers';
import {safeDoorAngles,safeInnerDrawerExtensions,doorOpeningPose} from '../src/rules/door-motion';
import {hingePlateRepairs} from '../src/commands/clearance-repairs';
function fitted(thickness=12,placement:'inset'|'overlay'='inset',id:Parameters<typeof defaultHinge>[0]=blumThin110.id){
 const b=addSimpleDoors(createCabinet(),'pair').cabinet;
 return {...b,fronts:b.fronts.map(d=>({...d,placement,material:{...structuredClone(b.materials.carcass),stock:{id:`generic-panel-${thickness}`,revision:'1'}},hinge:{...defaultHinge(id),cupDistance:placement==='inset'?(thickness===14?28:25):43}}))};
}
test('EXPANDO T uses two 10×6 anchor bores, no 35 mm cups, correct side plate and native fitting identity',()=>{
 assert.ok(Object.values(hingeProfiles).every(profile=>profile.softClose),'Only soft-close hinge profiles are offered');
 for(const variant of [blumThin110])for(const thickness of [8,10,12,13,14]){
  const c=fitted(thickness,'inset',variant.id),e=evaluate(c);assert.deepEqual(deserialize(serialize(c)),c);
  for(const h of e.doorHardware.hinges){
   assert.equal(h.article,variant.inset);assert.equal(h.softClose,variant.softClose);assert.equal(h.plate,thickness===14?'173H7130':'173H7100');assert.equal(h.maxAngle,110);
   const holes=e.drilling.filter(b=>b.id.startsWith(h.id+'/expando/'));assert.equal(holes.length,2);assert.deepEqual(holes.map(b=>[b.diameter,b.depth,b.point[1]-h.y]),[[10,6,-16],[10,6,16]]);
   assert.ok(!e.drilling.some(b=>b.id===h.id+'/cup'));const front=e.fronts.doors.find(d=>d.id===h.ownerId)!;assert.equal(holes[0].point[2],front.center[2]-thickness/2);
   const plate=e.drilling.filter(b=>b.id.startsWith(h.id+'/plate-screw/'));assert.equal(plate.length,2);assert.ok(plate.every(b=>b.point[2]===c.envelope.depth-37-thickness-1.5));
  }
 }
});
test('thin hinge rejects incompatible 18 mm fronts and invalid fixing depths/distances without replacing the cabinet',()=>{
 const c=fitted(),base={...c,fronts:c.fronts.map(d=>({...d,material:{...d.material,stock:{id:'generic-panel-18',revision:'1'}},hinge:defaultHinge()}))};
 for(const t of [7,15,18])assert.throws(()=>evaluate(fitted(t)),/8–14/);
 for(const distance of [3,23.4,35,46.1,NaN])assert.throws(()=>evaluate({...c,fronts:c.fronts.map(d=>({...d,hinge:{...d.hinge,cupDistance:distance}}))}));
 const store=new CabinetStore(base);assert.equal(store.commit(fitted(18)),false);assert.deepEqual(store.getSnapshot().committed,base);assert.ok(store.commit(c));store.undo();assert.deepEqual(store.getSnapshot().committed,base);store.redo();assert.deepEqual(store.getSnapshot().committed,c);
});
test('thin inset hinge keeps the drawer opening clear while genuine obstructions and mounting conflicts remain checked',()=>{
 const c=fitted(),ids=c.fronts.map(d=>d.id),drawers=addDrawerStack(c,c.compartments.id,3,antaroPin,false,true).cabinet;
 const repairs=hingePlateRepairs(drawers),next=repairs[0]?.cabinet??drawers,e=evaluate(next),opened=safeDoorAngles(e,{},ids,110);assert.equal(opened.blocked,false);
 const extended=safeInnerDrawerExtensions(e,{}, {...opened.angles,...Object.fromEntries(next.drawers!.map(d=>[d.id,100]))});assert.equal(extended.blocked,false);assert.ok(next.fronts.every(d=>d.placement==='inset'));assert.equal(drawerOpeningEditIssue(next,{...next,drawers:[]}),null);
 const door=e.fronts.doors[0],pose=doorOpeningPose(e,door,110),x=door.center[0]-pose.pivot[0],z=door.center[2]-pose.pivot[2],center=pose.origin[0]+Math.cos(pose.angle)*x+Math.sin(pose.angle)*z;
 const protrusion=center-18+Math.abs(Math.cos(pose.angle))*door.size[0]/2+Math.abs(Math.sin(pose.angle))*door.size[2]/2;assert.ok(Math.abs(protrusion-1.5)<1e-6);
 const closed=safeInnerDrawerExtensions(e,{},Object.fromEntries(next.drawers!.map(d=>[d.id,100])));assert.ok(closed.blocked);
 const obstruction={...e.panels[0],id:'independent-obstruction',size:[1000,1000,1000] as [number,number,number],center:[300,360,900] as [number,number,number]};assert.ok(safeInnerDrawerExtensions({...e,panels:[...e.panels,obstruction]}, {},extended.angles).blocked);
 assert.deepEqual(next.drawers,drawers.drawers);assert.deepEqual(next.fronts.map(d=>d.id),ids);assert.deepEqual(deserialize(serialize(next)),next);
});
