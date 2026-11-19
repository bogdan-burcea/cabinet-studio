import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addDivision,setDivisionSetback,findDivision,moveDivision} from '../src/commands/interiors.ts';
import {addSimpleDoors,editSimpleDoors} from '../src/commands/simple-doors.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {setStockThickness} from '../src/commands/stock.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserialize} from '../src/persistence/files.ts';
import {defaultHinge} from '../src/catalogue/hinges.ts';
function divided(){const base=createCabinet(),split=addDivision(base,base.compartments.id,'vertical',282),ids=evaluate(split.cabinet).openings.map(o=>o.id),doors=addSimpleDoors(split.cabinet,'single',ids);return {id:split.featureId,doors,inset:editSimpleDoors(doors.cabinet,doors.featureIds,{placement:'inset'})};}
test('zero-inset divider protrudes between inset doors; leaves stop at its faces and preserve saved intent',()=>{
 const {id,doors,inset}=divided(),setback=setDivisionSetback(inset,id,30),zero=setDivisionSetback(setback,id,0),store=new CabinetStore(setback);assert.ok(store.commit(zero));
 for(const c of [zero,moveDivision(zero,id,320),...([16,19,24].map(t=>setStockThickness(zero,t)))]){
  const e=evaluate(c),p=e.divisions[0],[left,right]=e.fronts.doors,a=left.center[0]+left.size[0]/2,b=right.center[0]-right.size[0]/2;assert.equal(findDivision(c.compartments,id)!.frontSetback,0);assert.equal(p.origin[2]+p.size[2],c.envelope.origin[2]+c.envelope.depth);assert.ok(p.origin[2]+p.size[2]>left.center[2]+left.size[2]/2);assert.ok(a<p.origin[0]);assert.ok(b>p.origin[0]+p.size[0]);assert.ok(Math.abs(b-a-p.size[0]-c.fronts[0].reveal)<1e-6);assert.deepEqual(deserialize(serialize(c)),c);
 }
 store.undo();assert.deepEqual(store.getSnapshot().committed,setback);store.redo();assert.deepEqual(store.getSnapshot().committed,zero);assert.deepEqual(zero.fronts.map(d=>d.id),doors.featureIds);
});
test('a divider explicitly behind the doors can be covered; hinge application follows the physical support face',()=>{
 const {id,inset}=divided();for(const setback of [0,30]){const c=setDivisionSetback(inset,id,setback),withHinges={...c,fronts:c.fronts.map(d=>({...d,hinge:defaultHinge()}))},e=evaluate(withHinges),p=e.divisions[0],[a,b]=e.fronts.doors,gap=b.center[0]-b.size[0]/2-a.center[0]-a.size[0]/2;assert.equal(gap,setback===0?p.size[0]+2:2);assert.ok(e.doorHardware.hinges.some(h=>h.supportId===id&&h.article===(setback===0?'71B3750':'71B3650')));}
});

test('a flush fixed shelf protrudes between inset doors and the door edges follow shelf movement',()=>{
 const base=createCabinet(),shelf=addDivision(base,base.compartments.id,'horizontal',342,0);
 const openings=evaluate(shelf.cabinet).openings.map(o=>o.id);
 const doors=addSimpleDoors(shelf.cabinet,'single',openings);
 const inset=editSimpleDoors(doors.cabinet,doors.featureIds,{placement:'inset'});
 const store=new CabinetStore(doors.cabinet);
 assert.ok(store.commit(inset));
 assert.deepEqual(inset.compartments,shelf.cabinet.compartments);
 const flush=evaluate(inset).divisions[0];
 assert.equal(flush.origin[2]+flush.size[2],inset.envelope.origin[2]+inset.envelope.depth);
 const moved=moveDivision(inset,shelf.featureId,300);
 for(const candidate of [inset,moved,setDivisionSetback(moved,shelf.featureId,30)]){
  const e=evaluate(candidate),p=e.divisions[0],[lower,upper]=e.fronts.doors;
  const lowerEdge=lower.center[1]+lower.size[1]/2,upperEdge=upper.center[1]-upper.size[1]/2;
  const reveal=candidate.fronts[0].reveal;
  const clearance=p.origin[2]+p.size[2]>lower.center[2]-lower.size[2]/2;
  const boundary=p.origin[1]+p.size[1]/2,offset=clearance?p.size[1]/2:0;
  assert.ok(Math.abs(lowerEdge-(boundary-offset-reveal/2))<1e-6);
  assert.ok(Math.abs(upperEdge-(boundary+offset+reveal/2))<1e-6);
  assert.deepEqual(deserialize(serialize(candidate)),candidate);
 }
 store.undo();
 assert.deepEqual(store.getSnapshot().committed,doors.cabinet);
});
