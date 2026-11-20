import init from 'replicad-opencascadejs';
import wasmUrl from 'replicad-opencascadejs/wasm?url';
import {setOC} from 'replicad';
import {exportSheetStep} from './step';
import type {ExportModel} from './sheet-export';

self.onmessage=async ({data}:{data:ExportModel})=>{
  try{
    setOC(await init({locateFile:()=>wasmUrl}));
    const result=await exportSheetStep(data,(done,total)=>self.postMessage({progress:{done,total}}));
    self.postMessage({result});
  }catch(error){
    self.postMessage({error:(error as Error).message || 'The local STEP engine could not process the sheet.'});
  }
};
