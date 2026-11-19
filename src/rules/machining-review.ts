import type {Issue} from './validate';
import type {JoineryPanel,CabineoBore,CabineoJoint} from './cabineo';
import type {BackPocket} from './back-panel';
/** Read-only review. Unsupported faces and interference remain visible, not erased. */
export function machiningReview(panels:JoineryPanel[],joints:CabineoJoint[],back:CabineoBore[],pockets:BackPocket[]):Issue[]{
 const issues:Issue[]=[],bores=[...joints.flatMap(j=>j.bores),...back],dedup=new Set<string>();
 const warn=(code:string,id:string,message:string)=>{const key=code+id+message;if(!dedup.has(key)){dedup.add(key);issues.push({code,featureId:id,message,severity:'notice'});}};
 for(const panel of panels){
  const normal=panel.orientation==='yz'?0:panel.orientation==='xz'?1:2,faces=new Set(bores.filter(b=>b.panelId===panel.id&&!b.through).map(b=>-b.sign));
  pockets.filter(p=>p.panelId===panel.id&&p.size[normal]<panel.size[normal]-.001).forEach(p=>faces.add(p.face));
  if(faces.size>1)warn('machining-faces',panel.id,`${panel.role}: blind features require both faces. One-side machining is not possible in this layout; remove an opposed connection or change the layout.`);
 }
 for(const bore of bores){
  const joint=joints.find(j=>j.id===bore.group),allowed=new Set([bore.panelId,...joint?[joint.hostId,joint.receiverId]:panels.filter(p=>p.role==='back').map(p=>p.id)]);
  for(const panel of panels){
   if(allowed.has(panel.id))continue;
   const low=panel.center.map((n,i)=>n-panel.size[i]/2),high=panel.center.map((n,i)=>n+panel.size[i]/2),axis=bore.axis,end=bore.point[axis]+bore.sign*bore.depth;
   if(Math.min(high[axis],Math.max(bore.point[axis],end))-Math.max(low[axis],Math.min(bore.point[axis],end))<.001)continue;
   const distance=Math.sqrt([0,1,2].filter(a=>a!==axis).reduce((sum,a)=>sum+Math.max(low[a]-bore.point[a],0,bore.point[a]-high[a])**2,0));
   if(distance<bore.diameter/2-.001)warn('machining-collision',bore.panelId,`${bore.kind==='back-fixing'?'Back fixing':'Cabineo'} on ${panels.find(p=>p.id===bore.panelId)?.role??'part'} collides with ${panel.role}. Move the adjoining element or change the fastener layout.`);
  }
  for(const pocket of pockets){
   if(pocket.panelId!==bore.panelId||bore.kind==='back-fixing'&&pocket.kind!=='puzzle')continue;
   const low=pocket.origin,high=low.map((n,i)=>n+pocket.size[i]),axis=bore.axis,end=bore.point[axis]+bore.sign*bore.depth;
   if(Math.min(high[axis],Math.max(bore.point[axis],end))-Math.max(low[axis],Math.min(bore.point[axis],end))<.001)continue;
   const distance=Math.sqrt([0,1,2].filter(a=>a!==axis).reduce((sum,a)=>sum+Math.max(low[a]-bore.point[a],0,bore.point[a]-high[a])**2,0));
   if(distance<bore.diameter/2-.001)warn('machining-collision',bore.panelId,`Fastener on ${panels.find(p=>p.id===bore.panelId)?.role??'part'} crosses a ${pocket.kind==='puzzle'?'puzzle notch':'back seat'}. Adjust the joint or fastener layout.`);
  }
 }
 return issues;
}
