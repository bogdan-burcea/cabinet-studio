import {cnc} from './cnc';
import type {Cabinet,Vec3} from '../domain/cabinet';
import type {BackPocket} from './back-panel';
/** Through-cut alternating fingers; geometric fit only, no tool-radius or load claim. */
export function puzzleCorners(c:Cabinet,t:number,rear:number):BackPocket[]{
 const joint=c.carcass.corner;if(!joint)return [];
 if(joint.revision!=='puzzle-1'||joint.mode!=='puzzle'||!Number.isFinite(joint.pitch)||joint.pitch<20||joint.pitch>200||Math.abs(joint.pitch*10-Math.round(joint.pitch*10))>1e-6)throw Error('Puzzle finger width must be 20–200 mm in 0.1 mm steps.');
 if(c.carcass.top.mode!=='full')throw Error('Puzzle corners require a full top.');
 const {width:w,height:h,depth:d,origin:o}=c.envelope,span=d-rear,count=Math.max(3,Math.ceil(span/joint.pitch)),pitch=span/count,out:BackPocket[]=[];
 const tolerance=cnc(c).tolerance;
 if(tolerance>=pitch/2)throw Error('Joint tolerance is too large for the finger spacing.');
 const add=(role:string,origin:Vec3,size:Vec3,axis:0|1,face:1|-1,index:number)=>{const start=Math.max(rear,origin[2]-tolerance/4),end=Math.min(d,origin[2]+size[2]+tolerance/4);origin[2]=start;size[2]=end-start;const edge=axis===0?1:0;if(origin[edge]===0)size[edge]+=tolerance;else{origin[edge]-=tolerance;size[edge]+=tolerance;}out.push({id:`${c.id}/puzzle/${role}/${index}`,panelId:`${c.id}/panel/${role}`,origin:origin.map((n,i)=>n+o[i]) as Vec3,size,axis,face,kind:'puzzle'});};
 for(let i=0;i<count;i++)for(const x of [0,w-t])for(const y of [0,h-t]){
  const z=rear+i*pitch;
  if(i%2===0)add(x===0?'left':'right',[x,y,z],[t,t,pitch],0,x===0?1:-1,i*2+(y===0?0:1));
  else add(y===0?'bottom':'top',[x,y,z],[t,t,pitch],1,y===0?1:-1,i*2+(x===0?0:1));
 }
 return out;
}
