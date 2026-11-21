import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {flattenParts} from '../src/cnc/parts.ts';
import {planSheets} from '../src/cnc/layout.ts';
import {defaultSheet} from '../src/cnc/nesting.ts';
import {costQuantities,calculateEstimate,parseCostInput,estimateCsv} from '../src/costs/estimate.ts';
import {decodeCostPreferences} from '../src/costs/preferences.ts';
import {addDrawerStack} from '../src/commands/drawers.ts';
import {defaultDrawerHandle} from '../src/rules/handles.ts';
import {drawerPack} from '../src/catalogue/drawers.ts';
import {addSimpleDoors} from '../src/commands/simple-doors.ts';
import {defaultHinge} from '../src/catalogue/hinges.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {addInteriorBatch} from '../src/commands/simple-interiors.ts';
const quantities=(c:ReturnType<typeof createCabinet>,settings={})=>{const m=evaluate(c),p=planSheets(flattenParts(m),settings,.2);return costQuantities(c,m,p);};
test('whole-sheet quantities follow the Cut layout and sheet sizes have independent price identities',()=>{
 const c=createCabinet(),m=evaluate(c),parts=flattenParts(m),normal=costQuantities(c,m,planSheets(parts,{},.2));
 const small=Object.fromEntries([...new Set(parts.map(p=>p.stockKey))].map(key=>[key,{...defaultSheet,width:800,height:800}]));const changed=costQuantities(c,m,planSheets(parts,small,.2));
 assert.ok(changed.stock.reduce((n,l)=>n+l.quantity,0)>normal.stock.reduce((n,l)=>n+l.quantity,0));assert.ok(changed.stock.every(l=>!normal.stock.some(n=>n.id===l.id)));
 const short={...parts[0],width:90,height:90,grain:'none' as const};const settings={[short.stockKey]:{...defaultSheet,width:190,height:100,margin:0,gap:10,rotate:false}};
 assert.equal(costQuantities(c,m,planSheets([short,{...short,id:'b'}],settings,.2)).stock[0].quantity,2);
});
test('hardware counts physical connectors, hinges/plates, handles and drawer purchase pairs rather than drilled holes',()=>{
 const c=createCabinet(),withCabineo=setCabineo(c,'cabineo-8'),cabModel=evaluate(withCabineo),q=quantities(withCabineo);assert.equal(q.hardware[0].quantity,cabModel.cabineo.length);
 const stack=addDrawerStack(c,c.compartments.id,2).cabinet;stack.drawers=stack.drawers!.map(d=>({...d,handle:{...defaultDrawerHandle(),kind:'pull'}}));const drawn=quantities(stack),pack=drawerPack(stack.drawers![0].pack);
 for(const item of pack.components){const line=drawn.hardware.find(l=>l.label===item.article)!;assert.equal(line.quantity,item.quantity*2);if(item.unit.includes('pair'))assert.equal(line.unit,'pair');if(item.unit.includes('left/right'))assert.equal(line.paired,true);}
 assert.equal(drawn.hardware.find(l=>l.label.startsWith('Pull handle'))!.quantity,2);
 const doors=addSimpleDoors(c,'single',[c.compartments.id]).cabinet;doors.fronts[0].hinge=defaultHinge();const doorQ=quantities(doors);assert.equal(doorQ.hardware.filter(l=>l.label.startsWith('Blum')).length,2);assert.ok(doorQ.hardware.filter(l=>l.label.startsWith('Blum')).every(l=>l.quantity===2));
 const shelves=addInteriorBatch(c,[c.compartments.id],'adjustable',0,2).cabinet;assert.equal(quantities(shelves).hardware.find(l=>l.label==='Shelf supports')!.quantity,8);
});
test('costs calculate with integer cents, category totals, labour rounding, explicit zeros and incomplete prices',()=>{
 const q={stock:[{id:'stock/a',label:'Board',quantity:3,unit:'sheet'}],hardware:[{id:'hardware/b',label:'Hinge',quantity:2,unit:'item'}],unplaced:1};
 const prefs={version:1 as const,prices:{'stock/a':.1,'hardware/b':2.25},labourHours:1.25,labourRate:12.34};const e=calculateEstimate(q,prefs);assert.equal(e.stockCents,30);assert.equal(e.hardwareCents,450);assert.equal(e.labourCents,1543);assert.equal(e.totalCents,2023);assert.equal(e.missing,0);
 assert.equal(calculateEstimate(q,{...prefs,prices:{'stock/a':0}}).missing,1);assert.throws(()=>calculateEstimate(q,{...prefs,labourRate:-1}));
 const csv=estimateCsv(e,prefs);assert.match(csv,/Stock total/);assert.match(csv,/Hardware total/);assert.match(csv,/20.23/);assert.match(csv,/Incomplete estimate/);assert.doesNotMatch(csv,/EUR/);
});
test('amount parsing and saved drafts reject invalid data and keep cleared prices cleared',()=>{
 assert.equal(parseCostInput('12,34'),12.34);assert.equal(parseCostInput(''),undefined);assert.equal(parseCostInput('.5'),.5);
 for(const raw of ['-1','Infinity','1e6','1.2345678','abc','1000001'])assert.throws(()=>parseCostInput(raw));assert.throws(()=>parseCostInput('100001',true));
 const saved={version:1 as const,prices:{'stock/a':5},labourHours:0,labourRate:80};assert.deepEqual(decodeCostPreferences(null,saved),saved);
 const cleared={version:1 as const,prices:{},labourHours:0};assert.deepEqual(decodeCostPreferences(JSON.stringify(cleared),saved),cleared);
 const invalid=decodeCostPreferences(JSON.stringify({version:1,prices:{'hardware/x':-1,'stock/y':3,constructor:5},labourHours:NaN}));assert.deepEqual(invalid.prices,{'stock/y':3});assert.equal(invalid.labourHours,0);
});

test('net-area stock basis matches Workshop rectangles, excludes nesting waste and keeps independent prices',()=>{
 const c=createCabinet(),m=evaluate(c),parts=flattenParts(m),plan=planSheets(parts,{},.2),area=costQuantities(c,m,plan,'area');
 assert.ok(Math.abs(area.stock.reduce((n,l)=>n+l.quantity,0)-parts.reduce((n,p)=>n+p.width*p.height/1e6,0))<1e-9);
 assert.ok(area.stock.every(l=>l.unit==='m²'&&l.id.startsWith('stock/area/')));
 const tiny=Object.fromEntries(parts.map(p=>[p.stockKey,{...defaultSheet,width:100,height:100}])),unplaced=costQuantities(c,m,planSheets(parts,tiny,.2),'area');
 assert.deepEqual(unplaced.stock,area.stock);assert.ok(unplaced.unplaced>0);
 const line=area.stock[0],e=calculateEstimate(area,{version:1,prices:{[line.id]:12.34},labourHours:0,profitPercent:20});
 assert.equal(e.stockCents,Math.round(1234*line.quantity));assert.equal(e.profitCents,Math.round(e.costsCents*.2));assert.equal(e.totalCents,e.costsCents+e.profitCents);
 assert.match(estimateCsv(e,{version:1,prices:{},labourHours:0,profitPercent:20}),/Profit/);
 assert.throws(()=>calculateEstimate(area,{version:1,prices:{},labourHours:0,profitPercent:1001}));
});
test('manual cost drafts preserve prices and ignore retired product links and automatic settings',()=>{
 const prefs={version:1 as const,prices:{'stock/a':12.34567},labourHours:2,labourRate:50,profitPercent:20,stockBasis:'area' as const};
 assert.deepEqual(decodeCostPreferences(JSON.stringify(prefs)),prefs);
 const legacy={...prefs,stores:['https://shop.example/'],sources:{'stock/a':{url:'https://shop.example/product',units:1,auto:true,error:'Old store error'}}};
 assert.deepEqual(decodeCostPreferences(JSON.stringify(legacy)),prefs);

});

test('reusable offcuts are valued at the matching sheet rate and optionally deducted before profit',()=>{
 const c=createCabinet(),m=evaluate(c),parts=flattenParts(m),plan=planSheets(parts,{},.2),q=costQuantities(c,m,plan);
 const prices=Object.fromEntries(q.stock.map(r=>[r.id,200]));
 const prefs={version:1 as const,prices,labourHours:1,labourRate:50,profitPercent:20};
 const full=calculateEstimate(q,prefs),deduct=calculateEstimate(q,{...prefs,deductOffcuts:true});
 assert.ok(full.offcutsCents>0);assert.equal(full.deductionCents,0);assert.ok(full.offcutsCents<=full.stockCents);
 assert.equal(deduct.costsCents,full.costsCents-deduct.deductionCents);assert.equal(deduct.profitCents,Math.round(deduct.costsCents*.2));
 assert.equal(deduct.totalCents,deduct.costsCents+deduct.profitCents);assert.match(estimateCsv(deduct,prefs),/Offcuts deduction/);
 assert.equal(decodeCostPreferences(JSON.stringify({...prefs,deductOffcuts:true})).deductOffcuts,true);
 assert.equal(calculateEstimate(q,{...prefs,prices:{},deductOffcuts:true}).offcutsCents,0);
});
