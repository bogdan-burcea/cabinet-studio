import {drawerPack,matchingDrawerPacks,innerDrawerSpec} from '../catalogue/drawers';
import type {Cabinet,Compartment} from '../domain/cabinet';
import {layoutDrawerIntents,defaultDrawerFront,drawerFrontSetback} from '../rules/drawer-layout';
import {stock} from '../catalogue/materials';
import {resolveInteriors} from '../rules/interiors';
import {evaluate} from '../geometry/evaluate';
import {resizeCabinet} from './dimensions';
import {moveAdjustable} from './adjustable';
import {moveDivision} from './interiors';
import type {EditRepair} from './edit-repairs';

export function drawerRepairs(candidate:Cabinet,previous:Cabinet):EditRepair[]{
 if(!candidate.drawers?.length)return [];
 const repairs:EditRepair[]=[];
 const layout=(c:Cabinet)=>resolveInteriors(c,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness);
 const prior=layout(previous);
 const valid=(c:Cabinet)=>{try{evaluate(c);return true;}catch{return false;}};
 function add(label:string,c:Cabinet){if(valid(c)&&!repairs.some(r=>JSON.stringify(r.cabinet)===JSON.stringify(c)))repairs.push({label,cabinet:c});}
 function rebound(c:Cabinet){
  const openings=layout(c).openings;
  return {...c,drawers:c.drawers!.map(d=>{
   if(openings.some(o=>o.id===d.openingId))return d;
   const old=prior.openings.find(o=>o.id===d.openingId);if(!old)return d;
   const descendants=(node:Compartment):string[]=>node.kind==='opening'?[node.id]:node.children.flatMap(descendants);
   const find=(node:Compartment):Compartment|undefined=>node.id===d.openingId?node:node.kind==='split'?find(node.children[0])??find(node.children[1]):undefined;
   const node=find(c.compartments),ids=new Set(node?descendants(node):[]);
   const absolute=old.origin[1]+d.offset;
   const fit=openings.find(o=>ids.has(o.id)&&o.origin[1]<=absolute+.001&&o.origin[1]+o.size[1]>=absolute+d.frontHeight-.001);
   return fit?{...d,openingId:fit.id,offset:+(absolute-fit.origin[1]).toFixed(1)}:d;
  })};
 }
 add('Keep drawers in the clear opening around the new shelf',rebound(candidate));
 const current=layout(candidate);
 // A taller construction may need more height even when the old allocations
 // still fit inside the cabinet. Offer an explicit automatic-height correction.
 const minimum=(d:NonNullable<Cabinet['drawers']>[number])=>{const p=drawerPack(d.pack);return d.internal?innerDrawerSpec(p).minimumHeight:p.minimumHeight;};
 let resolved=candidate.drawers;try{resolved=layoutDrawerIntents(candidate);}catch{}
 const groups=new Set(resolved.filter(d=>d.stack&&d.frontHeight<minimum(d)-.001).map(d=>d.stack!.groupId));
 if(groups.size){
  const automatic={...candidate,drawers:candidate.drawers.map(d=>d.stack&&groups.has(d.stack.groupId)?{...d,stack:{...d.stack,height:0}}:d)};
  let deficit=0;
  for(const groupId of groups){
   const group=automatic.drawers.filter(d=>d.stack?.groupId===groupId),opening=current.openings.find(o=>o.id===group[0].openingId);if(!opening)continue;
   const adjustment=(d:typeof group[number])=>{const f=d.front??defaultDrawerFront();return 2*f.gap-(f.placement==='overlay'?f.top+f.bottom:0);};
   const height=Math.max(...group.map(d=>minimum(d)-adjustment(d)));
   deficit=Math.max(deficit,Math.ceil(group.reduce((sum,d)=>sum+height+adjustment(d),0)-opening.size[1]-.00001));
  }
  try{
   const height=candidate.envelope.height+deficit;
   if(height<=3000){const sized=deficit?resizeCabinet(automatic,'height',height):automatic;add(`Use automatic drawer heights${deficit?` and increase cabinet height to ${height} mm`:''}`,{...sized,drawers:layoutDrawerIntents(sized)});}
  }catch{/* Structural or front constraints still apply to this correction. */}
 }

 const orphaned=candidate.drawers.filter(d=>!current.openings.some(o=>o.id===d.openingId));
 if(candidate.contents.length){
  try{
   const clear={...candidate,drawers:[]},shelves=evaluate(clear).adjustable.shelves;
   for(const shelf of shelves){
    for(const position of [...shelf.legalPositions].sort((a,b)=>Math.abs(a-shelf.position)-Math.abs(b-shelf.position))){
     const changed=moveAdjustable(clear,shelf.id,position);
     const trial={...changed,drawers:candidate.drawers};
     if(valid(trial)){add(`Move ${shelf.label.toLowerCase()} to a clear support level`,trial);break;}
    }
   }
  }catch{/* Other corrections remain available. */}
 }

 for(const shelf of current.divisions.filter(d=>d.axis==='horizontal')){
  const floor=shelf.origin[1]-shelf.before;
  const top=Math.max(...candidate.drawers.map(d=>{
   const opening=current.openings.find(o=>o.id===d.openingId)??prior.openings.find(o=>o.id===d.openingId);
   return opening?opening.origin[1]+d.offset+d.frontHeight:-Infinity;
  }));
  const position=Math.ceil(top-floor+shelf.size[1]/2);
  if(position>shelf.position&&position<=shelf.max){
   add(`Move ${shelf.label.toLowerCase()} to ${position} mm above the opening floor`,rebound(moveDivision(candidate,shelf.id,position)));
  }
 }
 // Offer the longest matched rail which fits, preserving the requested cabinet depth.
 const shorter={...candidate,drawers:candidate.drawers.map(d=>{
  const pack=drawerPack(d.pack),opening=current.openings.find(o=>o.id===d.openingId);
  if(!opening)return d;
  const inset=drawerFrontSetback(candidate,d);
  if(opening.size[2]>=pack.minimumDepth+inset)return d;
  const match=matchingDrawerPacks(pack).filter(p=>p.minimumDepth+inset<=opening.size[2]).sort((a,b)=>b.nominalLength-a.nominalLength)[0];
  return match?{...d,pack:{id:match.id,revision:match.revision}}:d;
 })};
 const changed=shorter.drawers.filter((d,i)=>d.pack.id!==candidate.drawers![i].pack.id);
 if(changed.length)add(`Use ${[...new Set(changed.map(d=>drawerPack(d.pack).nominalLength))].join(' / ')} mm rails to fit the cabinet depth`,shorter);
 const depth=Math.ceil(Math.max(candidate.envelope.depth,...candidate.drawers.map(d=>{
  const pack=drawerPack(d.pack),opening=current.openings.find(o=>o.id===d.openingId);
  const rear=opening?opening.origin[2]-candidate.envelope.origin[2]:stock(candidate,'back').thickness;
  const inset=drawerFrontSetback(candidate,d);
  return rear+pack.minimumDepth+inset;
 })));
 if(depth>candidate.envelope.depth&&depth<=1200)add(`Increase cabinet depth to ${depth} mm for the drawer runners`,rebound(resizeCabinet(candidate,'depth',depth)));
 const growth=Math.max(0,...candidate.drawers.map(d=>{
  const opening=current.openings.find(o=>o.id===d.openingId);
  return opening?Math.ceil(d.offset+d.frontHeight-opening.size[1]):0;
 }));
 if(growth>0&&candidate.envelope.height+growth<=3000)
  add(`Increase cabinet height to ${candidate.envelope.height+growth} mm`,rebound(resizeCabinet(candidate,'height',candidate.envelope.height+growth)));
 if(orphaned.length)add(`Remove ${orphaned.length} connected drawer${orphaned.length===1?'':'s'} (Undo restores them)`,{...candidate,drawers:candidate.drawers.filter(d=>!orphaned.some(o=>o.id===d.id))});
 return repairs;
}
