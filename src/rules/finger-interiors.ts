import type {Cabinet,Compartment,Vec3} from '../domain/cabinet';
import type {JoineryPanel} from './cabineo';
import type {BackPocket} from './back-panel';
import {cnc} from './cnc';
export function fingerInteriorIds(c:Cabinet){const joints=new Map<string,{pitch:number}>();function walk(n:Compartment){if(n.kind==='split'){if(n.joint){if(n.joint.mode!=='finger'||n.joint.revision!=='finger-1'||!Number.isFinite(n.joint.pitch)||n.joint.pitch<20||n.joint.pitch>200||Math.abs(n.joint.pitch*10-Math.round(n.joint.pitch*10))>1e-6)throw Error('Interior finger width must be 20–200 mm.');joints.set(n.featureId,n.joint);}n.children.forEach(walk);}}walk(c.compartments);return joints;}
export function fingerInteriors<P extends JoineryPanel>(c:Cabinet,input:P[]):{panels:P[];pockets:BackPocket[]}{
 const settings=fingerInteriorIds(c),panels=input.map(p=>({...p,size:[...p.size] as Vec3,center:[...p.center] as Vec3})),pockets:BackPocket[]=[],tol=cnc(c).tolerance;
 const low=(p:P,a:number)=>p.center[a]-p.size[a]/2,high=(p:P,a:number)=>p.center[a]+p.size[a]/2;
 for(const [id,joint] of settings){const host=panels.find(p=>p.id===id),original=input.find(p=>p.id===id);if(!host||!original)throw Error('Finger joint refers to an unavailable interior.');const normal=host.orientation==='xz'?1:0,edge=(1-normal) as 0|1,span=host.size[2],count=Math.max(3,Math.ceil(span/joint.pitch)),pitch=span/count;if(tol>=pitch/2)throw Error('Joint tolerance is too large for the interior finger spacing.');
  for(const side of [-1,1] as const){const boundary=side===-1?low(original,edge):high(original,edge),target=input.find(p=>p.id!==id&&(p.orientation==='xz'?1:p.orientation==='yz'?0:2)===edge&&Math.abs((side===-1?high(p,edge):low(p,edge))-boundary)<.001&&low(p,normal)<=low(original,normal)+.001&&high(p,normal)>=high(original,normal)-.001);if(!target)throw Error('An interior finger joint needs a supporting panel at each end.');
   const extension=target.size[edge],min=low(host,edge)+(side===-1?-extension:0),max=high(host,edge)+(side===1?extension:0);host.center[edge]=(min+max)/2;host.size[edge]=max-min;
   for(let i=0;i<count;i++){const z0=Math.max(low(original,2),low(original,2)+i*pitch-tol/2),z1=Math.min(high(original,2),low(original,2)+(i+1)*pitch+tol/2),origin=[...original.center] as Vec3,size=[...original.size] as Vec3;origin[2]=z0;size[2]=z1-z0;
    if(i%2===0){origin[edge]=side===-1?boundary-extension:boundary;size[edge]=extension;origin[normal]=low(original,normal)-tol/2;size[normal]=original.size[normal]+tol;pockets.push({id:`${id}/finger/${side}/${i}`,panelId:target.id,origin,size,axis:edge,face:-side as 1|-1,kind:'puzzle'});}
    else{origin[edge]=side===-1?boundary-extension:boundary-tol/2;size[edge]=extension+tol/2;origin[normal]=low(original,normal);size[normal]=original.size[normal];pockets.push({id:`${id}/finger/${side}/${i}`,panelId:id,origin,size,axis:normal,face:normal===1?-1:1,kind:'puzzle'});}
   }
  }
 }
 return {panels,pockets};
}
