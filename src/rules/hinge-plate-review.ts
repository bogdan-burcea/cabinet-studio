import type {DoorHinge} from './door-hardware';
import type {JoineryPanel} from './cabineo';
import type {Issue} from './validate';
/** Conservative mounting-zone study, not manufacturer plate-body CAD.
 * Front rails must also clear the approach to the plate, not only its body. */
export function hingePlateReview(panels:JoineryPanel[],hinges:DoorHinge[]):Issue[]{
 return hinges.flatMap(h=>panels.filter(p=>{
  if(p.id===h.supportId||p.id===h.ownerId||p.role==='door')return false;
  const access=['front-upper-rail','front-lower-rail','top-front-rail'].includes(p.role);
  const support=panels.find(p=>p.id===h.supportId),zone=h.mountingZone;
  const low=zone.center.map((n,i)=>n-zone.size[i]/2-(access&&i===1?2:0));
  const high=zone.center.map((n,i)=>n+zone.size[i]/2+(access&&i===1?2:0));
  if(access&&support)high[2]=Math.max(high[2],support.center[2]+support.size[2]/2);
  return p.size.every((n,i)=>Math.min(p.center[i]+n/2,high[i])-Math.max(p.center[i]-n/2,low[i])>.01);
 }).map(p=>({code:'machining-hinge-plate',featureId:h.ownerId,relatedIds:[h.supportId,p.id],operationIds:[h.id],severity:'notice' as const,message:['front-upper-rail','front-lower-rail','top-front-rail'].includes(p.role)?`Hinge plate installation is blocked by ${p.role==='top-front-rail'?'the front top rail':p.role==='front-upper-rail'?'the top front reinforcement':'the bottom front reinforcement'}. Move the hinge to a safe offset; keep the rail unchanged.`:`Hinge mounting zone meets ${p.role}. Move the hinge away from this part.`})));
}
