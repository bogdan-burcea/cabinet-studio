import init from 'replicad-opencascadejs';
import wasmUrl from 'replicad-opencascadejs/wasm?url';
import {setOC} from 'replicad';
import {exportSheetStl} from './stl';
import type {ExportModel} from './sheet-export';
self.onmessage=async({data}:{data:ExportModel})=>{
 try{setOC(await init({locateFile:()=>wasmUrl}));const result=await exportSheetStl(data,(done,total)=>self.postMessage({progress:{done,total}}));self.postMessage({result},{transfer:[result]});}
 catch(error){self.postMessage({error:(error as Error).message||'The local STL engine could not process the sheet.'});}
};
