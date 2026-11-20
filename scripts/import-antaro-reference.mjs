// Run from repository root: node scripts/import-antaro-reference.mjs /path/to/assembled-K550.STEP
// Source solid indices identify the matched standard drawer hardware, not gallery accessories.
import fs from 'node:fs';import {createRequire} from 'node:module';import init from 'replicad-opencascadejs';import {setOC,importSTEP} from 'replicad';
const req=createRequire(import.meta.url);setOC(await init({wasmBinary:new Uint8Array(fs.readFileSync(req.resolve('replicad-opencascadejs/wasm'))),print:()=>{}}));
const shape=await importSTEP(new Blob([fs.readFileSync(process.argv[2])]));
for(const [name,index,left] of [['wall-left',9,true],['wall-right',11,false],['runner-left',3,true],['runner-right',7,false],['back-left',34,true],['back-right',35,false]]){
 const s=shape.solids[index],mesh=s.mesh({tolerance:.15,angularTolerance:.15});
 const vertices=mesh.vertices.map((n,i)=>+(n+(i%3===0&&left?764:0)).toFixed(5));
 const data={source:'Supplied TANDEMBOX K550 assembly',solid:index,vertices,triangles:mesh.triangles};
 fs.writeFileSync(`src/viewport/assets/antaro-${name}.json`,JSON.stringify(data));console.log(name,vertices.length/3);
}
shape.delete();
