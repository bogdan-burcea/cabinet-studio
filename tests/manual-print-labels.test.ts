import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {addDivision} from '../src/commands/interiors';
import {addSimpleDoors} from '../src/commands/simple-doors';
import {evaluate} from '../src/geometry/evaluate';
import {flattenParts} from '../src/cnc/parts';
import {planSheets} from '../src/cnc/layout';
import {labelJob} from '../src/docs/label-job';
import {partLabels,defaultLabelStock} from '../src/docs/pdf';
import {serialize,deserializeWithInfo} from '../src/persistence/files';
import {costQuantities,calculateEstimate} from '../src/costs/estimate';
import {decodeCostPreferences} from '../src/costs/preferences';
function fixture(){let c=createCabinet();c=addDivision(c,c.compartments.id,'vertical',282).cabinet;return addSimpleDoors(c,'pair').cabinet;}

test('small labels export without QR limits and share numbers with sheet maps',()=>{
 const c=fixture(),parts=flattenParts(evaluate(c)),job=labelJob(parts,planSheets(parts,{},.2),6);
 const pdf=partLabels(c,job.parts,{...defaultLabelStock,width:40,height:25},false,job.map),text=pdf.output();
 assert.doesNotMatch(text,/exploded diagram/);assert.match(text,/label map/);assert.doesNotMatch(text,/\/Subtype \/Link|model=|QR code/);
 assert.ok(pdf.getNumberOfPages()>=1+job.map.sheets.length);
 const calibration=partLabels(c,[],defaultLabelStock,true).output();assert.doesNotMatch(calibration,/exploded diagram|label map/);
});
test('retired catalogue files become generic stock without changing their thickness or identities',()=>{
 const c=createCabinet(),doc=JSON.parse(serialize(c));doc.schemaVersion=49;doc.evaluatorRevision='catalogue-materials-49';
 doc.cabinet.materials.carcass.stock={id:'holver-20251013-04476-0001-18-2800x2070',revision:'2025-10-13'};
 doc.cabinet.materials.back.stock={id:'holver-20251013-04110-0070-3-2800x2070',revision:'2025-10-13'};
 const loaded=deserializeWithInfo(JSON.stringify(doc));assert.ok(loaded.migrated);assert.equal(loaded.cabinet.id,c.id);
 assert.equal(loaded.cabinet.materials.carcass.stock.id,'generic-panel-18');assert.equal(loaded.cabinet.materials.back.stock.id,'generic-back-3');
 assert.deepEqual(deserializeWithInfo(serialize(loaded.cabinet)),{cabinet:loaded.cabinet,migrated:false});
});
test('costs use only manually entered RON prices after retiring catalogue pricing',()=>{
 const c=createCabinet(),m=evaluate(c),q=costQuantities(c,m,planSheets(flattenParts(m),{},.2));
 const prefs=decodeCostPreferences(JSON.stringify({version:1,prices:{[q.stock[0].id]:100},eurRon:5.3482,labourHours:0}));
 assert.ok(!('eurRon' in prefs));const e=calculateEstimate(q,prefs);assert.equal(e.stock[0].unitPrice,100);assert.equal(e.stock[1].unitPrice,undefined);
});
