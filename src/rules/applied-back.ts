import {pilotDiameter} from '../catalogue/pilots';
import type {Cabinet} from '../domain/cabinet';
import {stock} from '../catalogue/materials';
import type {CabineoBore} from './cabineo';
export function backPilotLimits(c:Cabinet,diameter=pilotDiameter(c)){
 const t=stock(c,'carcass').thickness;return {maxDiameter:Math.floor(t/3*10)/10,minPitch:Math.max(t,diameter*3)};
}
export function backPilotCounts(c:Cabinet){
 const p=c.carcass.back.joint?.pilots,spacing=Math.max(p?.spacing??200,backPilotLimits(c,p?.diameter).minPitch),t=stock(c,'carcass').thickness,{width:w,height:h}=c.envelope;
 return {vertical:Math.max(2,Math.floor((h-t)/spacing)+1),horizontal:Math.max(1,Math.floor((w-2*t)/spacing)-1),spacing};
}
export function backPilots(c:Cabinet):CabineoBore[]{
 const j=c.carcass.back.joint;if(c.carcass.back.mode!=='full'||j?.mode!=='applied')return [];
 const b=stock(c,'back').thickness,t=stock(c,'carcass').thickness,limits=backPilotLimits(c,j.pilots?.diameter),p=j.pilots??{revision:'back-pilot-1',spacing:200,diameter:Math.min(pilotDiameter(c),limits.maxDiameter)};
 if(p.revision!=='back-pilot-1'||!Number.isFinite(p.spacing)||p.spacing<20||p.spacing>2000||Math.abs(p.spacing*10-Math.round(p.spacing*10))>1e-6||!Number.isFinite(p.diameter)||p.diameter<.5||p.diameter>limits.maxDiameter||Math.abs(p.diameter*10-Math.round(p.diameter*10))>1e-6)throw Error(`Applied-back pilots need minimum spacing 20–2000 mm and diameter 0.5–${limits.maxDiameter} mm (carcass thickness / 3).`);
 const {width:w,height:h,origin:[ox,oy,oz]}=c.envelope,counts=backPilotCounts(c),bores:CabineoBore[]=[];
 for(const [edge,span] of [['left',h],['right',h],['bottom',w],['top',w]] as const){
  if(edge==='top'&&(c.carcass.top.mode==='open'||(c.carcass.top.mode==='rails'&&c.carcass.top.rearDepth===0)))continue;
  const vertical=edge==='left'||edge==='right',count=vertical?counts.vertical:counts.horizontal;
  for(let i=0;i<count;i++){
   const along=vertical?t/2+(span-t)*i/(count-1):t+(span-2*t)*(i+1)/(count+1),id=`${c.id}/back-pilot/${edge}/${i}`;
   const x=vertical?(edge==='left'?t/2:w-t/2):along,y=vertical?along:(edge==='bottom'?t/2:h-t/2);
   bores.push({id,group:id,panelId:`${c.id}/panel/back`,kind:'pilot',point:[ox+x,oy+y,oz],axis:2,sign:1,diameter:p.diameter,depth:b,through:true});
  }
 }
 return bores;
}
