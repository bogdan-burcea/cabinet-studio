import type {Cabinet,Vec3} from '../domain/cabinet';
import type {JoineryPanel,CabineoBore} from './cabineo';
import type {BackPocket} from './back-panel';
import {cnc} from './cnc';

export const cornerAxis=(panel:JoineryPanel):0|1=>panel.role==='divider'?1:0;
export function rearCornerCuts(c:Cabinet,panels:JoineryPanel[]):BackPocket[]{
 return panels.flatMap(panel=>{
  const cuts=cnc(c).rearChamfers?.[panel.id];
  if(!cuts||!['divider','shelf'].includes(panel.role))return [];
  const edge=cornerAxis(panel),normal=edge===0?1:0;
  const low=panel.center.map((n,i)=>n-panel.size[i]/2) as Vec3;
  if((cuts.low??0)+(cuts.high??0)>=panel.size[edge]||Math.max(cuts.low??0,cuts.high??0)>=panel.size[2])
   throw Error(`${panel.role}: the rear corner cuts must fit within the panel.`);
  return (['low','high'] as const).flatMap(side=>{
   const leg=cuts[side];if(!leg)return [];
   const high=side==='high',corner=[...low] as Vec3;
   if(high)corner[edge]+=panel.size[edge];
   const along=[...corner] as Vec3,rear=[...corner] as Vec3;
   along[edge]+=high?-leg:leg;rear[2]+=leg;
   const origin=[...low] as Vec3,size=[...panel.size] as Vec3;
   if(high)origin[edge]+=panel.size[edge]-leg;
   size[edge]=size[2]=leg;
   return [{id:`${panel.id}/rear-corner/${side}`,panelId:panel.id,kind:'corner-clearance' as const,axis:normal as 0|1,
    face:1 as const,origin,size,triangle:[corner,along,rear] as [Vec3,Vec3,Vec3]}];
  });
 });
}

/** Keep a small fitting-access margin at the open face of a back fixing. */
export function backFixingAccess(bore:CabineoBore):CabineoBore{
 const point=[...bore.point] as Vec3;
 point[bore.axis]-=bore.sign;
 return {...bore,point,depth:bore.depth+1};
}

/** Conservative bounds of the bore inside the panel, measured from each rear corner. */
export function rearCornerLeg(panel:JoineryPanel,bore:CabineoBore,side:'low'|'high'){
 const edge=cornerAxis(panel),low=panel.center.map((n,i)=>n-panel.size[i]/2),high=low.map((n,i)=>n+panel.size[i]);
 const end=bore.point[bore.axis]+bore.sign*bore.depth,radius=bore.diameter/2;
 const from=bore.point.map((n,i)=>Math.max(low[i],i===bore.axis?Math.min(n,end):n-radius));
 const to=bore.point.map((n,i)=>Math.min(high[i],i===bore.axis?Math.max(n,end):n+radius));
 if(from.some((n,i)=>n>=to[i]))return Infinity;
 return (side==='low'?to[edge]-low[edge]:high[edge]-from[edge])+to[2]-low[2];
}
