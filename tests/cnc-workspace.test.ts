import {sheetOverview} from '../src/cnc/layout.ts';
import {sheetForExport} from '../src/cnc/sheet-export.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createCabinet} from '../src/domain/cabinet.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {setBackPanel} from '../src/commands/back-panel.ts';
import {flattenParts, flatPreview, groupPartsByStock} from '../src/cnc/parts.ts';
import {defaultSheet, nestStock, reusableOffcuts, type NestPart} from '../src/cnc/nesting.ts';
import {faceUpRotation} from '../src/viewport/cnc-scene.ts';

const makePart = (id: string, width: number, height: number, grain: NestPart['grain'] = 'none'): NestPart => ({id, label: id, width, height, grain});

test('nesting places each fitting part once, obeys margins and gap and reports oversized parts', () => {
  const parts = [makePart('a',570,750), makePart('b',560,720), makePart('c',560,720),
    makePart('d',350,480), makePart('e',370,500), makePart('oversized',3000,3000)];
  const stock = {...defaultSheet, width: 1200, height: 1000};
  const layout = nestStock(parts, stock);
  assert.deepEqual(layout.unplaced.map(p => p.id), ['oversized']);
  const placed = layout.sheets.flatMap(s => s.placements.map(p => p.part.id)).sort();
  assert.deepEqual(placed, ['a','b','c','d','e']);
  assert.deepEqual(nestStock(parts, stock), layout);
  for (const {placements, utilization} of layout.sheets) {
    assert.ok(utilization > 0 && utilization <= 1);
    for (const [i,p] of placements.entries()) {
      assert.ok(p.x >= stock.margin && p.y >= stock.margin);
      assert.ok(p.x+p.width <= stock.width-stock.margin && p.y+p.height <= stock.height-stock.margin);
      for (const q of placements.slice(i+1)) {
        assert.ok(p.x+p.width+stock.gap <= q.x || q.x+q.width+stock.gap <= p.x ||
          p.y+p.height+stock.gap <= q.y || q.y+q.height+stock.gap <= p.y);
      }
    }
  }
});

test('stock grain is aligned and the rotation switch controls ungrained parts', () => {
  const stock = {...defaultSheet, width: 400, height: 800, rotate: false};
  const layout = nestStock([makePart('u',600,300,'u'),makePart('v',600,300,'v'),makePart('plain',600,300)], stock);
  assert.deepEqual(layout.unplaced.map(p => p.id).sort(), ['plain','u']);
  assert.equal(layout.sheets[0].placements[0].rotated, true);
  assert.equal(nestStock([makePart('plain',600,300)], {...stock, rotate:true}).sheets[0].placements[0].rotated, true);
  assert.throws(() => nestStock([], {...stock, margin: 200}), /usable stock/);
});

test('flattening keeps stock separate and shows only each setup’s blind cuts', () => {
  const cabinet = setBackPanel(setCabineo(createCabinet(),'cabineo-8'), {mode:'groove', thickness: 6, inset: 25});
  const evaluated = evaluate(cabinet);
  const parts = flattenParts(evaluated);
  assert.equal(parts.length, evaluated.panels.length);
  assert.deepEqual([...groupPartsByStock(parts).values()].map(group => group[0].thickness).sort((a,b) => a-b), [6,18]);
  const bottom = parts.find(p => p.panel.role === 'bottom')!;
  assert.equal(bottom.twoSided, true);
  assert.equal(bottom.face, -1);
  const up = flatPreview(bottom, -1), reverse = flatPreview(bottom, 1);
  assert.ok(up.bores.some(b => b.kind === 'housing' && b.path) && !up.slots);
  assert.ok(reverse.slots && !reverse.bores.some(b => b.kind === 'housing' && b.path));
  const top = parts.find(p => p.panel.role === 'top')!;
  assert.equal(top.twoSided, false);
  assert.equal(top.face, -1);
});

test('proper face-up rotations align with flat coordinates and keep the machining face above stock', () => {
  const parts=flattenParts(evaluate(createCabinet()));
  for (const part of parts) for (const face of [1,-1] as const) {
    const preview=flatPreview(part,face);
    const point=new Vector3().setComponent(part.u, -part.width/2)
      .setComponent(part.v, part.height/2).setComponent(part.normal, face*part.thickness/2);
    for (const turn of [false,true]) {
      const rotation=faceUpRotation(part,face,turn);
      assert.ok(Math.abs(rotation.determinant()-1)<1e-8);
      const transformed=point.clone().applyMatrix4(rotation);
      assert.equal(transformed.y, part.thickness/2);
      const expectedX=turn?part.height/2:(preview.face.axis===1||preview.face.axis===0 ? face : -face)*part.width/2;
      assert.ok(Math.abs(transformed.x-expectedX)<1e-8);
    }
  }
});


test('nesting tries alternate orders to fit an eight-part job on one square sheet',()=>{
 const parts=[[337,538],[623,200],[514,581],[377,260],[261,390],[291,735],[168,700],[306,260]]
  .map(([w,h],i)=>makePart(String(i),w,h));
 const layout=nestStock(parts,{...defaultSheet,width:1220,height:1220});
 assert.equal(layout.sheets.length,1);
 assert.equal(layout.sheets[0].placements.length,8);
 assert.equal(layout.unplaced.length,0);
});

test('offcut rectangles clear the parts and each other by at least the cutter diameter',()=>{
 const stock={...defaultSheet,width:1220,height:1220,gap:4};
 const [sheet]=nestStock(flattenParts(evaluate(createCabinet())).filter(p=>p.thickness===18),stock).sheets;
 const cuts=reusableOffcuts(sheet,stock,100,6);
 assert.ok(cuts.length);
 for(const [i,p] of cuts.entries()){
  assert.ok(p.width>=100&&p.height>=100);
  assert.ok(p.x>=stock.margin&&p.y>=stock.margin);
  assert.ok(p.x+p.width<=stock.width-stock.margin&&p.y+p.height<=stock.height-stock.margin);
  for(const q of [...sheet.placements,...cuts.slice(i+1)]){
   assert.ok(p.x+p.width+6<=q.x||q.x+q.width+6<=p.x||p.y+p.height+6<=q.y||q.y+q.height+6<=p.y);
  }
 }
 const original=sheetForExport(sheet,stock),withOffcuts=sheetForExport(sheet,stock,cuts);
 assert.deepEqual(withOffcuts.parts.slice(0,original.parts.length),original.parts);
 assert.deepEqual(withOffcuts.parts.slice(original.parts.length).map(p=>p.name),cuts.map((_,i)=>`Offcut ${i+1}`));
});


test('mixed sheet sizes use fixed gutters without reserving the largest width for every column',()=>{
 const {positions,width,height}=sheetOverview([{width:1220,height:1220},{width:1220,height:1220},{width:2440,height:1220}]);
 assert.deepEqual(positions,[{x:170,y:170},{x:1560,y:170},{x:170,y:1560}]);
 assert.equal(width,2950);
 assert.equal(height,2950);
});
