import test from 'node:test';import assert from 'node:assert/strict';
import {nestStock,nestAssignedStock,defaultSheet} from '../src/cnc/nesting.ts';
import {viewDirection,perspectiveView} from '../src/viewport/camera-presets.ts';
const parts=[[443,424],[179,670],[793,614],[311,522],[587,365],[570,583],[298,117],[445,729],[579,289],[625,548],[359,454]].map(([width,height],i)=>({id:'p'+i,label:'P'+i,width,height,grain:'none' as const}));
test('dynamic cavity filling saves one whole 1220 sheet on a previously three-sheet job and retains cutter clearance',()=>{
 const stock={...defaultSheet,width:1220,height:1220,gap:8.2},result=nestStock(parts,stock);
 assert.equal(result.unplaced.length,0);assert.equal(result.sheets.length,2);
 for(const sheet of result.sheets)for(const [i,a] of sheet.placements.entries()){
  assert.ok(a.x>=10&&a.y>=10&&a.x+a.width<=1210+.001&&a.y+a.height<=1210+.001);
  for(const b of sheet.placements.slice(i+1))assert.ok(a.x+a.width+8.2<=b.x+.001||b.x+b.width+8.2<=a.x+.001||a.y+a.height+8.2<=b.y+.001||b.y+b.height+8.2<=a.y+.001);
 }
 assert.deepEqual(nestStock([...parts].reverse(),stock),result);
});
test('rotation-only layouts still run the complete optimiser and honour grain',()=>{
 const stock={...defaultSheet,width:1220,height:1220,gap:8.2},rotated=nestAssignedStock(parts,stock,{p0:{rotated:true}});assert.equal(rotated.sheets.flatMap(s=>s.placements).find(p=>p.part.id==='p0')!.rotated,true);
 assert.throws(()=>nestAssignedStock([{...parts[0],grain:'u'}],stock,{p0:{rotated:true}}),/grain/);
});
test('3D uses perspective and elevation buttons automatically use parallel projection',()=>{
 assert.equal(perspectiveView('perspective'),true);assert.equal(perspectiveView('isometric'),true);
 for(const view of ['front','left','right','top','rear'] as const)assert.equal(perspectiveView(view),false);
 assert.equal(perspectiveView('top',true),false);assert.equal(perspectiveView('isometric',true),true);
 assert.deepEqual(viewDirection('isometric'),viewDirection('perspective'));assert.deepEqual(viewDirection('front'),[0,0,1]);
});
