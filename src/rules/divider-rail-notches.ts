import type {Cabinet,Vec3,PanelRole} from '../domain/cabinet';
import type {JoineryPanel} from './cabineo';
import type {BackPocket} from './back-panel';
import type {Opening} from './interiors';
import {backLayout} from './back-panel';
import {stock} from '../catalogue/materials';
import {cnc} from './cnc';
import {addDogbones} from './dogbones';
/** Extend structural interiors to their outer datums, keeping the usable openings
 * unchanged. All actual rail intersections belong to the interior as through notches. */
export function dividerRailNotches<P extends JoineryPanel>(c:Cabinet,input:P[],root:Opening){
 const t=stock(c,'carcass').thickness,b=stock(c,'back').thickness,o=c.envelope.origin;
 const top=o[1]+c.envelope.height-(c.carcass.top.mode==='full'?t:0),bottom=o[1]+t;
 const rear=o[2]+(c.carcass.back.mode==='rails-panel'?backLayout(c,t,b).rearSetback:0),clearance=cnc(c).tolerance/2;
 const ids=new Set<string>(),fingerIds=new Set<string>();const walk=(node:Cabinet['compartments'])=>{if(node.kind==='split'){ids.add(node.featureId);if(node.joint)fingerIds.add(node.featureId);node.children.forEach(walk);}};walk(c.compartments);
 const panels=input.map(p=>({...p,size:[...p.size] as Vec3,center:[...p.center] as Vec3})),pockets:BackPocket[]=[];
 const rails=input.filter(p=>['top-front-rail','top-rear-rail','front-upper-rail','back-upper-rail','front-lower-rail','back-lower-rail'].includes(p.role));
 for(const panel of panels){
  if(!ids.has(panel.id))continue;
  const low=panel.center.map((n,i)=>n-panel.size[i]/2),high=panel.center.map((n,i)=>n+panel.size[i]/2),normal=panel.role==='divider'?0:1;
  const originalLow=[...low],originalHigh=[...high];
  if(panel.role==='divider'){
   if(Math.abs(high[1]-root.origin[1]-root.size[1])<.001)high[1]=top;
   if(Math.abs(low[1]-root.origin[1])<.001)low[1]=bottom;
  }
  // Keep the paired finger schedule and its receiving side slots unchanged.
  if(!fingerIds.has(panel.id)&&['rails','rails-panel'].includes(c.carcass.back.mode)&&Math.abs(low[2]-root.origin[2])<.001)low[2]=rear;
  for(const axis of [0,1,2])if(Math.abs(low[axis]-originalLow[axis])>.001||Math.abs(high[axis]-originalHigh[axis])>.001){panel.size[axis]=high[axis]-low[axis];panel.center[axis]=(high[axis]+low[axis])/2;}
  for(const rail of rails){
   const from=rail.center.map((n,i)=>Math.max(low[i],n-rail.size[i]/2-(i===normal?0:clearance))) as Vec3;
   const to=rail.center.map((n,i)=>Math.min(high[i],n+rail.size[i]/2+(i===normal?0:clearance))) as Vec3;
   if(from.some((n,i)=>to[i]-n<.001))continue;
   pockets.push({id:`${panel.id}/rail-notch/${rail.id.split('/').at(-1)}`,panelId:panel.id,kind:'rail-notch',axis:normal,face:1,origin:from,size:to.map((n,i)=>n-from[i]) as Vec3});
  }
 }
 return {panels,pockets:addDogbones(c,panels.map(p=>({...p,role:p.role as PanelRole,origin:p.center.map((n,i)=>n-p.size[i]/2) as Vec3})),pockets)};
}
