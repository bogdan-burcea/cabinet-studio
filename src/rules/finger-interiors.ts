import type {Cabinet,Compartment,Vec3} from '../domain/cabinet';
import type {JoineryPanel} from './cabineo';
import type {BackPocket} from './back-panel';
import {cnc} from './cnc';
export function fingerInteriorIds(c:Cabinet){const joints=new Map<string,{pitch:number}>();function walk(n:Compartment){if(n.kind==='split'){if(n.joint){if(n.joint.mode!=='finger'||n.joint.revision!=='finger-1'||!Number.isFinite(n.joint.pitch)||n.joint.pitch<20||n.joint.pitch>200||Math.abs(n.joint.pitch*10-Math.round(n.joint.pitch*10))>1e-6)throw Error('Interior finger width must be 20–200 mm.');joints.set(n.featureId,n.joint);}n.children.forEach(walk);}}walk(c.compartments);return joints;}
export const rearFingerClearance=20;
export function fingerInteriors<P extends JoineryPanel>(c:Cabinet,input:P[],constructionCuts:readonly BackPocket[]=[]):{panels:P[];pockets:BackPocket[]}{
 const settings=fingerInteriorIds(c),panels=input.map(p=>({...p,size:[...p.size] as Vec3,center:[...p.center] as Vec3})),pockets:BackPocket[]=[],tol=cnc(c).tolerance;
 const low=(p:P,a:number)=>p.center[a]-p.size[a]/2,high=(p:P,a:number)=>p.center[a]+p.size[a]/2;
 for(const [id,joint] of settings){
  const host=panels.find(p=>p.id===id),original=input.find(p=>p.id===id);
  if(!host||!original)throw Error('Finger joint refers to an unavailable interior.');
  const normal=host.orientation==='xz'?1:0,edge=(1-normal) as 0|1;
  const rear=low(original,2),front=high(original,2),normalLow=low(original,normal);
  const supports=([-1,1] as const).map(side=>{
   const boundary=side===-1?low(original,edge):high(original,edge);
   const target=input.find(p=>p.id!==id&&(p.orientation==='xz'?1:p.orientation==='yz'?0:2)===edge&&
    Math.abs((side===-1?high(p,edge):low(p,edge))-boundary)<.001&&
    low(p,normal)<=low(original,normal)+.001&&high(p,normal)>=high(original,normal)-.001);
   if(!target||low(target,2)>rear+.001||high(target,2)<front-.001)throw Error('Interior finger joints need continuous supporting panels at both ends. Use butt joints for the divider or restore a full top.');
   return {side,boundary,target};
  });
  // Both ends use the same schedule. Leave solid stock between the new
  // slots and any rear seat, allowing for the relief on both cuts.
  let start=rear;
  const tool=cnc(c),relief=tool.dogbones?tool.bitDiameter*(1-1/Math.SQRT2):0;
  for(const {target} of supports)for(const cut of constructionCuts){
   if(cut.panelId!==target.id||(!cut.id.includes('/back-seat/')&&!cut.id.includes('/back-finger/')))continue;
   if(cut.origin[normal]>high(original,normal)+tol/2+relief||
    cut.origin[normal]+cut.size[normal]<low(original,normal)-tol/2-relief)continue;
   const end=Math.max(cut.origin[2]+cut.size[2],...(cut.reliefs??[]).map(r=>r.center[2]+r.radius));
   const safeStart=end+rearFingerClearance+2*relief+tol/2;
   if(safeStart>rear)start=Math.max(start,safeStart,rear+(tool.dogbones?tool.bitDiameter:0));
  }
  const span=front-start,count=Math.max(3,Math.ceil(span/joint.pitch)),pitch=span/count;
  if(span<=0||tol>=pitch/2)throw Error('The back seat leaves too little depth for the interior finger joints. Increase cabinet depth or reduce the rear inset.');
  for(const {side,boundary,target} of supports){
   const extension=target.size[edge],min=low(host,edge)+(side===-1?-extension:0),max=high(host,edge)+(side===1?extension:0);
   host.center[edge]=(min+max)/2;host.size[edge]=max-min;
   const trim=(key:string,z0:number,z1:number,inset:number)=>{
    const origin=[...original.center] as Vec3,size=[...original.size] as Vec3;
    origin[2]=z0;size[2]=z1-z0;origin[edge]=side===-1?boundary-extension:boundary-inset;
    size[edge]=extension+inset;origin[normal]=normalLow;
    pockets.push({id:`${id}/finger/${side}/${key}`,panelId:id,origin,size,axis:normal,face:normal===1?-1:1,kind:'puzzle'});
   };
   if(start>rear)trim('rear',rear,start,0);
   for(let i=0;i<count;i++){
    const z0=Math.max(start,start+i*pitch-tol/2),z1=Math.min(front,start+(i+1)*pitch+tol/2);
    if(i%2!==0){trim(String(i),z0,z1,tol/2);continue;}
    const origin=[...original.center] as Vec3,size=[...original.size] as Vec3;
    origin[2]=z0;size[2]=z1-z0;origin[edge]=side===-1?boundary-extension:boundary;size[edge]=extension;
    origin[normal]=low(original,normal)-tol/2;size[normal]=original.size[normal]+tol;
    pockets.push({id:`${id}/finger/${side}/${i}`,panelId:target.id,origin,size,axis:edge,face:-side as 1|-1,kind:'puzzle'});
   }
  }
 }
 return {panels,pockets};
}
