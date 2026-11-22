import type {Cabinet} from '../domain/cabinet';
import {cnc,type CncSettings} from '../rules/cnc';
export function setCnc(c:Cabinet,patch:Partial<CncSettings>):Cabinet{return {...c,carcass:{...c.carcass,machining:{...cnc(c),...patch}}};}

export function setPartCabineoCount(c:Cabinet,id:string,count:number|undefined):Cabinet{
 const counts={...cnc(c).partCabineoCounts};
 if(count===undefined)delete counts[id];else counts[id]=count;
 return setCnc(c,{partCabineoCounts:Object.keys(counts).length?counts:undefined});
}

export function resetGlobalCabineoCount(c:Cabinet):Cabinet{return setCnc(c,{cabineoPerSide:0,partCabineoCounts:undefined});}
