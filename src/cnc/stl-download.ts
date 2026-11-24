import type {ExportModel} from './sheet-export';
type WorkerReply={progress:{done:number;total:number}}|{error:string}|{result:ArrayBuffer};
export function requestSheetStl(model:ExportModel,onProgress:(done:number,total:number)=>void):Promise<ArrayBuffer>{
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./stl-worker.ts',import.meta.url),{type:'module'});
  function stop(){clearTimeout(timeout);worker.terminate();}
  function fail(message:string){stop();reject(Error(message));}
  const timeout=setTimeout(()=>fail('STL export timed out. Try fewer sheets.'),180000);
  worker.onmessage=({data}:{data:WorkerReply})=>{if('progress'in data){onProgress(data.progress.done,data.progress.total);return;}if('error'in data){fail(data.error);return;}stop();resolve(data.result);};
  worker.onerror=()=>fail('The local STL engine could not load.');worker.onmessageerror=()=>fail('The STL result could not be read.');
  try{worker.postMessage(model);}catch(e){fail((e as Error).message);}
 });
}
export function downloadSheetStl(buffer:ArrayBuffer,filename:string){
 const url=URL.createObjectURL(new Blob([buffer],{type:'model/stl'})),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
