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
  const levels = Array.from({ length: Math.max(0, max + 1) }, (_, n) => n).filter(n => c.contents.filter(s => s.openingId === openingId).every(s => Math.abs(s.level - n) * p.pitch >= t + p.minClear));
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
export function fixedToAdjustable(c: Cabinet, id: string): Cabinet {
  const node = findDivision(c.compartments, id);
  if (!node || node.axis !== 'horizontal') throw new Error('Choose a fixed shelf.');
  if (node.children.some(child => child.kind !== 'opening' || c.contents.some(s => s.openingId === child.id))) throw new Error('Remove child divisions/adjustable shelves before converting this fixed shelf. Nothing was deleted.');
  const placement=evaluate(c).divisions.find(s=>s.id===id)!.position;
  const removed = removeDivision(c,id), t = stock(c,'interior').thickness;
  const shelf = { ...defaultShelf(node.id, shelfLevelForCentre(placement,t,{id:conceptShelfSupport.id,revision:conceptShelfSupport.revision})), id, frontSetback:node.frontSetback??10 };
  return { ...removed, banding: c.banding, contents: [...removed.contents, shelf] };
}
export function adjustableToFixed(c: Cabinet, id: string): Cabinet {
  const shelf = c.contents.find(s => s.id === id), layout = evaluate(c).adjustable.shelves.find(s => s.id === id);
  if (!shelf || !layout) throw new Error('Choose an adjustable shelf.');
  if (c.contents.some(s => s.id !== id && s.openingId === shelf.openingId)) throw new Error('Remove other adjustable shelves in this opening before converting it to a fixed division. Nothing was deleted.');
  const next = addDivision(removeAdjustable(c,id), shelf.openingId,'horizontal',Math.round(layout.position*10)/10,shelf.frontSetback).cabinet;
  const replace = (node: Cabinet['compartments']): Cabinet['compartments'] => node.kind === 'opening' ? node : { ...node, featureId: node.id === shelf.openingId ? id : node.featureId, children: node.children.map(replace) as typeof node.children };
  return { ...next, banding: c.banding, compartments: replace(next.compartments) };
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
 let converted=fixedToAdjustable(c,id);converted={...converted,contents:converted.contents.map(s=>s.id===id?{...s,frontSetback:findDivision(c.compartments,id)?.frontSetback??0}:s)};const o=resolveInteriors(converted,stock(converted,'carcass').thickness,stock(converted,'back').thickness,stock(converted,'interior').thickness).openings.find(o=>o.id===converted.contents.find(s=>s.id===id)!.openingId)!;
 const count=Math.min(5,shelfHoleMaximum(converted,o)),withHoles=setShelfHoles({...converted,contents:converted.contents.map(s=>s.id===id?{...s,drilling:{revision:'shelf-holes-1',count,firstLevel:Math.max(0,Math.min(s.level-Math.floor(count/2),shelfHoleMaximum(converted,o)-count))}}:s)},[id],count);
 return centreNewShelfHoles(withHoles,id);
}

function centreNewShelfHoles(c:Cabinet,id:string):Cabinet{
 const e=evaluate(c),s=c.contents.find(s=>s.id===id)!,o=e.openings.find(o=>o.id===s.openingId)!,bounds=shelfHoleBounds(c,o),half=(s.drilling!.count-1)*16,center=Math.round(Math.min(bounds.max-half,Math.max(bounds.min+half,o.size[1]/2))*10)/10;
 return Math.abs(center-o.size[1]/2)<.051?positionShelfHoles(c,[id],'centre'):positionShelfHoles(c,[id],'height',center);
}
export function addSimpleAdjustable(c:Cabinet,openingId:string,frontInset=0){
 const e=evaluate(c),o=e.openings.find(o=>o.id===openingId);if(!o)throw Error('Select an opening for this shelf.');
 const bounds=shelfHoleBounds(c,o),count=Math.min(5,Math.max(0,Math.floor((bounds.max-bounds.min)/32)+1));
 if(count<1)throw Error('This opening is too short for an adjustable shelf and its clearance.');
 const result=addAdjustable(c,openingId,{frontSetback:frontInset,holes:count}),t=stock(c,'interior').thickness;
 const partner=c.contents.find(s=>{if(!s.drilling)return false;const other=e.openings.find(p=>p.id===s.openingId)!;return Math.abs(other.origin[1]-o.origin[1])<.001&&Math.abs(other.size[1]-o.size[1])<.001&&(Math.abs(o.origin[0]+o.size[0]+t-other.origin[0])<.001||Math.abs(other.origin[0]+other.size[0]+t-o.origin[0])<.001);});
 const half=(count-1)*16,center=Math.round(Math.min(bounds.max-half,Math.max(bounds.min+half,o.size[1]/2))*10)/10;
 const drilling=partner?structuredClone(partner.drilling!):{revision:'shelf-holes-1' as const,count,firstLevel:0,anchor:Math.abs(center-o.size[1]/2)<.051?'centre' as const:'height' as const,center};
 return {...result,cabinet:{...result.cabinet,contents:result.cabinet.contents.map(s=>s.id===result.featureId?{...s,level:partner?partner.level:Math.floor((count-1)/2),drilling}:s)}};
}
