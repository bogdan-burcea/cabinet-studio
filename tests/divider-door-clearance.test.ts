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
