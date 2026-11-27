import type {Cabinet} from '../domain/cabinet';
import {defaultHinge,hafeleMetalla110,hafeleMetalla155,hafeleMetalla155D4,metallaPlateDistance,hingeProfiles,metallaMinimumGap,metallaNominalEdge} from '../catalogue/hinges';
import {stock} from '../catalogue/materials';
import {resolveFronts,frontStructure} from '../rules/fronts';
import {editSimpleDoors} from './simple-doors';
export type MetallaId=typeof hafeleMetalla110.id|typeof hafeleMetalla155.id|typeof hafeleMetalla155D4.id;
/** Fit the selected plate using its published side-adjustment range. Keep door and
 * drawer identities/placement; increase the shared reveal only if necessary. */
export function fitMetallaHinges(c:Cabinet,ids:string[],id:MetallaId=hafeleMetalla155.id,{allowRevealChange=true}={}):Cabinet{
 let candidate=c;const profile=hingeProfiles[id];
 for(const doorId of ids){
  const original=c.fronts.find(d=>d.id===doorId);if(!original)continue;
  let found:Cabinet|undefined;
  let mismatch:string|undefined;
  for(let step=0;step<=(allowRevealChange?100:0);step++){
   const reveal=+(original.reveal+step/10).toFixed(1);if(reveal>10)break;
   const next=step?editSimpleDoors(candidate,[doorId],{reveal}):candidate;
   const body=resolveFronts(next).doors.find(d=>d.id===doorId);if(!body)continue;
   const front=next.fronts.find(d=>d.id===doorId)!,inward=front.handing==='left'?1:-1;
   const edge=body.pivot[0],boundary=c.envelope.origin[0]+c.envelope.width*front.region[front.handing];
   const support=frontStructure(next).find(p=>{
    const aligned=front.region[front.handing]===0?Math.abs(p.origin[0]-c.envelope.origin[0])<.001:front.region[front.handing]===1?Math.abs(p.origin[0]+p.size[0]-c.envelope.origin[0]-c.envelope.width)<.001:Math.abs(p.origin[0]+p.size[0]/2-boundary)<.11;
    return aligned&&p.origin[1]<=body.center[1]&&p.origin[1]+p.size[1]>=body.center[1];
   });if(!support)break;
   const face=support.origin[0]+(inward===1?support.size[0]:0),distance=inward*(edge-face),outer=front.region[front.handing]===0||front.region[front.handing]===1;
   const rear=body.center[2]-body.size[2]/2,inset=front.placement==='inset'&&(outer||support.origin[2]+support.size[2]>rear+.001),kind=inset?'inset':outer?'overlay':'dual';
   const nominalOverlay=-(metallaNominalEdge(kind,3,profile.maxAngle)+metallaPlateDistance(id));
   if(step===0&&kind==='overlay'){
    const allowance=profile.maxAngle===110?3:2.5;
    mismatch=`${body.label} has ${+(-distance).toFixed(1)} mm hinge-side overlay. The ${metallaPlateDistance(id)} mm plate needs at least ${nominalOverlay-allowance} mm at the minimum cup setback.`;
   }
   const preferred=original.hinge?.cupDistance??5,cups=Array.from({length:41},(_,i)=>+(3+i/10).toFixed(1)).sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred)||a-b);
   const cup=cups.find(value=>(inset?distance:reveal)+1e-6>=metallaMinimumGap(stock(next,'front',doorId).thickness,value)&&Math.abs(distance-metallaNominalEdge(kind,value,profile.maxAngle)-metallaPlateDistance(id))<=(profile.maxAngle===110?3.0001:2.5001));
   if(cup===undefined){
    // A larger reveal only reduces full overlay. Stop once even the smallest
    // cup setback is outside the plate's adjustment range.
    if(kind==='overlay'&&-distance<nominalOverlay-(profile.maxAngle===110?3.0001:2.5001))break;
    continue;
   }
   found={...next,fronts:next.fronts.map(d=>d.id===doorId?{...d,hinge:{...(({custom,...h})=>h)(d.hinge??defaultHinge(id)),id,revision:profile.revision,cupDistance:cup}}:d)};break;
  }
  if(!found)throw Error(mismatch??'Metalla cannot fit the current reveal and mounting plate. Choose a different hinge or plate.');
  candidate=found;
 }
 return candidate;
}
