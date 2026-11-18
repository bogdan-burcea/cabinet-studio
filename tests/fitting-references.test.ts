import test from 'node:test';
import assert from 'node:assert/strict';
import { stage2FittingReferences } from '../src/catalogue/stage2-fittings.ts';
import { createCabinet } from '../src/domain/cabinet.ts';
import { evaluate } from '../src/geometry/evaluate.ts';
import { deserialize, serialize } from '../src/persistence/files.ts';
test('all supplied fitting references retain their exact manufacturer articles and sources without enabling incomplete assemblies',()=>{
  assert.deepEqual(stage2FittingReferences.map(p=>p.article),['637.38.054','637.76.353','637.76.333','48N0510.02S.AUF R250 W','MR-TDL011-01','40.4001 GEH V2500 W']);
  assert.equal(new Set(stage2FittingReferences.map(p=>p.id)).size,6);
  for(const p of stage2FittingReferences){assert.equal(p.modelEnabled,false);assert.equal(p.status,'reference-only');assert.equal(p.physicalTrial,'not-recorded');assert.ok(p.outstanding.length);assert.equal(new URL(p.supplierUrl).hostname,'www.feroshop.ro');}
  const cabinet=createCabinet(),geometry=evaluate(cabinet);assert.deepEqual(evaluate(deserialize(serialize(cabinet))),geometry);assert.deepEqual(cabinet.hardware,[]);
});
