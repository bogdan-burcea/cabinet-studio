import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';
import init from 'replicad-opencascadejs';import {setOC} from 'replicad';import {STLLoader} from 'three/examples/jsm/loaders/STLLoader.js';import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {exportSheetStl} from '../src/cnc/stl';import type {SheetPart} from '../src/cnc/sheet-export';import {sheetsForExport} from '../src/cnc/sheet-export';import {createCabinet} from '../src/domain/cabinet';import {evaluate} from '../src/geometry/evaluate';import {flattenParts} from '../src/cnc/parts';import {defaultSheet} from '../src/cnc/nesting';
const require=createRequire(import.meta.url);setOC(await init({wasmBinary:new Uint8Array(readFileSync(require.resolve('replicad-opencascadejs/wasm'))),print:()=>{}}));
const part:SheetPart={name:'Test panel',origin:[10,15],width:100,height:100,thickness:18,bores:[{id:'top',kind:'pilot',point:[45,45,0],direction:[0,0,-1],diameter:10,depth:7,through:false},{id:'back',kind:'pilot',point:[75,50,-18],direction:[0,0,1],diameter:8,depth:5,through:false}],pockets:[{points:[[20,20],[30,20],[30,30],[20,30],[20,20]],low:-3,high:0,through:false}]};
test('binary STL loads with millimetre bounds and real blind machining on both faces',async()=>{
 const before=JSON.stringify(part),progress:number[]=[],buffer=await exportSheetStl({parts:[part]},done=>progress.push(done));assert.deepEqual(progress,[1]);assert.equal(JSON.stringify(part),before);
 const view=new DataView(buffer),triangles=view.getUint32(80,true);assert.ok(triangles>100);assert.equal(buffer.byteLength,84+triangles*50);assert.match(new TextDecoder().decode(buffer.slice(0,80)),/millimetres/);
 const g=new STLLoader().parse(buffer);g.computeBoundingBox();assert.deepEqual(g.boundingBox!.min.toArray(),[10,15,-18]);assert.deepEqual(g.boundingBox!.max.toArray(),[110,115,0]);
 const mesh=new Mesh(g,new MeshBasicMaterial({side:DoubleSide})),hit=(x:number,y:number,z:number,d:number)=>new Raycaster(new Vector3(x,y,z),new Vector3(0,0,d)).intersectObject(mesh)[0]?.point.z;
 assert.ok(Math.abs(hit(45,45,10,-1)!+7)<.001);assert.ok(Math.abs(hit(75,50,-25,1)!+13)<.001);assert.ok(Math.abs(hit(25,25,10,-1)!+3)<.001);
 let volume=0;const a=g.getAttribute('position'),p=new Vector3(),q=new Vector3(),r=new Vector3();for(let i=0;i<a.count;i+=3){p.fromBufferAttribute(a,i);q.fromBufferAttribute(a,i+1);r.fromBufferAttribute(a,i+2);volume+=p.dot(q.cross(r))/6;}
 const expected=100*100*18-7*Math.PI*25-5*Math.PI*16-300;assert.ok(Math.abs(Math.abs(volume)-expected)<10);g.dispose();mesh.material.dispose();
});
test('STL excludes overlapping stock while retaining marked offcuts and disjoint sheet parts',async()=>{
 const stock={...part,name:'Stock',origin:[0,0],width:1000,height:1000,bores:[],pockets:[],role:'stock' as const},offcut={...part,name:'Offcut',origin:[200,20],width:30,height:40,bores:[],pockets:[],role:'offcut' as const};
 const g=new STLLoader().parse(await exportSheetStl({parts:[part,stock,offcut]}));g.computeBoundingBox();assert.equal(g.boundingBox!.max.x,230);assert.equal(g.boundingBox!.max.y,115);g.dispose();
 await assert.rejects(exportSheetStl({parts:[]}),/no parts/);await assert.rejects(exportSheetStl({parts:[stock]}),/no parts/);
});
test('selected sheets keep their translated nesting positions and original thicknesses in one STL',async()=>{
 const parts=flattenParts(evaluate(createCabinet())),a=parts.find(p=>p.thickness===18)!,b=parts.find(p=>p.thickness===6)!;
 const entries=[{id:'a',label:'Sheet 1',stock:{...defaultSheet,width:1220,height:1220},sheet:{placements:[{part:a,x:20,y:30,width:a.height,height:a.width,rotated:true}],utilization:0}},{id:'b',label:'Sheet 2',stock:{...defaultSheet,width:1600,height:900},sheet:{placements:[{part:b,x:40,y:25,width:b.width,height:b.height,rotated:false}],utilization:0}}];
 const model=sheetsForExport(entries),g=new STLLoader().parse(await exportSheetStl(model));g.computeBoundingBox();assert.equal(g.boundingBox!.min.x,Math.min(...model.parts.map(p=>p.origin[0])));assert.equal(g.boundingBox!.max.x,Math.max(...model.parts.map(p=>p.origin[0]+p.width)));assert.equal(g.boundingBox!.min.z,-18);assert.equal(g.boundingBox!.max.z,0);assert.ok(Array.from(g.getAttribute('position').array).some((v,i)=>i%3===2&&v===-6));g.dispose();
});
