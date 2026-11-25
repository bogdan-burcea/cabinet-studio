import {fitDrawerRails} from '../rules/drawer-rails';
import {drawerOpenings,layoutDrawerIntents,recommendedDrawerFront} from '../rules/drawer-layout';
import type {Cabinet,MetalDrawer} from '../domain/cabinet';
import {antaroPin,antaroM500,drawerPack,innerDrawerSpec,chooseDrawerPack} from '../catalogue/drawers';
import {resolveInteriors} from '../rules/interiors';
import {stock} from '../catalogue/materials';
import {evaluate} from '../geometry/evaluate';
export function addMetalDrawer(c:Cabinet,openingId:string,packPin=antaroPin){
 const pack=drawerPack(packPin);
 const opening=resolveInteriors(c,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness).openings.find(o=>o.id===openingId);
 if(!opening)throw new Error('Choose an existing opening.');
 const allocations=(c.drawers??[]).filter(d=>d.openingId===openingId).sort((a,b)=>a.offset-b.offset);
 let offset=0;
 for(const existing of allocations){if(existing.offset-offset>=pack.minimumHeight)break;offset=existing.offset+existing.frontHeight;}
 const upper=allocations.find(d=>d.offset>=offset)?.offset??opening.size[1];
 const height=Math.min(Math.max(160,pack.minimumHeight),upper-offset);
 if(height<pack.minimumHeight)throw new Error('No free allocation remains for this drawer height.');
 const id=crypto.randomUUID(),drawer:MetalDrawer={id,kind:'metal-drawer',policyRevision:'antaro-external-1',pack:{...packPin},openingId,offset,frontHeight:height};
 const cabinet={...c,drawers:[...(c.drawers??[]),drawer]};evaluate(cabinet);return {cabinet,featureId:id};
}
export function updateMetalDrawer(c:Cabinet,id:string,patch:Partial<Pick<MetalDrawer,'offset'|'frontHeight'|'front'|'pack'|'manualRail'|'internal'>>){if(!c.drawers?.some(d=>d.id===id))throw new Error('Select an existing drawer.');const next={...c,drawers:c.drawers.map(d=>d.id===id?{...d,...patch,...patch.pack&&d.internal?{internal:{...d.internal,revision:innerDrawerSpec(drawerPack(patch.pack)).revision}}:{}}:d)};evaluate(next);return next;}
export function removeMetalDrawer(c:Cabinet,id:string){
 const removed=c.drawers?.find(d=>d.id===id),drawers=(c.drawers??[]).filter(d=>d.id!==id).map(d=>structuredClone(d));
 for(const groupId of new Set(drawers.flatMap(d=>d.stack?[d.stack.groupId]:[]))){
  const before=c.drawers!.filter(d=>d.stack?.groupId===groupId).sort((a,b)=>a.stack!.order-b.stack!.order);
  const group=drawers.filter(d=>d.stack?.groupId===groupId).sort((a,b)=>a.stack!.order-b.stack!.order);
  group.forEach((d,order)=>{d.stack={...d.stack!,order};});
  if(removed?.id===before[0]?.id&&group[0].front)group[0].front={...group[0].front,top:before[0].front?.top??0};
  if(removed?.id===before.at(-1)?.id&&group.at(-1)!.front)group.at(-1)!.front={...group.at(-1)!.front!,bottom:before.at(-1)!.front?.bottom??0};
 }
 const banding={...c.banding};delete banding[`${id}/front`];
 const next={...c,banding,drawers:layoutDrawerIntents({...c,drawers})};evaluate(next);return next;
}

type DrawerPatch=Partial<Pick<MetalDrawer,'offset'|'frontHeight'|'front'|'pack'|'manualRail'|'internal'>>;
export function editDrawerGroup(c:Cabinet,ids:string[],patch:DrawerPatch){
 const chosen=new Set(ids);
 if(!ids.length||ids.some(id=>!c.drawers?.some(d=>d.id===id)))throw Error('Select existing drawers.');
 if(c.drawers!.some(d=>chosen.has(d.id)&&d.stack)){
  let next:Cabinet={...c,drawers:c.drawers!.map(d=>chosen.has(d.id)?{...d,...patch,...patch.pack&&d.internal?{internal:{...d.internal,revision:innerDrawerSpec(drawerPack(patch.pack)).revision}}:{},frontHeight:d.frontHeight}:d)};
  if(patch.frontHeight!==undefined)next=setDrawerFrontHeight(next,ids,patch.frontHeight);
  return {...next,drawers:layoutDrawerIntents(next)};
 }
 const first=c.drawers!.find(d=>d.id===ids[0])!;
 const delta=patch.offset===undefined?0:patch.offset-first.offset;
 const shifts=new Map<string,number>();
 for(const opening of new Set(c.drawers!.map(d=>d.openingId))){
  let shift=0;
  for(const d of c.drawers!.filter(d=>d.openingId===opening).sort((a,b)=>a.offset-b.offset)){
   shifts.set(d.id,shift);
   if(chosen.has(d.id)&&patch.frontHeight!==undefined)shift+=patch.frontHeight-d.frontHeight;
  }
 }
 const next={...c,drawers:c.drawers!.map(d=>chosen.has(d.id)?{
  ...d,...patch,...patch.pack&&d.internal?{internal:{...d.internal,revision:innerDrawerSpec(drawerPack(patch.pack)).revision}}:{},offset:d.offset+delta+(shifts.get(d.id)??0),
  ...(patch.front?{front:{...(d.front??{placement:'overlay',gap:2,clearance:2,left:0,right:0,top:0,bottom:0}),...patch.front}}:{}),
 }:{...d,offset:d.offset+(shifts.get(d.id)??0)})};
 return next;
}

export function duplicateDrawers(c:Cabinet,ids:string[]){
 const originals=c.drawers?.filter(d=>ids.includes(d.id))??[];
 if(originals.length!==ids.length||!ids.length)throw Error('Select drawers to duplicate.');
 if(originals.every(d=>d.stack)){
  const draws=(c.drawers??[]).map(d=>structuredClone(d)),added:string[]=[],banding=structuredClone(c.banding);
  for(const groupId of new Set(originals.map(d=>d.stack!.groupId))){
   const group=draws.filter(d=>d.stack?.groupId===groupId).sort((a,b)=>a.stack!.order-b.stack!.order),expanded:MetalDrawer[]=[];
   for(const d of group){expanded.push(d);if(ids.includes(d.id)){const copy={...structuredClone(d),id:crypto.randomUUID(),stack:{...d.stack!,height:0}};expanded.push(copy);added.push(copy.id);draws.push(copy);if(c.banding[`${d.id}/front`])banding[`${copy.id}/front`]=structuredClone(c.banding[`${d.id}/front`]);}}
   expanded.forEach((d,order)=>{d.stack={...d.stack!,order};});
   // Keep the edited outer overlaps at the stack boundaries, never between fronts.
   const top=group[0].front?.top??0,bottom=group.at(-1)!.front?.bottom??0;
   for(const d of expanded)if(d.front?.placement==='overlay')d.front={...d.front,top:0,bottom:0};
   if(expanded[0].front?.placement==='overlay')expanded[0].front={...expanded[0].front,top};
   if(expanded.at(-1)!.front?.placement==='overlay')expanded.at(-1)!.front={...expanded.at(-1)!.front!,bottom};
  }
  return {cabinet:{...c,banding,drawers:layoutDrawerIntents({...c,drawers:draws})},featureIds:added};
 }
 let next=c;const added:string[]=[];
 // Preserve each opening's selected group spacing and find a clear translation.
 const openings=[...new Set(originals.map(d=>d.openingId))];
 for(const openingId of openings){
  const group=originals.filter(d=>d.openingId===openingId),low=Math.min(...group.map(d=>d.offset));
  const opening=resolveInteriors(c,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness).openings.find(o=>o.id===openingId)!;
  const span=Math.max(...group.map(d=>d.offset+d.frontHeight))-low;
  const occupied=(next.drawers??[]).filter(d=>d.openingId===openingId);
  const candidates=[...new Set([0,...occupied.map(d=>d.offset+d.frontHeight)])].sort((a,b)=>a-b);
  let result:Cabinet|undefined,idsForGroup:string[]=[];
  for(const start of candidates){
   if(start+span>opening.size[1])continue;
   const copies=group.map(d=>({...structuredClone(d),id:crypto.randomUUID(),offset:start+d.offset-low}));
   const banding=structuredClone(next.banding);copies.forEach((copy,i)=>{if(c.banding[`${group[i].id}/front`])banding[`${copy.id}/front`]=structuredClone(c.banding[`${group[i].id}/front`]);});
   const trial={...next,banding,drawers:[...(next.drawers??[]),...copies]};
   try{evaluate(trial);result=trial;idsForGroup=copies.map(d=>d.id);break;}catch{/* Try the next clear allocation. */}
  }
  if(!result)throw Error('The selected drawer group has no free space for a duplicate in this opening. Reduce drawer spacing or increase the opening height.');
  next=result;added.push(...idsForGroup);
 }
 return {cabinet:next,featureIds:added};
}

/** Fill one opening in a single transaction; front height zero means automatic. */
export function addDrawerStack(c:Cabinet,openingId:string,count:number,packPin=antaroPin,manualRail=false,internal=false){
 if(!Number.isInteger(count)||count<1||count>16)throw Error('Choose 1–16 drawers.');
 const opening=drawerOpenings(c).find(o=>o.id===openingId);if(!opening)throw Error('Choose an opening.');
 if(c.drawers?.some(d=>d.openingId===openingId))throw Error('This opening already has drawers. Duplicate an existing drawer to add to its stack.');
 const groupId=crypto.randomUUID(),featureIds:string[]=Array.from({length:count},()=>crypto.randomUUID());
 let cabinet:Cabinet={...c,drawers:[...(c.drawers??[]),...featureIds.map((id,order)=>({id,kind:'metal-drawer' as const,policyRevision:'antaro-external-1' as const,pack:{...packPin},...internal?{internal:{revision:innerDrawerSpec(drawerPack(packPin)).revision,setback:60}}:{},...manualRail?{manualRail:true}:{},openingId,offset:0,frontHeight:0,stack:{groupId,order,height:0}}))]};
 cabinet={...cabinet,drawers:layoutDrawerIntents(cabinet)};
 cabinet={...cabinet,drawers:cabinet.drawers!.map(d=>featureIds.includes(d.id)&&!internal?{...d,...c.frontDefaults?{cornerRadius:c.frontDefaults.cornerRadius}:{},front:{...recommendedDrawerFront(cabinet,d,'overlay'),gap:c.frontDefaults?.edgeGap??2,clearance:c.frontDefaults?.frontGap??2}}:d)};
 return {cabinet:fitDrawerRails({...cabinet,drawers:layoutDrawerIntents(cabinet)}),featureIds};
}
export function setDrawerFrontHeight(c:Cabinet,ids:string[],height:number){
 if(!Number.isFinite(height)||height<0||Math.abs(height*10-Math.round(height*10))>1e-6)throw Error('Drawer front height: use 0 for automatic, or a height in 0.1 mm steps.');
 const drawers=(c.drawers??[]).map(d=>{
  if(!ids.includes(d.id))return d;
  if(!d.stack)return d;
  const group=c.drawers!.filter(v=>v.stack?.groupId===d.stack!.groupId);
  if(d.stack.order===Math.max(...group.map(v=>v.stack!.order)))return d;
  return {...d,stack:{...d.stack,height}};
 });
 return fitDrawerRails({...c,drawers:layoutDrawerIntents({...c,drawers})});
}
export function setDrawerPlacement(c:Cabinet,ids:string[],placement:'inset'|'overlay'){
 const openings=new Set(c.drawers?.filter(d=>ids.includes(d.id)).map(d=>d.openingId));
 const drawers=(c.drawers??[]).map(d=>openings.has(d.openingId)?{...d,front:recommendedDrawerFront(c,d,placement)}:d);
 return fitDrawerRails({...c,drawers:layoutDrawerIntents({...c,drawers})});
}

/** Explicit type conversion preserves drawer and stack identities. */
export function setDrawerInternal(c:Cabinet,ids:string[],internal:boolean){
 if(!ids.length||ids.some(id=>!c.drawers?.some(d=>d.id===id)))throw Error('Select existing drawers.');
 const groups=new Set(c.drawers!.filter(d=>ids.includes(d.id)).flatMap(d=>d.stack?[d.stack.groupId]:[]));
 const drawers=c.drawers!.map(d=>{
  if(!ids.includes(d.id)&&!groups.has(d.stack?.groupId??''))return d;
  if(!!d.internal===internal)return d;
  const {internal:old,handle,cornerRadius,...rest}=d;
  if(!internal)return rest;
  const pack=drawerPack(d.pack),pin=pack.family==='merivobox'?d.pack:chooseDrawerPack(d.pack,{configuration:'m'});
  return {...rest,front:{placement:'overlay' as const,gap:2,clearance:2,left:0,right:0,top:0,bottom:0},pack:pin,internal:{revision:innerDrawerSpec(drawerPack(pin)).revision,setback:old?.setback??60}};
 });
 const next=fitDrawerRails({...c,drawers:layoutDrawerIntents({...c,drawers})});evaluate(next);return next;
}
