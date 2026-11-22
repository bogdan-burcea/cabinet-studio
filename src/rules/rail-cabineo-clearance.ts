import type {CabineoBore,CabineoJoint,JoineryPanel} from './cabineo';
import type {BackPocket} from './back-panel';
import {holesOverlap,SAFE_FEATURE_CLEARANCE} from './hole-collisions';
import {machiningReview} from './machining-review';
export class RailCabineoClearanceError extends Error{
 constructor(public roles:string[]){super('Divider-to-rail Cabineos need 10 mm clearance. Widen an adjoining rail to make room for safe fastener positions.');}
}
/** Slide complete matched joints along their rail, never individual housing circles.
 * Nominal layouts stay unchanged unless a rail joint actually conflicts. */
export function placeDividerRailCabineos(joints:CabineoJoint[],panels:JoineryPanel[],pockets:BackPocket[],fixed:CabineoBore[]){
 const byId=new Map(panels.map(p=>[p.id,p]));
 const movable=joints.filter(j=>byId.get(j.hostId)?.role==='divider'&&byId.get(j.receiverId)?.role.endsWith('-rail'));
 const overlaps=(a:CabineoJoint,b:CabineoJoint,gap=0)=>a.bores.some(x=>b.bores.some(y=>x.panelId===y.panelId&&holesOverlap({...x,diameter:x.diameter+2*gap},y)));
 for(let pass=0;pass<movable.length;pass++){
  const pair=joints.flatMap((a,i)=>joints.slice(i+1).filter(b=>overlaps(a,b)).map(b=>[a,b])).find(pair=>pair.some(j=>movable.includes(j)));
  if(!pair)return joints;
  let placed=false;
  for(const joint of pair.filter(j=>movable.includes(j))){
   const receiver=byId.get(joint.receiverId)!,host=byId.get(joint.hostId)!,axis=receiver.orientation==='xz'?2:1;
   const coordinate=joint.bores[0].point[axis],margin=7.5+SAFE_FEATURE_CLEARANCE;
   const low=Math.max(receiver.center[axis]-receiver.size[axis]/2,host.center[axis]-host.size[axis]/2)+margin;
   const high=Math.min(receiver.center[axis]+receiver.size[axis]/2,host.center[axis]+host.size[axis]/2)-margin;
   for(let distance=1;distance<=Math.ceil(high-low)+Math.ceil(Math.abs(coordinate-low))+1&&!placed;distance++)for(const sign of [-1,1]){
    const position=coordinate+sign*distance;if(position<low-.001||position>high+.001)continue;
    const candidate={...joint,bores:joint.bores.map(b=>({...b,point:b.point.map((n,i)=>n+(i===axis?sign*distance:0)) as typeof b.point}))};
    if(joints.some(other=>other!==joint&&overlaps(candidate,other,SAFE_FEATURE_CLEARANCE)))continue;
    if(candidate.bores.some(a=>fixed.some(b=>a.panelId===b.panelId&&holesOverlap({...a,diameter:a.diameter+2*SAFE_FEATURE_CLEARANCE},b))))continue;
    const inflated={...candidate,bores:candidate.bores.map(b=>({...b,diameter:b.diameter+2*SAFE_FEATURE_CLEARANCE}))};
    if(machiningReview(panels,[inflated],[],pockets).some(i=>i.code==='machining-collision'))continue;
    joint.bores=candidate.bores;placed=true;break;
   }
   if(placed)break;
  }
  if(!placed)throw new RailCabineoClearanceError([...new Set(pair.filter(j=>movable.includes(j)).map(j=>byId.get(j.receiverId)!.role))]);
 }
 if(joints.some((a,i)=>joints.slice(i+1).some(b=>(movable.includes(a)||movable.includes(b))&&overlaps(a,b))))throw new RailCabineoClearanceError([...new Set(movable.map(j=>byId.get(j.receiverId)!.role))]);
 return joints;
}
