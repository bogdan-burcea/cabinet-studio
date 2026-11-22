import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {setConstructionMode,changeConstruction} from '../src/commands/construction';
import {setBackPanel} from '../src/commands/back-panel';
import {evaluate} from '../src/geometry/evaluate';
import {serialize,deserializeWithInfo} from '../src/persistence/files';
import {flattenParts} from '../src/cnc/parts';
import {planSheets} from '../src/cnc/layout';
import {costQuantities,calculateEstimate} from '../src/costs/estimate';
import {manualCostPreferences,decodeCostPreferences} from '../src/costs/preferences';
import {CabinetStore} from '../src/commands/store';

test('rear rails stay flush, constrain seating and migrate old projecting layouts',()=>{
 for(const mode of ['inset','applied','groove','rebate','finger'] as const){
  const c=setConstructionMode(setBackPanel(createCabinet(),{mode}),'back','rails-panel'),m=evaluate(c),back=m.panels.find(p=>p.role==='back')!;
  assert.equal(c.carcass.back.joint!.mode,'groove');assert.equal(c.carcass.back.joint!.inset,18);
  for(const rail of m.panels.filter(p=>p.role.startsWith('back-'))){assert.equal(rail.center[2]-rail.size[2]/2,0);assert.ok(rail.center[2]+rail.size[2]/2<=back.center[2]-back.size[2]/2);}
  assert.equal(planSheets(flattenParts(m),{},.2).unplaced.length,0);assert.deepEqual(deserializeWithInfo(serialize(c)).cabinet,c);
  const old=JSON.parse(serialize(c));old.schemaVersion=54;old.evaluatorRevision='outside-rails-54';old.cabinet.carcass.back.railPosition='outside';old.cabinet.carcass.back.joint.mode=mode;old.cabinet.carcass.back.joint.inset=10;
  const restored=deserializeWithInfo(JSON.stringify(old));assert.ok(restored.migrated);assert.ok(!('railPosition' in restored.cabinet.carcass.back));assert.equal(restored.cabinet.carcass.back.joint!.mode,'groove');assert.equal(restored.cabinet.carcass.back.joint!.inset,18);
  const store=new CabinetStore(createCabinet());assert.ok(store.commit(c));store.undo();store.redo();assert.deepEqual(store.getSnapshot().committed,c);
 }
});
test('retiring catalogue keeps numeric prices, then uses direct manual prices for each sheet format',()=>{
 const c=createCabinet(),m=evaluate(c),q=costQuantities(c,m,planSheets(flattenParts(m),{},.2)),line=q.stock.find(p=>p.label==='18 mm sheet')!,id='stock/reference/18';
 const old=decodeCostPreferences(JSON.stringify({version:1,prices:{[id]:200,'hardware/Knob':12},labourRate:50,profitPercent:20,catalogue:{tags:{[id]:'Birch'},stock:{[id]:{width:2000,height:1000}}}}));
 const prefs=manualCostPreferences(q.stock,old);assert.equal(prefs.catalogue,undefined);assert.equal(prefs.prices[line.id],297.68);assert.equal(prefs.prices['hardware/Knob'],12);assert.equal(prefs.labourRate,50);assert.equal(prefs.profitPercent,20);assert.ok(!Object.keys(prefs.prices).some(k=>k.startsWith('stock/reference/')||k.startsWith('stock/catalogue/')));
 assert.equal(calculateEstimate(q,prefs).stock.find(p=>p.id===line.id)!.unitPrice,297.68);
 const changed={stock:[{...line,id:line.id.replace(/2440x1220$/,'1220x1220'),sheetArea:1.4884}],hardware:[],unplaced:0};assert.equal(calculateEstimate(changed,prefs).missing,1);
 assert.equal(manualCostPreferences([line],{...old,prices:{...old.prices,[line.id]:0}}).prices[line.id],0);
});
