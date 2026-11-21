import {shelfDrilling} from './shelf-drilling';
import {fingerInteriors,fingerInteriorIds} from './finger-interiors';
import {cnc} from './cnc';
import {usesBlumWallHanger} from './wall-hanging';
import type {Cabinet,Vec3} from '../domain/cabinet';
import {stock} from '../catalogue/materials';
import {cabineoVariants,validHardware,type CabineoId} from '../catalogue/cabineo';
import {resolveConstruction} from './construction';
import {resolveInteriors} from './interiors';
export interface JoineryPanel {id:string;role:string;size:Vec3;center:Vec3;orientation:'yz'|'xz'|'xy'}
export interface CabineoBore {id:string;group:string;panelId:string;kind:'housing'|'receiver'|'back-fixing'|'pilot'|'shelf-support'|'hinge-cup'|'hinge-pilot'|'handle'|'foot-pilot';point:Vec3;axis:0|1|2;sign:1|-1;diameter:number;depth:number;through?:boolean}
export interface CabineoJoint {id:string;hostId:string;receiverId:string;variant:CabineoId;bores:CabineoBore[]}
export function joineryPanels(c:Cabinet):JoineryPanel[]{
 const t=stock(c,'carcass').thickness,b=stock(c,'back').thickness;
 const original=[...resolveConstruction(c,t,b).panels.map(p=>({id:`${c.id}/panel/${p.role}`,role:p.role,size:p.size,center:p.origin.map((n,i)=>n+p.size[i]/2) as Vec3,orientation:p.orientation})),...resolveInteriors(c,t,b,stock(c,'interior').thickness).divisions.map(p=>({id:p.id,role:p.axis==='horizontal'?'shelf':'divider',size:p.size,center:p.origin.map((n,i)=>n+p.size[i]/2) as Vec3,orientation:p.axis==='horizontal'?'xz' as const:'yz' as const}))];
 return fingerInteriors(c,original).panels;
}
const lo=(p:JoineryPanel,a:number)=>p.center[a]-p.size[a]/2;
const hi=(p:JoineryPanel,a:number)=>p.center[a]+p.size[a]/2;
const normal=(p:JoineryPanel)=>p.orientation==='yz'?0:p.orientation==='xz'?1:2;
export function resolveCabineo(c:Cabinet,panels=joineryPanels(c),fixedBores:CabineoBore[]=[]):CabineoJoint[]{
 if(!validHardware(c.hardware))throw Error('Unsupported fastener or revision.');
 if(!c.hardware.length)return [];

 if(c.contents.some(s=>!s.drilling)||Object.keys(c.banding).length)throw Error('Cabineo does not support imported shelf hardware, drawers or edge banding.');
 if(c.installation.mounting.mode!=='none'&&!usesBlumWallHanger(c))throw Error('Cabineo does not support this wall-mounting configuration.');
 const variant=c.hardware[0].id as CabineoId, fitting=cabineoVariants[variant],out:CabineoJoint[]=[];
 const structural=panels.filter(p=>!c.contents.some(s=>s.id===p.id)&&['left','right','top','bottom','shelf','divider','top-front-rail','top-rear-rail','back-upper-rail','back-lower-rail','front-upper-rail','front-lower-rail'].includes(p.role));
 const fingerIds=fingerInteriorIds(c);
 const hosts=structural.filter(p=>!fingerIds.has(p.id)&&['top','bottom','shelf','divider','top-front-rail','top-rear-rail','back-upper-rail','back-lower-rail','front-upper-rail','front-lower-rail'].includes(p.role)&&!(c.carcass.corner&&['top','bottom'].includes(p.role)));
 // A receiving bore fixes its physical face. Choose host housing faces to agree
 // with incoming bores and blind seating, rather than arbitrarily using the right face.
 const required=new Map<string,Set<number>>();
 const requireFace=(id:string,face:number)=>{const faces=required.get(id)??new Set<number>();faces.add(face);required.set(id,faces);};
 // Only blind broad-face cuts constrain the setup. Through adjustment rows
 // can be machined from either side; drawer/hinge pilots cannot.
 for(const bore of [...fixedBores,...shelfDrilling(c,panels,resolveInteriors(c,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness).openings)]){
  const panel=structural.find(p=>p.id===bore.panelId);
  if(panel&&!bore.through&&bore.axis===normal(panel)&&bore.depth<panel.size[bore.axis]-.001)requireFace(panel.id,-bore.sign);
 }
 for(const pocket of resolveConstruction(c,stock(c,'carcass').thickness,stock(c,'back').thickness).pockets){const p=structural.find(p=>p.id===pocket.panelId);if(p&&pocket.size[pocket.axis]<p.size[pocket.axis]-.001)requireFace(p.id,pocket.face);}
 for(const host of hosts){const edgeAxis=normal(host)===2?0:1-normal(host);for(const side of [-1,1]){const edge=side===-1?lo(host,edgeAxis):hi(host,edgeAxis);const receiver=structural.find(p=>p.id!==host.id&&normal(p)===edgeAxis&&Math.abs((side===-1?hi(p,edgeAxis):lo(p,edgeAxis))-edge)<.001&&lo(p,normal(host))<=lo(host,normal(host))+.001&&hi(p,normal(host))>=hi(host,normal(host))-.001);if(receiver)requireFace(receiver.id,-side);}}
 // Vertical rear/front rails butt against the top/bottom broad faces.
 // One centre connector ties that long edge to its actual horizontal neighbour.
 const middle=structural.filter(p=>['back-upper-rail','back-lower-rail','front-upper-rail','front-lower-rail'].includes(p.role)).flatMap(host=>([-1,1] as const).flatMap(side=>{
  const edge=side===-1?lo(host,1):hi(host,1);
  return structural.filter(p=>p.id!==host.id&&normal(p)===1&&Math.abs((side===-1?hi(p,1):lo(p,1))-edge)<.001&&lo(p,2)<=lo(host,2)+.001&&hi(p,2)>=hi(host,2)-.001&&Math.min(hi(host,0),hi(p,0))-Math.max(lo(host,0),lo(p,0))>=40).map(receiver=>({host,receiver,side}));
 }));
 middle.forEach(({receiver,side})=>requireFace(receiver.id,-side));
 const connect=(host:JoineryPanel,receiver:JoineryPanel,faceAxis:0|1|2,edgeAxis:0|1|2,along:0|1|2,faceSign:1|-1,side:1|-1,coordinate:number,id:string)=>{
  const face=faceSign===1?hi(host,faceAxis):lo(host,faceAxis),edge=side===-1?lo(host,edgeAxis):hi(host,edgeAxis),bores:CabineoBore[]=[];
  for(const [j,offset] of [3.6,14.8,26].entries()){
   const point:Vec3=[0,0,0];point[along]=coordinate;point[edgeAxis]=edge-side*offset;point[faceAxis]=face;
   bores.push({id:`${id}/housing/${j}`,group:id,panelId:host.id,kind:'housing',point,axis:faceAxis,sign:-faceSign as 1|-1,diameter:15,depth:11});
  }
  const point:Vec3=[0,0,0];point[along]=coordinate;point[edgeAxis]=edge;point[faceAxis]=face-faceSign*5;
  bores.push({id:`${id}/receiver`,group:id,panelId:receiver.id,kind:'receiver',point,axis:edgeAxis,sign:side,diameter:5,depth:fitting.screwDepth});
  out.push({id,hostId:host.id,receiverId:receiver.id,variant,bores});
 };
 for(const host of hosts){
  const faceAxis=normal(host),edgeAxis=(faceAxis===2?0:1-faceAxis) as 0|1,along=(faceAxis===2?1:2) as 1|2,faceSign:1|-1=host.role==='bottom'?(cnc(c).bottomFace==='inside'?1:-1):required.get(host.id)?.size===1?[...required.get(host.id)!][0] as 1|-1:host.role==='divider'||host.role.startsWith('back-')?1:-1;
  if(host.size[faceAxis]<12)throw Error('Cabineo housings need panels at least 12 mm thick.');
  for(const side of [-1,1] as const){
   const edge=side===-1?lo(host,edgeAxis):hi(host,edgeAxis);
   const receivers=structural.filter(p=>p.id!==host.id&&normal(p)===edgeAxis&&Math.abs((side===-1?hi(p,edgeAxis):lo(p,edgeAxis))-edge)<.001&&lo(p,faceAxis)<=lo(host,faceAxis)+.001&&hi(p,faceAxis)>=hi(host,faceAxis)-.001&&Math.min(hi(host,along),hi(p,along))-Math.max(lo(host,along),lo(p,along))>.001);
   for(const receiver of receivers){
   if(Math.min(hi(host,along),hi(receiver,along))-Math.max(lo(host,along),lo(receiver,along))<40)throw Error('Cabineo needs at least 40 mm of joint depth.');
   if(receiver.size[edgeAxis]<fitting.screwDepth+1)throw Error(`${fitting.name} needs a receiving panel at least ${fitting.screwDepth+1} mm thick.`);
   if(host.size[edgeAxis]<67)throw Error('The panel is too narrow for opposing Cabineo housings.');
   const backClearance=along===2&&c.carcass.back.mode==='full'&&c.carcass.back.joint?resolveConstruction(c,stock(c,'carcass').thickness,stock(c,'back').thickness).rearSetback:-Infinity;
   const front=Math.max(lo(host,along),lo(receiver,along),backClearance),back=Math.min(hi(host,along),hi(receiver,along)),setback=Math.min(50,(back-front)/2),first=front+setback,last=back-setback;
   const steps=Math.max(1,Math.ceil((last-first)/300)),custom=cnc(c).cabineoPerSide;
   // Keep the automatic count policy, but spread rail connectors across their
   // short width instead of crowding them inside the full-panel 50 mm setback.
   // Quarter points give a 120 mm rail a symmetric 30 / 90 mm pair.
   const railConnection=host.role.endsWith('-rail')||receiver.role.endsWith('-rail');
   const railSetback=railConnection?Math.min(setback,Math.max(20,Math.floor((back-front)/4))):setback;
   const usableSpan=back-front-2*railSetback;
   // The global count is a target: each rail contact uses only the count that
   // fits its own width. A narrow rail must not block edits to other joints.
   const count=custom&&railConnection?Math.min(custom,Math.floor((usableSpan+1e-6)/20)+1):custom;
   const spread=count>1?Math.min(usableSpan,300*(count-1)):0;
   if(count>1&&spread/(count-1)<20-1e-6)throw Error('This joint is too short for that many Cabineos. Keep at least 20 mm between connectors.');
   // End setback is a minimum. Centre short connector sets rather than forcing
   // them to span the entire joint and rejecting an otherwise valid count.
   const positions=count===1?[(front+back)/2]:count>1?Array.from({length:count},(_,i)=>(front+back-spread)/2+spread*i/(count-1)):last-first<20?[(front+back)/2]:Array.from({length:steps+1},(_,i)=>front+railSetback+usableSpan*i/steps);
   for(const [index,z] of positions.entries()){
    const id=`${host.id}/cabineo/${side}/${receivers.length>1?receiver.id.split('/').at(-1)+'/':''}${index}`;
    connect(host,receiver,faceAxis as 0|1|2,edgeAxis,along,faceSign,side,z,id);
   }
   }
  }
 }
 for(const {host,receiver,side} of middle){
  if(host.size[2]<12||host.size[1]<33.5)throw Error('A centred rail Cabineo needs stock at least 12 mm thick and rail width at least 33.5 mm.');
  if(receiver.size[1]<fitting.screwDepth+1)throw Error(`${fitting.name} needs a receiving panel at least ${fitting.screwDepth+1} mm thick.`);
  const faceSign:1|-1=required.get(host.id)?.size===1?[...required.get(host.id)!][0] as 1|-1:host.role.startsWith('back-')?1:-1;
  connect(host,receiver,2,1,0,faceSign,side,(Math.max(lo(host,0),lo(receiver,0))+Math.min(hi(host,0),hi(receiver,0)))/2,`${host.id}/cabineo/middle/${receiver.id.split('/').at(-1)}`);
 }
 // Blind fixing bores may oppose in a shared divider. Reject overlapping screws,
 // and housing/fixing interference, instead of silently deleting a connection.
 const bores=out.flatMap(j=>j.bores);
 for(let i=0;i<bores.length;i++)for(let k=i+1;k<bores.length;k++){
  const a=bores[i],b=bores[k];if(a.panelId!==b.panelId||a.group===b.group)continue;
  const amin=a.point.map((n,d)=>d===a.axis?Math.min(n,n+a.sign*a.depth):n-a.diameter/2),amax=a.point.map((n,d)=>d===a.axis?Math.max(n,n+a.sign*a.depth):n+a.diameter/2);
  const bmin=b.point.map((n,d)=>d===b.axis?Math.min(n,n+b.sign*b.depth):n-b.diameter/2),bmax=b.point.map((n,d)=>d===b.axis?Math.max(n,n+b.sign*b.depth):n+b.diameter/2);
  if([0,1,2].every(d=>Math.min(amax[d],bmax[d])-Math.max(amin[d],bmin[d])>.001))throw Error('Cabineo fittings overlap. Use Cabineo 8 for opposing joints in an 18 mm divider, or move the shelf/divider.');
 }
 return out;
}
