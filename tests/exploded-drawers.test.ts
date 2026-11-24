import {changeSimpleShelfKind} from '../src/commands/adjustable';
import {removalPlan} from '../src/commands/removal';
import {CabinetStore} from '../src/commands/store';
import {addDivision} from '../src/commands/interiors';
import {addSimpleDoors} from '../src/commands/simple-doors';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deserializeWithInfo,serialize} from '../src/persistence/files';
import {evaluate} from '../src/geometry/evaluate';
import {explodedCabinetLayout} from '../src/viewport/display';
import {addDrawerStack} from '../src/commands/drawers';
import {createCabinet} from '../src/domain/cabinet';
const fixture=()=>deserializeWithInfo(fs.readFileSync(new URL('./fixtures/exploded-drawer-cabinet.json',import.meta.url),'utf8')).cabinet;

test('supplied mixed door/drawer cabinet explodes all boards without collisions and carries hardware with its owner',()=>{
 const c=fixture(),before=serialize(c),m=evaluate(c),offsets=explodedCabinetLayout(m,80),d=m.drawers.drawers[0];
 const boards=[...m.panels,...m.drawers.drawers.flatMap(d=>d.parts.filter(p=>p.material!=='steel'))];
 for(const p of boards)assert.ok(offsets.has(p.id));
 for(let i=0;i<boards.length;i++)for(let j=i+1;j<boards.length;j++){
  const a=boards[i],b=boards[j],oa=offsets.get(a.id)!,ob=offsets.get(b.id)!;
  assert.ok(![0,1,2].every(k=>Math.min(a.center[k]+oa[k]+a.size[k]/2,b.center[k]+ob[k]+b.size[k]/2)-Math.max(a.center[k]+oa[k]-a.size[k]/2,b.center[k]+ob[k]-b.size[k]/2)>.001),`${a.id} overlaps ${b.id}`);
 }
 assert.notDeepEqual(offsets.get(d.id+'/front'),offsets.get(d.id+'/bottom'));
 assert.notDeepEqual(offsets.get(d.id+'/back'),offsets.get(d.id+'/bottom'));
 for(const p of d.parts.filter(p=>p.id.includes('/handle/')||p.id.includes('/front-fixing-')))assert.deepEqual(offsets.get(p.id),offsets.get(d.id+'/front'));
 for(const side of ['left','right'])assert.deepEqual(offsets.get(d.id+'/runner-'+side),offsets.get(c.id+'/panel/'+side));
 assert.equal(serialize(c),before);
 for(const offset of explodedCabinetLayout(m,0).values())assert.deepEqual(offset,[0,0,0]);
});
test('multiple drawers retain separate board positions independent of source order',()=>{
 const c=createCabinet(),m=evaluate(addDrawerStack(c,c.compartments.id,3).cabinet),a=explodedCabinetLayout(m,80),b=explodedCabinetLayout({...m,drawers:{...m.drawers,drawers:[...m.drawers.drawers].reverse()}},80);
 for(const d of m.drawers.drawers)for(const part of d.parts){assert.deepEqual(a.get(part.id),b.get(part.id));assert.ok(a.get(part.id));}
});

test('removing the supplied middle divider detaches the meeting edges and preserves both side-hinged doors',()=>{
 const c=fixture(),before=evaluate(c),divider=before.divisions.find(d=>d.axis==='vertical')!,planned=removalPlan(c,[divider.id]),after=evaluate(planned.cabinet),store=new CabinetStore(c);
 assert.equal(after.fronts.doors.length,2);assert.ok(c.fronts.every(d=>!planned.connected.includes(d.id)));
 assert.deepEqual(after.fronts.doors,before.fronts.doors);
 assert.deepEqual(planned.cabinet.fronts.map(d=>d.handle),c.fronts.map(d=>d.handle));
 assert.ok(planned.cabinet.fronts.every(d=>!Object.values(d.boundaryLinks??{}).includes(divider.id)));
 assert.ok(store.commit(planned.cabinet));store.undo();assert.deepEqual(store.getSnapshot().committed,c);
});
test('doors genuinely hinged to a removed divider remain explicit connected removals',()=>{
 const base=createCabinet(),split=addDivision(base,base.compartments.id,'vertical',282),opening=evaluate(split.cabinet).openings.sort((a,b)=>a.origin[0]-b.origin[0])[0],added=addSimpleDoors(split.cabinet,'single',[opening.id]);
 const id=added.featureIds[0],c={...added.cabinet,fronts:added.cabinet.fronts.map(d=>({...d,handing:'right' as const}))};evaluate(c);
 const planned=removalPlan(c,[split.featureId]);assert.ok(planned.connected.includes(id));assert.equal(planned.cabinet.fronts.length,0);assert.doesNotThrow(()=>evaluate(planned.cabinet));
});

test('converting the remaining fixed shelf keeps the existing adjustable shelf and its world hole heights after divider removal',()=>{
 const original=fixture(),divider=evaluate(original).divisions.find(d=>d.axis==='vertical')!,c=removalPlan(original,[divider.id]).cabinet,before=evaluate(c),target=before.divisions.find(d=>d.axis==='horizontal'&&d.origin[1]>300)!;
 const converted=changeSimpleShelfKind(c,target.id,'adjustable'),after=evaluate(converted),store=new CabinetStore(c);
 assert.ok(after.adjustable.shelves.some(s=>s.id===target.id));assert.equal(after.adjustable.shelves.length,before.adjustable.shelves.length+1);
 for(const shelf of before.adjustable.shelves){const kept=after.adjustable.shelves.find(s=>s.id===shelf.id)!;assert.deepEqual(kept.origin,shelf.origin);assert.deepEqual(kept.size,shelf.size);}
 for(const hole of before.drilling.filter(h=>h.kind==='shelf-support')){const matched=after.drilling.find(h=>h.id===hole.id);assert.ok(matched);assert.deepEqual(matched.point,hole.point);}
 assert.deepEqual(after.fronts.doors,before.fronts.doors);assert.deepEqual(after.drawers,before.drawers);
 assert.ok(store.commit(converted));store.undo();assert.deepEqual(store.getSnapshot().committed,c);
});

test('converting back to fixed keeps sibling shelves, drilling, doors and drawer geometry and is reversible',()=>{
 const original=fixture(),divider=evaluate(original).divisions.find(d=>d.axis==='vertical')!,removed=removalPlan(original,[divider.id]).cabinet,target=evaluate(removed).divisions.find(d=>d.axis==='horizontal'&&d.origin[1]>300)!,c=changeSimpleShelfKind(removed,target.id,'adjustable'),before=evaluate(c);
 const fixed=changeSimpleShelfKind(c,target.id,'fixed'),after=evaluate(fixed),store=new CabinetStore(c);
 assert.equal(after.divisions.find(d=>d.id===target.id)!.origin[1],before.adjustable.shelves.find(s=>s.id===target.id)!.origin[1]);
 for(const shelf of before.adjustable.shelves.filter(s=>s.id!==target.id)){const kept=after.adjustable.shelves.find(s=>s.id===shelf.id)!;assert.deepEqual(kept.origin,shelf.origin);assert.deepEqual(kept.size,shelf.size);}
 const otherIds=new Set(before.adjustable.shelves.filter(s=>s.id!==target.id).map(s=>s.id));
 for(const hole of before.drilling.filter(h=>h.kind==='shelf-support'&&[...otherIds].some(id=>h.id.includes(id)))){const matched=after.drilling.find(h=>h.id===hole.id);assert.ok(matched);assert.deepEqual(matched.point,hole.point);}
 assert.deepEqual(after.fronts.doors,before.fronts.doors);assert.deepEqual(after.drawers,before.drawers);
 assert.deepEqual(evaluate(deserializeWithInfo(serialize(fixed)).cabinet),after);
 assert.ok(store.commit(fixed));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,fixed);
});

test('either shelf can be converted repeatedly and deleted without cascading into the other adjustable shelf',()=>{
 const original=fixture(),divider=evaluate(original).divisions.find(d=>d.axis==='vertical')!,removed=removalPlan(original,[divider.id]).cabinet,target=evaluate(removed).divisions.find(d=>d.axis==='horizontal'&&d.origin[1]>300)!,floating=changeSimpleShelfKind(removed,target.id,'adjustable');
 const shelfIds=floating.contents.map(s=>s.id);
 for(const targetId of shelfIds){
  let c=floating;
  for(let cycle=0;cycle<2;cycle++){
   const before=evaluate(c),fixed=changeSimpleShelfKind(c,targetId,'fixed'),fixedModel=evaluate(fixed),planned=removalPlan(fixed,[targetId]),after=evaluate(planned.cabinet),store=new CabinetStore(fixed);
   const survivors=shelfIds.filter(id=>id!==targetId);
   assert.ok(survivors.every(id=>!planned.connected.includes(id)));assert.equal(after.adjustable.shelves.length,survivors.length);
   for(const id of survivors){const old=before.adjustable.shelves.find(s=>s.id===id)!,kept=after.adjustable.shelves.find(s=>s.id===id)!;assert.deepEqual(kept.origin,old.origin);assert.deepEqual(kept.size,old.size);
    const holes=fixedModel.drilling.filter(h=>h.kind==='shelf-support'&&h.group===id);assert.ok(holes.length>0);
    for(const hole of holes){const matched=after.drilling.find(h=>h.id===hole.id);assert.ok(matched);assert.deepEqual(matched.point,hole.point);}
   }
   assert.deepEqual(after.fronts.doors,before.fronts.doors);assert.deepEqual(after.drawers,before.drawers);
   assert.deepEqual(evaluate(deserializeWithInfo(serialize(planned.cabinet)).cabinet),after);
   assert.ok(store.commit(planned.cabinet));store.undo();assert.deepEqual(store.getSnapshot().committed,fixed);store.redo();assert.deepEqual(store.getSnapshot().committed,planned.cabinet);
   c=changeSimpleShelfKind(fixed,targetId,'adjustable');
   assert.equal(c.contents.length,floating.contents.length);
  }
 }
});

test('pantry drawers beside close fixed shelves stay in their column with aligned backs and symmetric sides',()=>{
 const c=deserializeWithInfo(fs.readFileSync(new URL('./fixtures/pantry-inset-inner-drawers.json',import.meta.url),'utf8')).cabinet,before=serialize(c),m=evaluate(c),offsets=explodedCabinetLayout(m,80);
 const left=offsets.get(c.id+'/panel/left')!,right=offsets.get(c.id+'/panel/right')!;assert.equal(left[0],-80);assert.equal(right[0],80);
 for(const drawer of m.drawers.drawers){const bottom=offsets.get(drawer.id+'/bottom')!,back=offsets.get(drawer.id+'/back')!,front=offsets.get(drawer.id+'/front')!;
 assert.equal(bottom[0],0,'drawer must not jump sideways to clear an adjacent shelf');assert.deepEqual(back.slice(0,2),bottom.slice(0,2));assert.deepEqual(front.slice(0,2),bottom.slice(0,2));
 const l=offsets.get(drawer.id+'/side-left')!,r=offsets.get(drawer.id+'/side-right')!;assert.equal(l[0],-r[0]);assert.equal(l[1],bottom[1]);assert.equal(r[1],bottom[1]);
 for(const side of ['left','right']){assert.deepEqual(offsets.get(drawer.id+'/back-fixing-'+side),back);assert.deepEqual(offsets.get(drawer.id+'/front-fixing-'+side),front);assert.deepEqual(offsets.get(drawer.id+'/runner-'+side),offsets.get(c.id+'/panel/'+side));}
 }
 const pieces=[...m.panels,...m.drawers.drawers.flatMap(d=>d.parts.filter(p=>p.material!=='steel'||p.id.endsWith('/front')))];
 for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){const a=pieces[i],b=pieces[j],oa=offsets.get(a.id)!,ob=offsets.get(b.id)!;assert.ok(!a.size.every((n,k)=>Math.min(a.center[k]+oa[k]+n/2,b.center[k]+ob[k]+b.size[k]/2)-Math.max(a.center[k]+oa[k]-n/2,b.center[k]+ob[k]-b.size[k]/2)>.001),`${a.label} / ${b.label}`);}
 const reversed=explodedCabinetLayout({...m,drawers:{...m.drawers,drawers:[...m.drawers.drawers].reverse()}},80);for(const [id,offset] of offsets)assert.deepEqual(reversed.get(id),offset);
 for(const offset of explodedCabinetLayout(m,0).values())assert.deepEqual(offset,[0,0,0]);assert.equal(serialize(c),before);
});
