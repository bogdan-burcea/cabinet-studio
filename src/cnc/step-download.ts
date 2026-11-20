import type {ExportModel} from './sheet-export';

type WorkerReply = {progress:{done:number;total:number}} | {error:string} | {result:string};

export function requestSheetStep(sheet:ExportModel,onProgress:(done:number,total:number)=>void):Promise<string>{
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./step-worker.ts',import.meta.url),{type:'module'});
    function stop(){clearTimeout(timeout);worker.terminate();}
    function fail(message:string){stop();reject(Error(message));}
    const timeout=setTimeout(()=>fail('STEP export timed out. Try a smaller model.'),180000);
    worker.onmessage=({data}:{data:WorkerReply})=>{
      if('progress' in data){onProgress(data.progress.done,data.progress.total);return;}
      if('error' in data){fail(data.error);return;}
      stop();resolve(data.result);
    };
    worker.onerror=()=>fail('The local STEP engine could not load.');
    worker.onmessageerror=()=>fail('The STEP result could not be read.');
    try{worker.postMessage(sheet);}catch(error){fail((error as Error).message);}
  });
}

export function downloadSheetStep(text:string, filename:string){
  const url=URL.createObjectURL(new Blob([text],{type:'application/step'}));
  const link=document.createElement('a');
  link.href=url;link.download=filename;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
