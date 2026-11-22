import {defaultBackJoint} from './back-panel';
import {stock} from '../catalogue/materials';
import type { Cabinet, Carcass } from '../domain/cabinet';
// Construction is a reviewed intent replacement. Compartment/product intent is never rewritten.
export function changeConstruction(cabinet: Cabinet, carcass: Carcass): Cabinet {
  return { ...cabinet, carcass: structuredClone(carcass) };
}

export function setConstructionMode(c:Cabinet,part:'top'|'back',mode:Carcass['back']['mode']):Cabinet{
 const next=structuredClone(c.carcass),span=part==='top'?c.envelope.depth-(['full','rails-panel'].includes(c.carcass.back.mode)&&c.carcass.back.joint?.mode==='applied'?stock(c,'back').thickness:0):c.envelope.height-2*stock(c,'carcass').thickness;
 if(part==='top'){if(mode==='rails-panel')throw Error('Rails with a panel is a back construction.');next.top.mode=mode;}else next.back.mode=mode;
 if(part==='back'&&mode==='rails-panel'){const j={...defaultBackJoint,...next.back.joint};j.mode=j.mode==='rail-screws'?'rail-screws':'groove';j.inset=stock(c,'carcass').thickness;next.back.joint=j;}
 if(next.back.joint?.fastener===undefined&&next.back.joint)delete next.back.joint.fastener;
 if(mode==='rails'||mode==='rails-panel'){
  const keys=part==='top'?['frontDepth','rearDepth'] as const:['upperHeight','lowerHeight'] as const;
  const values=part==='top'?next.top:next.back,record=values as unknown as Record<string,number>;
  if(record[keys[0]]+record[keys[1]]>span-20){if(record[keys[0]]===0||record[keys[1]]===0){record[record[keys[0]]===0?keys[1]:keys[0]]=span-20;return changeConstruction(c,next);}const available=span-20,first=Math.max(20,Math.min(available-20,Math.floor(available*record[keys[0]]/(record[keys[0]]+record[keys[1]]))));record[keys[0]]=first;record[keys[1]]=available-first;}
 }
 return changeConstruction(c,next);
}
export const defaultFrontRails=()=>({revision:'front-rail-1' as const,top:{enabled:false,width:80},bottom:{enabled:false,width:80}});
