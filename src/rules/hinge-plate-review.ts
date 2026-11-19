import type {DoorHinge} from './door-hardware';
import type {JoineryPanel} from './cabineo';
import type {Issue} from './validate';
/** Conservative mounting-zone study, not manufacturer plate-body CAD. */
export function hingePlateReview(panels:JoineryPanel[],hinges:DoorHinge[]):Issue[]{
 return hinges.flatMap(h=>panels.filter(p=>p.id!==h.supportId&&p.id!==h.ownerId&&p.role!=='door'&&p.size.every((n,i)=>Math.min(p.center[i]+n/2,h.mountingZone.center[i]+h.mountingZone.size[i]/2)-Math.max(p.center[i]-n/2,h.mountingZone.center[i]-h.mountingZone.size[i]/2)>.01)).map(p=>({code:'machining-hinge-plate',featureId:h.ownerId,relatedIds:[h.supportId,p.id],operationIds:[h.id],severity:'notice' as const,message:`Hinge mounting zone meets ${p.role}. Move the hinge away from this part.`})));
}
