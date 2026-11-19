import {cnc} from './cnc';
import type {Cabinet,Vec3} from '../domain/cabinet';
export interface BackPocket {reliefs?:{center:Vec3;radius:number}[];kind?:'puzzle';id:string;panelId:string;origin:Vec3;size:Vec3;axis:0|1|2;face:1|-1}
/** Back seating intent is independent of UI, stock catalogue and rendering. */
export function backLayout(c:Cabinet,t:number,b:number){
 const {width:w,height:h,depth:d,origin:o}=c.envelope;
 const joint=c.carcass.back.joint,mode=joint?.mode??'inset',depth=joint?.depth??6,inset=mode==='groove'?(joint?.inset??10):0,clearance=cnc(c).tolerance/2;
 const errors:string[]=[];
 if(joint&&(joint.revision!=='back-1'||!['inset','applied','groove','rebate','finger'].includes(mode)||![depth,inset,joint.clearance,joint.inset].every(n=>Number.isFinite(n)&&Math.abs(n*10-Math.round(n*10))<1e-6)||depth<1||(['groove','rebate'].includes(mode)&&depth>t-3)||joint.inset<3||joint.inset>100||(joint.clearance<0||joint.clearance>1)))errors.push('Use a back seat depth from 1 mm to panel thickness minus 3 mm, rear inset 3–100 mm and clearance 0–1 mm.');
 if(joint&&c.carcass.back.mode!=='full')errors.push('Back-panel seating requires a full back panel.');
 if(joint&&mode!=='inset'&&c.carcass.top.mode!=='full')errors.push('Back seating options require a full top panel.');
 if(mode==='groove'&&inset-clearance<3)errors.push('The back groove must leave at least 3 mm behind it.');
 if(mode==='finger'&&(!Number.isFinite(joint?.fingerPitch??50)||(joint?.fingerPitch??50)<20||(joint?.fingerPitch??50)>200||Math.abs((joint?.fingerPitch??50)*10-Math.round((joint?.fingerPitch??50)*10))>1e-6))errors.push('Back finger width must be 20–200 mm in 0.1 mm steps.');
 const seated=mode==='groove'||mode==='rebate',applied=mode==='applied';
 if(seated&&clearance>=depth)errors.push('Joint clearance leaves no back engagement. Reduce tolerance or increase seat depth.');
 const bodyRear=applied?b:0,rearSetback=inset+b;
 if(d-rearSetback<60)errors.push('The back must leave at least 60 mm of usable interior depth.');
 const lower:Vec3=applied||mode==='finger'?[0,0,0]:[t-(seated?depth-clearance:0),t-(seated?depth-clearance:0),inset];
 const size:Vec3=applied||mode==='finger'?[w,h,b]:[w-2*lower[0],h-2*lower[1],b];
 const pockets:BackPocket[]=[];
 if(seated){
  const z=mode==='rebate'?0:inset-clearance,cutWidth=b+2*clearance;
  const add=(role:string,local:Vec3,size:Vec3,axis:0|1,face:1|-1)=>pockets.push({id:`${c.id}/back-seat/${role}`,panelId:`${c.id}/panel/${role}`,origin:local.map((n,i)=>n+o[i]) as Vec3,size,axis,face});
  add('left',[t-depth,0,z],[depth,h,cutWidth],0,1);
  add('right',[w-t,0,z],[depth,h,cutWidth],0,-1);
  add('bottom',[t,t-depth,z],[w-2*t,depth,cutWidth],1,1);
  add('top',[t,h-t,z],[w-2*t,depth,cutWidth],1,-1);
 }
 return {mode,bodyRear,rearSetback,origin:lower,size,pockets,errors};
}
