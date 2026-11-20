import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {flattenParts} from '../src/cnc/parts.ts';
import {planSheets} from '../src/cnc/layout.ts';
import {defaultSheet} from '../src/cnc/nesting.ts';
import {billOfMaterials,partLink,linkedPart} from '../src/docs/project.ts';
import {defaultLabelStock,labelGrid,partLabels} from '../src/docs/pdf.ts';

test('CNC allowance consumes real room and stock costs count all of the resulting sheets',()=>{
 const cabinet=setCabineo(createCabinet(),'cabineo-8'),model=evaluate(cabinet),parts=flattenParts(model);
 const one=parts[0];
 const a={...one,grain:'none' as const,width:90,height:90},b={...a,id:'second'};
 const settings={[a.stockKey]:{...defaultSheet,width:190,height:100,margin:0,gap:10,rotate:false}};
 const before=planSheets([a,b],settings,0),after=planSheets([a,b],settings,.2);
 assert.equal(before.sheets.length,1);
 assert.equal(after.sheets.length,2);
 assert.equal(after.sheets[0].stock.gap,10.2);
 const bill=billOfMaterials(cabinet,model,after);
 assert.equal(bill.stock[0].count,2);
 assert.equal(bill.hardware[0].count,model.cabineo.length);
});

test('docs generate grayscale paginated labels and an individual label links to its own cabinet and part',()=>{
 const cabinet=createCabinet(),model=evaluate(cabinet),parts=flattenParts(model);
 const sheet={...defaultLabelStock,pageWidth:100,pageHeight:70};
 assert.deepEqual(labelGrid(sheet),{columns:1,rows:1});
 const file=partLabels(cabinet,parts,sheet,'http://example.test/studio/').output();
 assert.ok(file.startsWith('%PDF-'));
 assert.doesNotMatch(file,/^[\d.]+ [\d.]+ [\d.]+ (?:rg|RG)$/m);
 assert.equal((file.match(/\/Subtype \/Link/g)??[]).length,parts.length);
 const url=new URL(partLink('http://example.test/studio/',cabinet.id,parts[0].id));
 assert.deepEqual(linkedPart(url.hash),{cabinet:cabinet.id,part:parts[0].id});
 assert.match(file,/example\.test\/studio/);
 assert.throws(()=>labelGrid({...sheet,width:100}),/fit at least one/);
});
