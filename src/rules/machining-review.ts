import {clearedByRailNotches} from './notch-clearance';
import clipping from 'polygon-clipping';
import {pocketProfiles,circleProfile} from '../geometry/cut-profiles';
import {rearCornerLeg,backFixingAccess} from './rear-corner-clearance';
import {holesOverlap,intentionalHoleUnion,footHoleSafetyConflict} from './hole-collisions';
import type {Issue} from './validate';
import type {JoineryPanel,CabineoBore,CabineoJoint} from './cabineo';
import type {BackPocket} from './back-panel';
export function machiningFaces(panel:JoineryPanel,bores:CabineoBore[],pockets:BackPocket[]){
 const normal=panel.orientation==='yz'?0:panel.orientation==='xz'?1:2;
 const faces=new Set(bores.filter(b=>b.panelId===panel.id&&b.axis===normal&&!b.through&&b.depth<panel.size[normal]-.001).map(b=>-b.sign));
 pockets.filter(p=>p.panelId===panel.id&&p.axis===normal&&p.size[normal]<panel.size[normal]-.001).forEach(p=>faces.add(p.face));
 return faces;
}
/** Read-only review. Unsupported faces and interference remain visible, not erased. */
export function machiningReview(panels:JoineryPanel[],joints:CabineoJoint[],back:CabineoBore[],pockets:BackPocket[]):Issue[]{
 const issues:Issue[]=[],bores=[...joints.flatMap(j=>j.bores),...back],dedup=new Set<string>();
 const warn=(code:string,id:string,message:string,relatedIds:string[]=[],operationIds:string[]=[])=>{const key=code+id+message+(code==='machining-hole-collision'||relatedIds.length?JSON.stringify([relatedIds,operationIds]):'');if(!dedup.has(key)){dedup.add(key);issues.push({code,featureId:id,message,severity:'notice',relatedIds,operationIds});}};
 for(let i=0;i<bores.length;i++)for(let j=i+1;j<bores.length;j++){
  const a=bores[i],b=bores[j];if(a.panelId!==b.panelId||intentionalHoleUnion(a,b)||!holesOverlap(a,b)&&!footHoleSafetyConflict(a,b))continue;
  const label=(hole:CabineoBore)=>hole.kind==='foot-pilot'?'Foot hole':hole.kind==='housing'?'Cabineo housing':hole.kind==='hinge-pilot'?'Hinge screw hole':hole.kind==='hinge-cup'?'Hinge cup':hole.kind==='shelf-support'?'Shelf hole':hole.kind==='back-fixing'?'Back fixing':'Drilled hole';
  warn('machining-hole-collision',a.panelId,`${label(a)} ${holesOverlap(a,b)?'overlaps':'needs 4 mm clearance from'} ${label(b).toLowerCase()} on ${panels.find(p=>p.id===a.panelId)?.role??'part'}. Change the hole placement or fitting layout.`,[...new Set([a,b].filter(h=>h.kind==='foot-pilot').map(h=>h.group))],[a.id,b.id]);
 }
 for(const panel of panels){
  const faces=machiningFaces(panel,bores,pockets);
  if(faces.size<=1)continue;
  const insideBackSeat=panel.role==='bottom'&&pockets.some(p=>p.panelId===panel.id&&p.id.includes('/back-seat/')&&p.axis===1&&p.face===1&&p.size[1]<panel.size[1]-.001);
  const outsideFasteners=insideBackSeat&&bores.some(b=>b.panelId===panel.id&&b.axis===1&&b.sign===1&&!b.through&&b.depth<panel.size[1]-.001&&(b.kind==='housing'||b.kind==='back-fixing'));
  warn('machining-faces',panel.id,outsideFasteners?'Bottom panel: the back seat is cut from the inside and the fastener holes are cut from the outside. This requires machining both faces.':`${panel.role}: blind cuts on both faces require two-sided machining.`);
 }
 for(const bore of bores){
  const joint=joints.find(j=>j.id===bore.group),allowed=new Set([bore.panelId,...joint?[joint.hostId,joint.receiverId]:panels.filter(p=>p.role==='back').map(p=>p.id)]);
  for(const panel of panels){
   if(allowed.has(panel.id))continue;
   const cut=bore.kind==='back-fixing'&&['shelf','divider'].includes(panel.role)?backFixingAccess(bore):bore;
   const low=panel.center.map((n,i)=>n-panel.size[i]/2),high=panel.center.map((n,i)=>n+panel.size[i]/2),axis=cut.axis,end=cut.point[axis]+cut.sign*cut.depth;
   if(Math.min(high[axis],Math.max(cut.point[axis],end))-Math.max(low[axis],Math.min(cut.point[axis],end))<.001)continue;
   // Test the remaining material, not the extended divider's rectangular blank.
   const radius=cut.diameter/2,from=cut.point.map((n,i)=>Math.max(low[i],i===axis?Math.min(n,end):n-radius)),to=cut.point.map((n,i)=>Math.min(high[i],i===axis?Math.max(n,end):n+radius));
   if(clearedByRailNotches(from,to,pockets.filter(p=>p.panelId===panel.id&&p.kind==='rail-notch')))continue;
   if(bore.kind==='back-fixing'&&pockets.some(p=>p.panelId===panel.id&&p.kind==='corner-clearance'&&rearCornerLeg(panel,cut,p.id.endsWith('/high')?'high':'low')<=p.size[2]+.001))continue;
   const distance=Math.sqrt([0,1,2].filter(a=>a!==axis).reduce((sum,a)=>sum+Math.max(low[a]-bore.point[a],0,bore.point[a]-high[a])**2,0));
   if(distance<bore.diameter/2-.001)warn('machining-collision',bore.panelId,`${bore.kind==='back-fixing'?'Back fixing':bore.kind==='pilot'?'Pilot hole':bore.kind==='shelf-support'?'Shelf adjustment hole':bore.kind==='hinge-cup'||bore.kind==='hinge-pilot'?'Hinge drilling':bore.kind==='handle'?'Handle drilling':'Cabineo'} on ${panels.find(p=>p.id===bore.panelId)?.role??'part'} collides with ${panel.role}. Move the adjoining element or change the fastener layout.`,[panel.id],[bore.id]);
  }
  for(const pocket of pockets){
   // The edge-open housing deliberately meets its own rail-notch shoulder.
   if(pocket.kind==='rail-notch'&&joint?.hostId===pocket.panelId&&pocket.id.endsWith('/'+joint.receiverId.split('/').at(-1)))continue;
   if(pocket.panelId!==bore.panelId||bore.kind==='back-fixing'&&pocket.kind!=='puzzle')continue;
   if(pocket.outline&&bore.axis===pocket.axis){const axes=[0,1,2].filter(a=>a!==pocket.axis);if(!clipping.intersection(circleProfile(bore.point[axes[0]],bore.point[axes[1]],bore.diameter/2),...pocketProfiles(pocket,axes[0],axes[1])).length)continue;}
   const low=pocket.origin,high=low.map((n,i)=>n+pocket.size[i]),axis=bore.axis,end=bore.point[axis]+bore.sign*bore.depth;
   if(Math.min(high[axis],Math.max(bore.point[axis],end))-Math.max(low[axis],Math.min(bore.point[axis],end))<.001)continue;
   const distance=Math.sqrt([0,1,2].filter(a=>a!==axis).reduce((sum,a)=>sum+Math.max(low[a]-bore.point[a],0,bore.point[a]-high[a])**2,0));
   if(distance<bore.diameter/2+(bore.kind==='foot-pilot'?4:0)-.001)warn('machining-collision',bore.panelId,`${bore.kind==='foot-pilot'?'Foot hole needs 4 mm clearance from this cut. Fastener':'Fastener'} on ${panels.find(p=>p.id===bore.panelId)?.role??'part'} crosses a ${pocket.kind==='puzzle'?'puzzle notch':pocket.kind==='rail-notch'?'rail notch':pocket.kind==='hanger-access'?'wall hanger opening':'back seat'}. Adjust the joint or fastener layout.`,bore.kind==='foot-pilot'?[bore.group]:[],[bore.id]);
  }
 }
 return issues;
}
