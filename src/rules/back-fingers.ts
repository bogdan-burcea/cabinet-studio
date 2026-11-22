import type {Cabinet,Vec3} from '../domain/cabinet';
import type {BackPocket} from './back-panel';
import {cnc} from './cnc';
/** Complementary through-cut fingers around the back's four edges.
 * Corners belong to the carcass; side/top patterns stop at the corner blocks. */
export function backFingerCuts(c:Cabinet,t:number,b:number):BackPocket[]{
 const joint=c.carcass.back.joint;if(!['full','rails-panel'].includes(c.carcass.back.mode)||joint?.mode!=='finger')return [];
 const {width:w,height:h,origin:o}=c.envelope,pitch=joint.fingerPitch??50,a=cnc(c).tolerance/2,cuts:BackPocket[]=[];
 const add=(role:string,key:string,origin:Vec3,size:Vec3,axis:0|1|2,face:1|-1)=>cuts.push({id:`${c.id}/back-finger/${role}/${key}`,panelId:`${c.id}/panel/${role}`,origin:origin.map((n,i)=>n+o[i]) as Vec3,size,axis,face,kind:'puzzle'});
 for(const x of [0,w-t])for(const y of [0,h-t])add('back',`corner/${x}/${y}`,[x,y,0],[t,t,b],2,-1);
 for(const [role,edge,high] of [['left',0,false],['right',0,true],['bottom',1,false],['top',1,true]] as const){
  if(role==='top'&&(c.carcass.top.mode==='open'||(c.carcass.top.mode==='rails'&&c.carcass.top.rearDepth===0)))continue;
  const along=(1-edge) as 0|1,span=(along===0?w:h)-2*t,count=Math.max(3,Math.ceil(span/pitch)),cell=span/count;
  if(2*a>=cell/2)throw Error('Joint fit allowance is too large for the back finger spacing.');
  for(let i=0;i<count;i++){
   const start=t+i*cell,end=t+(i+1)*cell,origin:Vec3=[0,0,0],size:Vec3=[w,h,b];
   origin[along]=Math.max(t,start-a);size[along]=Math.min((along===0?w:h)-t,end+a)-origin[along];
   origin[edge]=high?(edge===0?w:h)-t-(i%2===0?a:0):0;size[edge]=t+(i%2===0?a:0);
   if(i%2===0)add('back',`${role}/${i}`,origin,size,2,-1);
   else{size[2]=b+a;add(role==='top'&&c.carcass.top.mode==='rails'?'top-rear-rail':role,`${i}`,origin,size,edge,high?-1:1);}
  }
 }
 return cuts;
}
