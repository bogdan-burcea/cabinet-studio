import {resolveInteriors} from '../rules/interiors';
import {shelfHoleBounds} from '../rules/shelf-pattern';
import {shelfPattern} from '../rules/shelf-pattern';
import {shelfHoleMaximum} from '../rules/shelf-drilling';
import type { AdjustableShelf, Cabinet } from '../domain/cabinet';
import { conceptShelfSupport } from '../catalogue/shelves';
import { shelfLevelForCentre } from '../rules/adjustable';
import { stock } from '../catalogue/materials';
import { evaluate } from '../geometry/evaluate';
import { findDivision, removeDivision, addDivision } from './interiors';
const defaultShelf = (openingId: string, level: number): AdjustableShelf => ({ id: crypto.randomUUID(), kind: 'adjustable-shelf', openingId, level, frontSetback: 10, policyRevision: 'adjustable-1', support: { id: conceptShelfSupport.id, revision: conceptShelfSupport.revision } });
export function addAdjustable(c: Cabinet, openingId: string, options: {frontSetback?:number; level?:number; id?:string; holes?:number} = {}) {
  const e = evaluate(c), opening = e.openings.find(o => o.id === openingId);
  if (!opening) throw new Error('Select an available leaf opening for an adjustable shelf.');
  const t = stock(c, 'interior').thickness, p = conceptShelfSupport;
  const max = Math.floor((opening.size[1] - p.minClear - t - p.firstLevel) / p.pitch);
  const levels = Array.from({ length: Math.max(0, max + 1) }, (_, n) => n).filter(n => c.contents.filter(s => s.openingId === openingId).every(s => Math.abs(e.adjustable.shelves.find(p=>p.id===s.id)!.position-(p.firstLevel+n*p.pitch+t/2)) >= t + p.minClear-1e-6));
  levels.sort((a,b) => Math.abs(p.firstLevel + a*p.pitch + t/2 - opening.size[1]/2) - Math.abs(p.firstLevel + b*p.pitch + t/2 - opening.size[1]/2));
  if (!levels.length) throw new Error('No free concept support level leaves 60 mm clear above/between shelves in this opening.');
  const shelf = { ...defaultShelf(openingId, options.level ?? levels[0]), ...(options.id?{id:options.id}:{}), frontSetback:options.frontSetback ?? 10, ...(options.holes===undefined?{}:{drilling:{revision:'shelf-holes-1' as const,count:options.holes,firstLevel:Math.max(0,Math.min((options.level??levels[0])-Math.floor(options.holes/2),max+1-options.holes))}}) };
  return { cabinet: { ...c, contents: [...c.contents, shelf] }, featureId: shelf.id };
}
export function moveAdjustable(c: Cabinet, id: string, centre: number): Cabinet {
  const shelf = c.contents.find(s => s.id === id); if (!shelf) throw new Error('This adjustable shelf no longer exists.');
  const positions=shelf.drilling&&Number.isFinite(centre)?evaluate(c).adjustable.shelves.find(s=>s.id===id)!.legalPositions:[];
  const target=positions.length?positions.reduce((a,b)=>Math.abs(b-centre)<Math.abs(a-centre)?b:a):centre;
  const level = shelf.drilling?shelf.drilling.firstLevel+shelfPattern(c,shelf,evaluate(c).openings.find(o=>o.id===shelf.openingId)!).undersides.findIndex(y=>Math.abs(y+stock(c,'interior').thickness/2-target)<1e-6):shelfLevelForCentre(target,stock(c,'interior').thickness,shelf.support);
  return { ...c, contents: c.contents.map(s => s.id === id ? { ...s, level } : s) };
}
export function setShelfSetback(c: Cabinet, id: string, frontSetback: number): Cabinet {
  return { ...c, contents: c.contents.map(s => s.id === id ? { ...s, frontSetback } : s) };
}
export function removeAdjustable(c: Cabinet, id: string): Cabinet {
  if (!c.contents.some(s => s.id === id)) throw new Error('This adjustable shelf no longer exists.');
  const banding = { ...c.banding }; delete banding[id];
  return { ...c, contents: c.contents.filter(s => s.id !== id), banding };
}
export function duplicateAdjustable(c: Cabinet, id: string) {
  const shelf = c.contents.find(s => s.id === id); if (!shelf) throw new Error('This adjustable shelf no longer exists.');
  const next = addAdjustable(c, shelf.openingId, {frontSetback:shelf.frontSetback,holes:shelf.drilling?.count});
  next.cabinet = { ...next.cabinet, contents: next.cabinet.contents.map(s => s.id === next.featureId ? { ...s, support: { ...shelf.support }, frontSetback: shelf.frontSetback } : s) };
  if (c.banding[id]) next.cabinet = { ...next.cabinet, banding: { ...c.banding, [next.featureId]: structuredClone(c.banding[id]) } };
  return next;
}
/** Merge a horizontal opening without throwing away its floating shelves. */
export function removeFixedShelfPreservingContents(c:Cabinet,id:string):Cabinet{
 const node=findDivision(c.compartments,id);
 if(!node||node.axis!=='horizontal'||node.children.some(n=>n.kind!=='opening'))throw Error('Choose a fixed shelf without child divisions.');
 const childIds=new Set(node.children.map(n=>n.id));
 if(c.drawers?.some(d=>childIds.has(d.openingId)))throw Error('This shelf bounds a drawer layout. Move the drawers before merging its openings. Nothing was changed.');
 const existing=c.contents.filter(s=>childIds.has(s.openingId));
 if(!existing.length)return removeDivision(c,id);
 const before=evaluate(c),empty=removeDivision({...c,contents:c.contents.filter(s=>!childIds.has(s.openingId))},id);
 const opening=resolveInteriors(empty,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness).openings.find(o=>o.id===node.id)!;
 const contents=c.contents.map(s=>{
  if(!childIds.has(s.openingId))return s;
  const old=before.openings.find(o=>o.id===s.openingId)!,layout=before.adjustable.shelves.find(p=>p.id===s.id)!;
  const center=old.origin[1]+(s.drilling?shelfPattern(c,s,old).center:layout.underside-conceptShelfSupport.padSize[1]/2)-opening.origin[1];
  if(Math.abs(center*10-Math.round(center*10))>1e-6)throw Error('This shelf hole pattern cannot keep its exact height in the merged opening. Nothing was changed.');
  return {...s,openingId:node.id,level:s.drilling?s.level-s.drilling.firstLevel:0,drilling:{...s.drilling,revision:'shelf-holes-1' as const,count:s.drilling?.count??1,firstLevel:0,anchor:'height' as const,center}};
 });
 return {...empty,contents};
}

export function fixedToAdjustable(c: Cabinet, id: string): Cabinet {
  const node = findDivision(c.compartments, id);
  if (!node || node.axis !== 'horizontal') throw new Error('Choose a fixed shelf.');
  if (node.children.some(child => child.kind !== 'opening')) throw new Error('Remove child divisions before converting this fixed shelf. Nothing was deleted.');
  const childIds=new Set(node.children.map(n=>n.id)),existing=c.contents.filter(s=>childIds.has(s.openingId));
  if(c.drawers?.some(d=>childIds.has(d.openingId)))throw Error('This fixed shelf bounds a drawer layout. Move the drawers before converting it. Nothing was deleted.');
  if(existing.length){
   const fixed=evaluate(c).divisions.find(s=>s.id===id)!;
   const merged=removeFixedShelfPreservingContents(c,id);
   const opening=resolveInteriors(merged,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness).openings.find(o=>o.id===node.id)!;
   const added=addSimpleAdjustable(merged,node.id,node.frontSetback??0,fixed.origin[1]+fixed.size[1]/2-opening.origin[1]);
   return {...added.cabinet,banding:c.banding,contents:added.cabinet.contents.map(s=>s.id===added.featureId?{...s,id}:s)};
  }
  const placement=evaluate(c).divisions.find(s=>s.id===id)!.position;
  const removed = removeDivision(c,id), t = stock(c,'interior').thickness;
  const shelf = { ...defaultShelf(node.id, shelfLevelForCentre(placement,t,{id:conceptShelfSupport.id,revision:conceptShelfSupport.revision})), id, frontSetback:node.frontSetback??10 };
  return { ...removed, banding: c.banding, contents: [...removed.contents, shelf] };
}
export function adjustableToFixed(c: Cabinet, id: string): Cabinet {
  const before=evaluate(c),shelf=c.contents.find(s=>s.id===id),layout=before.adjustable.shelves.find(s=>s.id===id);
  if(!shelf||!layout)throw Error('Choose an adjustable shelf.');
  if(c.drawers?.some(d=>d.openingId===shelf.openingId))throw Error('This shelf shares an opening with drawers. Move the drawers before splitting it. Nothing was changed.');
  const siblings=c.contents.filter(s=>s.id!==id&&s.openingId===shelf.openingId);
  const empty={...removeAdjustable(c,id),contents:c.contents.filter(s=>s.id!==id&&s.openingId!==shelf.openingId)};
  const next=addDivision(empty,shelf.openingId,'horizontal',Math.round(layout.position*10)/10,shelf.frontSetback,{featureId:id,children:[crypto.randomUUID(),crypto.randomUUID()]}).cabinet;
  if(!siblings.length)return {...next,banding:c.banding};
  const children=new Set(findDivision(next.compartments,id)!.children.map(n=>n.id));
  const openings=resolveInteriors(next,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness).openings.filter(o=>children.has(o.id));
  const contents=c.contents.filter(s=>s.id!==id).map(s=>{
   if(s.openingId!==shelf.openingId)return s;
   const original=before.openings.find(o=>o.id===s.openingId)!,body=before.adjustable.shelves.find(p=>p.id===s.id)!;
   const world=body.origin[1]+body.size[1]/2,opening=openings.find(o=>world>o.origin[1]&&world<o.origin[1]+o.size[1]);
   if(!opening)throw Error('An existing adjustable shelf meets the new fixed shelf. Move it before converting. Nothing was changed.');
   const center=original.origin[1]+(s.drilling?shelfPattern(c,s,original).center:body.underside-conceptShelfSupport.padSize[1]/2)-opening.origin[1];
   if(Math.abs(center*10-Math.round(center*10))>1e-6)throw Error('This shelf hole pattern cannot keep its exact height in the split opening. Nothing was changed.');
   return {...s,openingId:opening.id,level:s.drilling?s.level-s.drilling.firstLevel:0,drilling:{...s.drilling,revision:'shelf-holes-1' as const,count:s.drilling?.count??1,firstLevel:0,anchor:'height' as const,center}};
  });
  const result={...next,banding:c.banding,contents};evaluate(result);return result;
}

/** Link matching hole sets across an actual vertical divider, in world height. */
export function linkedShelfIds(c:Cabinet,ids:string[]):string[]{
 const e=evaluate(c),result=new Set(ids),t=stock(c,'interior').thickness;
 const center=(s:AdjustableShelf)=>{const o=e.openings.find(o=>o.id===s.openingId)!;return o.origin[1]+shelfPattern(c,s,o).center;};
 let changed=true;while(changed){changed=false;for(const a of c.contents.filter(s=>s.drilling&&result.has(s.id)))for(const b of c.contents.filter(s=>s.drilling&&!result.has(s.id))){
  const x=e.openings.find(o=>o.id===a.openingId)!,y=e.openings.find(o=>o.id===b.openingId)!;
  const neighbours=Math.abs(x.origin[0]+x.size[0]+t-y.origin[0])<.01||Math.abs(y.origin[0]+y.size[0]+t-x.origin[0])<.01;
  if(neighbours&&Math.abs(center(a)-center(b))<.1){result.add(b.id);changed=true;}
 }}return [...result];
}
export function setShelfHoles(c:Cabinet,ids:string[],count:number):Cabinet{
 const openings=evaluate(c).openings,linked=linkedShelfIds(c,ids);
 return {...c,contents:c.contents.map(s=>{if(!linked.includes(s.id))return s;const old=s.drilling!,index=s.level-old.firstLevel;
  if(old.anchor)return {...s,level:Math.max(0,Math.min(count-1,index)),drilling:{...old,count,firstLevel:0}};
  const firstLevel=Math.max(0,Math.min(s.level-Math.floor(count/2),shelfHoleMaximum(c,openings.find(o=>o.id===s.openingId)!)-count));return {...s,drilling:{...old,revision:'shelf-holes-1',count,firstLevel}};
 })};
}
export function positionShelfHoles(c:Cabinet,ids:string[],anchor:'centre'|'height',height?:number):Cabinet{
 const e=evaluate(c),linked=linkedShelfIds(c,ids),source=c.contents.find(s=>s.id===ids[0])!,opening=e.openings.find(o=>o.id===source.openingId)!,world=opening.origin[1]+(anchor==='centre'?opening.size[1]/2:height!);
 return {...c,contents:c.contents.map(s=>{if(!linked.includes(s.id))return s;const o=e.openings.find(o=>o.id===s.openingId)!,d=s.drilling!,sameBounds=Math.abs(o.origin[1]-opening.origin[1])<.001&&Math.abs(o.size[1]-opening.size[1])<.001;
  return {...s,level:s.level-d.firstLevel,drilling:{...d,firstLevel:0,anchor:anchor==='centre'&&sameBounds?'centre':'height',center:Math.round((world-o.origin[1])*10)/10}};
 })};
}
export function changeSimpleShelfKind(c:Cabinet,id:string,kind:'fixed'|'adjustable'):Cabinet{
 if(kind==='fixed')return adjustableToFixed(c,id);
 let converted=fixedToAdjustable(c,id);if(converted.contents.find(s=>s.id===id)?.drilling)return converted;converted={...converted,contents:converted.contents.map(s=>s.id===id?{...s,frontSetback:findDivision(c.compartments,id)?.frontSetback??0}:s)};const o=resolveInteriors(converted,stock(converted,'carcass').thickness,stock(converted,'back').thickness,stock(converted,'interior').thickness).openings.find(o=>o.id===converted.contents.find(s=>s.id===id)!.openingId)!;
 const count=Math.min(5,shelfHoleMaximum(converted,o)),withHoles=setShelfHoles({...converted,contents:converted.contents.map(s=>s.id===id?{...s,drilling:{revision:'shelf-holes-1',count,firstLevel:Math.max(0,Math.min(s.level-Math.floor(count/2),shelfHoleMaximum(converted,o)-count))}}:s)},[id],count);
 return centreNewShelfHoles(withHoles,id);
}

function centreNewShelfHoles(c:Cabinet,id:string):Cabinet{
 const e=evaluate(c),s=c.contents.find(s=>s.id===id)!,o=e.openings.find(o=>o.id===s.openingId)!,bounds=shelfHoleBounds(c,o),half=(s.drilling!.count-1)*16,center=Math.round(Math.min(bounds.max-half,Math.max(bounds.min+half,o.size[1]/2))*10)/10;
 return Math.abs(center-o.size[1]/2)<.051?positionShelfHoles(c,[id],'centre'):positionShelfHoles(c,[id],'height',center);
}
export function addSimpleAdjustable(c:Cabinet,openingId:string,frontInset=0,desiredCentre?:number){
 const e=evaluate(c),o=e.openings.find(o=>o.id===openingId);if(!o)throw Error('Select an opening for this shelf.');
 const bounds=shelfHoleBounds(c,o),t=stock(c,'interior').thickness,pad=conceptShelfSupport.padSize[1]/2,clear=conceptShelfSupport.minClear;
 const siblings=e.adjustable.shelves.filter(s=>s.nodeId===openingId).sort((a,b)=>a.position-b.position);
 const fits=(underside:number)=>underside>=clear-1e-6&&underside+t+clear<=o.size[1]+1e-6&&siblings.every(s=>Math.abs(underside+t/2-s.position)>=t+clear-1e-6);
 // Keep symmetry with an available opposing set, never reuse an occupied level.
 const partners=c.contents.filter(s=>{if(!s.drilling)return false;const other=e.openings.find(p=>p.id===s.openingId)!;return Math.abs(other.origin[1]-o.origin[1])<.001&&Math.abs(other.size[1]-o.size[1])<.001&&(Math.abs(o.origin[0]+o.size[0]+t-other.origin[0])<.001||Math.abs(other.origin[0]+other.size[0]+t-o.origin[0])<.001);});
 const partner=partners.find(s=>(desiredCentre===undefined||Math.abs(e.adjustable.shelves.find(p=>p.id===s.id)!.position-desiredCentre)<16)&&fits(e.adjustable.shelves.find(p=>p.id===s.id)!.underside));
 let drilling:NonNullable<AdjustableShelf['drilling']>,level:number;
 if(partner){drilling=structuredClone(partner.drilling!);level=partner.level;}
 else{
  const countMax=Math.floor((bounds.max-bounds.min)/32)+1;if(countMax<1)throw Error('This opening is too short for an adjustable shelf and its clearance.');
  const firstSibling=c.contents.find(s=>s.openingId===openingId&&s.drilling),count=Math.min(5,countMax),half=(count-1)*16;
  const defaultCenter=Math.round(Math.min(bounds.max-half,Math.max(bounds.min+half,desiredCentre===undefined?o.size[1]/2:desiredCentre-t/2-pad))*10)/10;
  const phase=firstSibling?shelfPattern(c,firstSibling,o).ys[0]:siblings.length?conceptShelfSupport.firstLevel-pad:defaultCenter;
  const first=phase+Math.ceil((bounds.min-phase-1e-6)/32)*32,last=phase+Math.floor((bounds.max-phase+1e-6)/32)*32;
  const ys=Array.from({length:Math.max(0,Math.round((last-first)/32)+1)},(_,i)=>first+i*32).filter(y=>fits(y+pad));
  const gaps=[...siblings.map((s,i)=>({low:i?siblings[i-1].underside+t:0,high:s.underside})),{low:siblings.length?siblings.at(-1)!.underside+t:0,high:o.size[1]}].sort((a,b)=>desiredCentre===undefined?(b.high-b.low)-(a.high-a.low)||a.low-b.low:Math.abs((a.low+a.high)/2-desiredCentre)-Math.abs((b.low+b.high)/2-desiredCentre));
  let selected:number|undefined;
  for(const gap of gaps){const available=ys.filter(y=>y+pad>=gap.low+clear-1e-6&&y+pad+t+clear<=gap.high+1e-6),target=desiredCentre===undefined?(siblings.length?(gap.low+gap.high-t)/2-pad:defaultCenter):desiredCentre-t/2-pad;available.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)||a-b);if(available.length){selected=available[0];break;}}
  if(selected===undefined)throw Error('No space for another adjustable shelf: keep at least 60 mm clear between panels. Move an existing shelf or enlarge the opening.');
  const actualCount=Math.min(count,Math.round((last-first)/32)+1),windowFirst=Math.min(last-(actualCount-1)*32,Math.max(first,selected-Math.floor((actualCount-1)/2)*32)),center=Math.round((windowFirst+(actualCount-1)*16)*10)/10;
  level=Math.round((selected-windowFirst)/32);
  drilling={revision:'shelf-holes-1',count:actualCount,firstLevel:0,anchor:Math.abs(center-o.size[1]/2)<.051?'centre':'height',center};
 }
 const shelf={...defaultShelf(openingId,level),frontSetback:frontInset,drilling};
 return {cabinet:{...c,contents:[...c.contents,shelf]},featureId:shelf.id};
}
