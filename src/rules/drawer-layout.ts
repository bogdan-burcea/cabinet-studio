import type {Cabinet,MetalDrawer} from '../domain/cabinet';
import {stock} from '../catalogue/materials';
import {resolveInteriors} from './interiors';

export const drawerFrontSetback=(c:Cabinet,d:MetalDrawer)=>d.internal?.setback??(d.front?.placement==='inset'?stock(c,'carcass').thickness+d.front.clearance:0);
export const defaultDrawerFront=()=>({placement:'overlay' as const,gap:2,clearance:2,left:0,right:0,top:0,bottom:0});
export function drawerOpenings(c:Cabinet){return resolveInteriors(c,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness).openings;}
/** Store height intent independently of evaluated pitches. Order is top to bottom. */
export function layoutDrawerIntents(c:Cabinet):MetalDrawer[]{
 const drawers=(c.drawers??[]).map(d=>({...d})),openings=drawerOpenings(c);
 for(const groupId of new Set(drawers.flatMap(d=>d.stack?[d.stack.groupId]:[]))){
  const group=drawers.filter(d=>d.stack?.groupId===groupId).sort((a,b)=>a.stack!.order-b.stack!.order);
  if(group.some((d,i)=>d.openingId!==group[0].openingId||d.stack!.order!==i||!Number.isFinite(d.stack!.height)||d.stack!.height<0||Math.abs(d.stack!.height*10-Math.round(d.stack!.height*10))>1e-6)||new Set(group.map(d=>d.stack!.order)).size!==group.length)throw Error('Drawer stack: invalid height or drawer order.');
  const opening=openings.find(o=>o.id===group[0].openingId);if(!opening)continue;
  const last=group.at(-1)!;
  const pitch=(d:MetalDrawer,h:number)=>{const f=d.front??defaultDrawerFront();return h+2*f.gap-(f.placement==='overlay'?f.top+f.bottom:0);};
  const fixed=group.filter(d=>d!==last&&d.stack!.height>0),auto=group.filter(d=>!fixed.includes(d));
  const remaining=opening.size[1]-fixed.reduce((n,d)=>n+pitch(d,d.stack!.height),0);
  // Equal actual front heights, even when top/bottom overlaps differ.
  const automatic=Math.floor((remaining-auto.reduce((n,d)=>n+pitch(d,0),0))/auto.length*10+1e-7)/10;
  if(automatic<=0)throw Error('Drawer stack: front heights leave no space for the bottom drawer. Reduce an edited front height.');
  const heights=new Map(group.map(d=>[d.id,fixed.includes(d)?d.stack!.height:automatic]));
  const bottomPitch=+(opening.size[1]-group.filter(d=>d!==last).reduce((n,d)=>n+pitch(d,heights.get(d.id)!),0)).toFixed(1);
  const bottomFront=bottomPitch-pitch(last,0);if(bottomFront<=0)throw Error('Drawer stack: no space remains for the bottom front. Reduce an edited front height.');
  heights.set(last.id,bottomFront);
  let offset=0;
  for(const d of [...group].reverse()){
   d.offset=+offset.toFixed(1);d.frontHeight=+pitch(d,heights.get(d.id)!).toFixed(1);offset+=d.frontHeight;
  }

 }
 return drawers;
}

export function recommendedDrawerFront(c:Cabinet,d:MetalDrawer,placement:'overlay'|'inset'){
 const old=d.front??defaultDrawerFront();if(placement==='inset')return {...old,placement};
 const opening=drawerOpenings(c).find(o=>o.id===d.openingId);if(!opening)return {...old,placement};
 const t=stock(c,'carcass').thickness,e=c.envelope;
 const group=layoutDrawerIntents(c).filter(v=>v.openingId===d.openingId);
 const here=group.find(v=>v.id===d.id)??d;
 const lower=Math.min(...group.map(v=>v.offset)),upper=Math.max(...group.map(v=>v.offset+v.frontHeight));
 const left=opening.origin[0]-e.origin[0]<=t+.001?t:t/2;
 const right=e.origin[0]+e.width-opening.origin[0]-opening.size[0]<=t+.001?t:t/2;
 const atBottom=Math.abs(here.offset-lower)<.001,atTop=Math.abs(here.offset+here.frontHeight-upper)<.001;
 const bottom=atBottom?(opening.origin[1]-e.origin[1]<=t+.001?t:t/2):0;
 const top=atTop?(e.origin[1]+e.height-opening.origin[1]-opening.size[1]<=t+.001?t:t/2):0;
 return {...old,placement,left,right,top,bottom};
}
