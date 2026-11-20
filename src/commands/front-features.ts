import type {Cabinet,SlabDoor} from '../domain/cabinet';
import {editSimpleDoors} from './simple-doors';
import {setDrawerPlacement} from './drawers';
export function frontTargets(c:Cabinet,ids:readonly string[]){
 return [...new Set(ids.flatMap(id=>c.fronts.some(d=>d.id===id)?[id]:c.drawers?.some(d=>d.id===id||id===d.id+'/front')?[c.drawers.find(d=>d.id===id||id===d.id+'/front')!.id]:[]))];
}
export function editFrontFeatures(c:Cabinet,ids:string[],patch:{edgeGap?:number;frontGap?:number;cornerRadius?:number;placement?:'overlay'|'inset';handle?:Partial<SlabDoor['handle']>},cabinetScope=false):Cabinet{
 const targets=new Set(frontTargets(c,ids)),doors=c.fronts.filter(d=>targets.has(d.id)),drawerIds=(c.drawers??[]).filter(d=>targets.has(d.id)).map(d=>d.id);
 let next=c;
 if(doors.length)next=editSimpleDoors(next,doors.map(d=>d.id),{...(patch.edgeGap===undefined?{}:{reveal:patch.edgeGap}),...(patch.frontGap===undefined?{}:{clearance:patch.frontGap}),...(patch.placement?{placement:patch.placement}:{})});
 if(patch.placement&&drawerIds.length)next=setDrawerPlacement(next,drawerIds,patch.placement);
 next={...next,fronts:next.fronts.map(d=>targets.has(d.id)?{...d,...patch.cornerRadius===undefined?{}:{cornerRadius:patch.cornerRadius},...patch.handle?{handle:{...d.handle,...patch.handle}}:{}}:d),drawers:next.drawers?.map(d=>targets.has(d.id)?{...d,...patch.cornerRadius===undefined?{}:{cornerRadius:patch.cornerRadius},...patch.handle?{handle:{...(d.handle??defaultDrawerHandle()),...patch.handle}}:{},...patch.edgeGap===undefined&&patch.frontGap===undefined?{}:{front:{...(d.front??defaultDrawerFront()),...patch.edgeGap===undefined?{}:{gap:patch.edgeGap},...patch.frontGap===undefined?{}:{clearance:patch.frontGap}}}}:d)};
 if(cabinetScope)next={...next,frontDefaults:{edgeGap:c.frontDefaults?.edgeGap??2,frontGap:c.frontDefaults?.frontGap??2,cornerRadius:c.frontDefaults?.cornerRadius??0,...patch.edgeGap===undefined?{}:{edgeGap:patch.edgeGap},...patch.frontGap===undefined?{}:{frontGap:patch.frontGap},...patch.cornerRadius===undefined?{}:{cornerRadius:patch.cornerRadius}}};
 return next;
}
import {defaultDrawerHandle} from '../rules/handles';
import {defaultDrawerFront} from '../rules/drawer-layout';
