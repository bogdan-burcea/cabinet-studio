import {SAFE_FEATURE_CLEARANCE} from './hole-collisions';
import {resolveConstruction} from './construction';
import {pilotDiameter} from '../catalogue/pilots';
import type {Cabinet} from '../domain/cabinet';
import {stock} from '../catalogue/materials';
import type {CabineoBore,CabineoJoint,JoineryPanel} from './cabineo';
import type {BackPocket} from './back-panel';
import {machiningReview} from './machining-review';
export function backPilotLimits(c:Cabinet,diameter=pilotDiameter(c)){
 const t=stock(c,'carcass').thickness;return {maxDiameter:Math.floor(t/3*10)/10,minPitch:Math.max(t,diameter*3)};
}
export function backPilotCounts(c:Cabinet){
 const p=c.carcass.back.joint?.pilots,spacing=Math.max(p?.spacing??200,backPilotLimits(c,p?.diameter).minPitch),t=stock(c,'carcass').thickness,{width:w,height:h}=c.envelope;
 return {vertical:Math.max(2,Math.floor((h-t)/spacing)+1),horizontal:Math.max(1,Math.floor((w-2*t)/spacing)-1),spacing};
}
export function backPilots(c:Cabinet):CabineoBore[]{
 const j=c.carcass.back.joint;if(!['full','rails-panel'].includes(c.carcass.back.mode)||!['applied','rail-screws'].includes(j?.mode??''))return [];
 if(!j)return [];
 const b=stock(c,'back').thickness,t=stock(c,'carcass').thickness,limits=backPilotLimits(c,j.pilots?.diameter),p=j.pilots??{revision:'back-pilot-1',spacing:200,diameter:Math.min(pilotDiameter(c),limits.maxDiameter)};
 if(p.revision!=='back-pilot-1'||!Number.isFinite(p.spacing)||p.spacing<20||p.spacing>2000||Math.abs(p.spacing*10-Math.round(p.spacing*10))>1e-6||!Number.isFinite(p.diameter)||p.diameter<.5||p.diameter>limits.maxDiameter||Math.abs(p.diameter*10-Math.round(p.diameter*10))>1e-6)throw Error(`Applied-back pilots need minimum spacing 20–2000 mm and diameter 0.5–${limits.maxDiameter} mm (carcass thickness / 3).`);
 const {width:w,height:h,origin:[ox,oy,oz]}=c.envelope,counts=backPilotCounts(c),bores:CabineoBore[]=[];
 if(j.mode==='rail-screws'){
  const rails=resolveConstruction(c,t,b).panels.filter(p=>p.role==='back-upper-rail'||p.role==='back-lower-rail');
  if(!rails.length)throw Error('Screws from inside need at least one rear rail. Add a rail or choose grooves / dados.');
  for(const rail of rails)for(let i=0;i<counts.horizontal;i++){
   const x=rail.origin[0]+rail.size[0]*(i+1)/(counts.horizontal+1),y=rail.origin[1]+rail.size[1]/2,id=`${c.id}/back-pilot/${rail.role}/${i}`;
   bores.push({id,group:id,panelId:`${c.id}/panel/back`,kind:'pilot',point:[x,y,rail.origin[2]+rail.size[2]+b],axis:2,sign:-1,diameter:p.diameter,depth:b,through:true});
   bores.push({id:`${c.id}/rail-screw-receiver/${rail.role}/${i}`,group:id,panelId:`${c.id}/panel/${rail.role}`,kind:'pilot',point:[x,y,rail.origin[2]+rail.size[2]],axis:2,sign:-1,diameter:p.diameter,depth:Math.min(10,t-1)});
  }
  return bores;
 }
 for(const [edge,span] of [['left',h],['right',h],['bottom',w],['top',w]] as const){
  if(edge==='top'&&(c.carcass.top.mode==='open'||(c.carcass.top.mode==='rails'&&c.carcass.top.rearDepth===0)))continue;
  const vertical=edge==='left'||edge==='right',count=vertical?counts.vertical:counts.horizontal;
  for(let i=0;i<count;i++){
   const along=vertical?t/2+(span-t)*i/(count-1):t+(span-2*t)*(i+1)/(count+1),id=`${c.id}/back-pilot/${edge}/${i}`;
   const x=vertical?(edge==='left'?t/2:w-t/2):along,y=vertical?along:(edge==='bottom'?t/2:h-t/2);
   bores.push({id,group:id,panelId:`${c.id}/panel/back`,kind:'pilot',point:[ox+x,oy+y,oz],axis:2,sign:1,diameter:p.diameter,depth:b,through:true});
  }
 }
 if(c.carcass.back.mode==='rails-panel')for(const [side,height] of [['upper',c.carcass.back.upperHeight],['lower',c.carcass.back.lowerHeight]] as const){
  if(height<=0)continue;const topInset=c.carcass.top.mode==='full'||c.carcass.top.mode==='rails'&&c.carcass.top.rearDepth>0?t:0;
  const y=side==='upper'?h-topInset-height/2:t+height/2;
  for(let i=0;i<counts.horizontal;i++){const x=t+(w-2*t)*(i+1)/(counts.horizontal+1),id=`${c.id}/back-pilot/${side}-rail/${i}`;bores.push({id,group:id,panelId:`${c.id}/panel/back`,kind:'pilot',point:[ox+x,oy+y,oz],axis:2,sign:1,diameter:p.diameter,depth:b,through:true});}
 }
 return bores;
}

/** Keep inside screw rows clear of the Cabineo housings. */
export function placeRailScrewPilots(c:Cabinet,panels:JoineryPanel[],joints:CabineoJoint[],drilling:CabineoBore[],pockets:BackPocket[]){
 if(c.carcass.back.mode!=='rails-panel'||c.carcass.back.joint?.mode!=='rail-screws')return drilling;
 const adjusted=drilling.map(b=>({...b,point:[...b.point] as typeof b.point}));
 for(const hole of adjusted.filter(b=>b.id.includes('/back-pilot/'))){
  const pair=adjusted.filter(b=>b.group===hole.group),ids=new Set(pair.map(b=>b.id)),rail=panels.find(p=>p.id===pair.find(b=>b.id!==hole.id)!.panelId)!;
  const low=rail.center[0]-rail.size[0]/2+hole.diameter/2+SAFE_FEATURE_CLEARANCE,high=rail.center[0]+rail.size[0]/2-hole.diameter/2-SAFE_FEATURE_CLEARANCE,original=hole.point[0];let chosen:number|undefined;
  for(let delta=0;delta<=Math.ceil(rail.size[0])&&chosen===undefined;delta++)for(const sign of delta?[1,-1]:[1]){
   const x=original+delta*sign;if(x<low||x>high)continue;
   const candidates=pair.map(b=>({...b,point:[x,b.point[1],b.point[2]] as typeof b.point,diameter:b.diameter+2*SAFE_FEATURE_CLEARANCE}));
   if(!machiningReview(panels,joints,[...adjusted.filter(b=>!ids.has(b.id)),...candidates],pockets).some(i=>['machining-collision','machining-hole-collision'].includes(i.code)&&i.operationIds?.some(id=>ids.has(id)))){chosen=x;break;}
  }
  if(chosen===undefined)throw Error('No safe inside screw position remains on the rear rail. Increase the rail width, reduce the screw count or use grooves / dados.');
  pair.forEach(b=>b.point[0]=chosen!);
 }
 return adjusted;
}
