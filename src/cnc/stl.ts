import {makeCompound} from 'replicad';
import {buildSheetSolid} from './step';
import type {ExportModel} from './sheet-export';

/** Binary STL in millimetres, using the same exact cut solids as STEP.
 * Keep disconnected parts in place; never fuse neighbouring sheets or include
 * an overlapping stock blank that would cover their machining features. */
export async function exportSheetStl(model:ExportModel,progress:(done:number,total:number)=>void=()=>{}):Promise<ArrayBuffer>{
 const parts=model.parts.filter(p=>p.role!=='stock');
 if(!parts.length)throw Error('There are no parts to export. Choose a sheet containing parts.');
 const solids:ReturnType<typeof buildSheetSolid>[]=[],compounds:ReturnType<typeof makeCompound>[]=[];
 try{
  for(const part of parts){try{solids.push(buildSheetSolid(part));}catch(e){throw Error(`${part.name}: ${(e as Error).message||'CAD cut failed.'}`);}progress(solids.length,parts.length);}
  const compound=makeCompound(solids);compounds.push(compound);
  const buffer=await compound.blobSTL({binary:true,tolerance:.02,angularTolerance:.1}).arrayBuffer();
  // STL has no formal unit field. Record our unchanged mm convention in its header.
  new Uint8Array(buffer,0,80).fill(0);new Uint8Array(buffer,0,80).set(new TextEncoder().encode('WeMakeBox - millimetres - nested machined parts'));
  return buffer;
 }finally{compounds.forEach(s=>s.delete());solids.forEach(s=>s.delete());}
}
