import {validateAssembly,type Assembly,type AssemblyItem} from '../domain/assembly';
import {serialize,deserialize} from './files';
import type {Cabinet} from '../domain/cabinet';
const documents=new WeakMap<Cabinet,string>();
function cabinetDocument(c:Cabinet){let text=documents.get(c);if(!text){text=serialize(c);documents.set(c,text);}return text;}
export const ASSEMBLY_AUTOSAVE_KEY='wemakebox.assembly.v1';
export function serializeAssembly(a:Assembly){validateAssembly(a);return JSON.stringify({format:'wemakebox-assembly',version:1,assembly:{...a,items:a.items.map(p=>p.kind==='cabinet'?{...p,cabinet:cabinetDocument(p.cabinet)}:p)}},null,2);}
export function deserializeAssembly(text:string):Assembly{
 if(text.length>10_000_000)throw Error('Choose an assembly smaller than 10 MB.');
 const d=JSON.parse(text);if(d?.format!=='wemakebox-assembly'||d.version!==1||!Array.isArray(d.assembly?.items))throw Error('Unsupported assembly format. Your current assembly is unchanged.');
 const a={...d.assembly,items:d.assembly.items.map((p:any)=>p?.kind==='cabinet'?{...p,cabinet:deserialize(p.cabinet)}:p)} as Assembly;validateAssembly(a);return a;
}
export function downloadAssembly(a:Assembly){const url=URL.createObjectURL(new Blob([serializeAssembly(a)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='WeMakeBox.assembly.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
