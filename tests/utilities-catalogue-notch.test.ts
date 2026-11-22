import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateEstimate,costQuantities} from '../src/costs/estimate';
import {createCabinet} from '../src/domain/cabinet';
import {evaluate} from '../src/geometry/evaluate';
import {flattenParts} from '../src/cnc/parts';
import {planSheets} from '../src/cnc/layout';
import {setConstructionMode,defaultFrontRails} from '../src/commands/construction';
import {addDivision} from '../src/commands/interiors';
import {serialize,deserializeWithInfo} from '../src/persistence/files';
import {CabinetStore} from '../src/commands/store';

test('upper dividers reach the top and own rail notches while rails and lower openings stay unchanged',()=>{
 for(const mode of ['full','rails','open'] as const){
  let c=setConstructionMode(createCabinet(),'top',mode);c.carcass.frontRails=defaultFrontRails();c.carcass.frontRails.top={enabled:true,width:90};
  c=addDivision(c,c.compartments.id,'vertical',282).cabinet;const m=evaluate(c),p=m.panels.find(p=>p.role==='divider')!;
  assert.equal(p.center[1]+p.size[1]/2,c.envelope.height-(mode==='full'?18:0));
  const cuts=m.pockets.filter(cut=>cut.panelId===p.id&&cut.kind==='rail-notch');assert.ok(cuts.length);assert.ok(cuts.every(cut=>cut.axis===0&&cut.size[0]===p.size[0]));
  const flat=flattenParts(m).find(part=>part.id===p.id)!;assert.ok(flat.cuts.some(cut=>cut.kind==='rail-notch'));assert.equal(planSheets(flattenParts(m),{},.2).unplaced.length,0);
  const rail=m.panels.find(p=>p.role==='front-upper-rail')!;assert.equal(rail.size[1],90);
  assert.deepEqual(deserializeWithInfo(serialize(c)).cabinet,c);
  const store=new CabinetStore(createCabinet());assert.ok(store.commit(c));store.undo();assert.equal(store.getSnapshot().committed.compartments.kind,'opening');store.redo();assert.deepEqual(store.getSnapshot().committed,c);
 }
 const base=createCabinet(),split=addDivision(base,base.compartments.id,'horizontal',300).cabinet;const lower=addDivision(split,split.compartments.kind==='split'?split.compartments.children[0].id:'','vertical',282).cabinet;const m=evaluate(lower);assert.equal(m.pockets.filter(p=>p.kind==='rail-notch').length,0);
});
