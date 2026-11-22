import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {setCabineo} from '../src/commands/cabineo';
import {evaluate} from '../src/geometry/evaluate';
import {flattenParts} from '../src/cnc/parts';
import {defaultSheet} from '../src/cnc/nesting';
import {sheetForExport,sheetsForExport} from '../src/cnc/sheet-export';
const parts=flattenParts(evaluate(setCabineo(createCabinet(),'cabineo-8'))),bottom=parts.find(p=>p.panel.role==='bottom')!,back=parts.find(p=>p.panel.role==='back')!;
const entries=[{id:'first',label:'Sheet 1',stock:{...defaultSheet,width:1220,height:1220},sheet:{placements:[{part:bottom,x:20,y:30,width:bottom.height,height:bottom.width,rotated:true}],utilization:0}},
 {id:'second',label:'Sheet 2',stock:{...defaultSheet,width:1600,height:900},sheet:{placements:[{part:back,x:40,y:25,width:back.width,height:back.height,rotated:false}],utilization:0}}];

test('selected sheets share one model with separate sheet positions, names, thickness and translated machining',()=>{
 const offcuts=new Map([['first',[{x:700,y:50,width:300,height:400}]],['second',[{x:900,y:40,width:350,height:500}]]]),combined=sheetsForExport(entries,offcuts,true);
 assert.equal(combined.name,'Selected sheets');assert.equal(combined.parts.length,6);
 assert.equal(new Set(combined.parts.map(p=>p.name)).size,6);
 for(const [index,entry] of entries.entries()){
  const single=sheetForExport(entry.sheet,entry.stock,offcuts.get(entry.id),true),dx=index?1390:0,dy=index?320:0;
  for(const part of single.parts){const exported=combined.parts.find(p=>p.name===`${entry.label} / ${part.name}`)!;
   assert.deepEqual(exported.origin,[part.origin[0]+dx,part.origin[1]+dy]);assert.equal(exported.thickness,part.thickness);assert.equal(exported.material,part.material);
   assert.deepEqual(exported.bores,part.bores.map(b=>({...b,point:[b.point[0]+dx,b.point[1]+dy,b.point[2]]})));
   assert.deepEqual(exported.pockets,part.pockets.map(p=>({...p,points:p.points.map(([x,y])=>[x+dx,y+dy])})));
  }
 }
 assert.deepEqual(sheetsForExport(entries.slice(0,1)).parts,sheetForExport(entries[0].sheet,entries[0].stock).parts);
 assert.deepEqual(sheetsForExport(entries.slice(1)).parts,sheetForExport(entries[1].sheet,entries[1].stock).parts);
 assert.throws(()=>sheetsForExport([]),/at least one/);
});
