import {fingerInteriors,fingerInteriorIds} from './finger-interiors';
import {cnc} from './cnc';
import type {Cabinet,Vec3} from '../domain/cabinet';
import {stock} from '../catalogue/materials';
import {cabineoVariants,validHardware,type CabineoId} from '../catalogue/cabineo';
import {resolveConstruction} from './construction';
import {resolveInteriors} from './interiors';
export interface JoineryPanel {id:string;role:string;size:Vec3;center:Vec3;orientation:'yz'|'xz'|'xy'}
export interface CabineoBore {id:string;group:string;panelId:string;kind:'housing'|'receiver'|'back-fixing';point:Vec3;axis:0|1;sign:1|-1;diameter:number;depth:number;through?:boolean}
export interface CabineoJoint {id:string;hostId:string;receiverId:string;variant:CabineoId;bores:CabineoBore[]}
export function joineryPanels(c:Cabinet):JoineryPanel[]{
 const t=stock(c,'carcass').thickness,b=stock(c,'back').thickness;
 const original=[...resolveConstruction(c,t,b).panels.map(p=>({id:`${c.id}/panel/${p.role}`,role:p.role,size:p.size,center:p.origin.map((n,i)=>n+p.size[i]/2) as Vec3,orientation:p.orientation})),...resolveInteriors(c,t,b,stock(c,'interior').thickness).divisions.map(p=>({id:p.id,role:p.axis==='horizontal'?'shelf':'divider',size:p.size,center:p.origin.map((n,i)=>n+p.size[i]/2) as Vec3,orientation:p.axis==='horizontal'?'xz' as const:'yz' as const}))];
 return fingerInteriors(c,original).panels;
}
const lo=(p:JoineryPanel,a:number)=>p.center[a]-p.size[a]/2;
const hi=(p:JoineryPanel,a:number)=>p.center[a]+p.size[a]/2;
const normal=(p:JoineryPanel)=>p.orientation==='yz'?0:1;
export function resolveCabineo(c:Cabinet,panels=joineryPanels(c)):CabineoJoint[]{
 if(!validHardware(c.hardware))throw Error('Unsupported fastener or revision.');
 if(!c.hardware.length)return [];
 if(c.carcass.top.mode!=='full'||c.carcass.back.mode!=='full'||c.fronts.length||c.contents.length||c.drawers?.length||Object.keys(c.banding).length||c.installation.type!=='unassigned'||c.installation.mounting.mode!=='none'||c.installation.plinth.enabled)throw Error('Cabineo currently supports the simple cabinet with full panels and fixed interiors.');
 const variant=c.hardware[0].id as CabineoId, fitting=cabineoVariants[variant],out:CabineoJoint[]=[];
 const structural=panels.filter(p=>['left','right','top','bottom','shelf','divider'].includes(p.role));
 const fingerIds=fingerInteriorIds(c);
 const hosts=structural.filter(p=>!fingerIds.has(p.id)&&['top','bottom','shelf','divider'].includes(p.role)&&!(c.carcass.corner&&['top','bottom'].includes(p.role)));
 // A receiving bore fixes its physical face. Choose host housing faces to agree
 // with incoming bores and blind seating, rather than arbitrarily using the right face.
 const required=new Map<string,Set<number>>();
 const requireFace=(id:string,face:number)=>{const faces=required.get(id)??new Set<number>();faces.add(face);required.set(id,faces);};
 for(const pocket of resolveConstruction(c,stock(c,'carcass').thickness,stock(c,'back').thickness).pockets){const p=structural.find(p=>p.id===pocket.panelId);if(p&&pocket.size[pocket.axis]<p.size[pocket.axis]-.001)requireFace(p.id,pocket.face);}
 for(const host of hosts){const edgeAxis=1-normal(host);for(const side of [-1,1]){const edge=side===-1?lo(host,edgeAxis):hi(host,edgeAxis);const receiver=structural.find(p=>p.id!==host.id&&normal(p)===edgeAxis&&Math.abs((side===-1?hi(p,edgeAxis):lo(p,edgeAxis))-edge)<.001&&lo(p,normal(host))<=lo(host,normal(host))+.001&&hi(p,normal(host))>=hi(host,normal(host))-.001);if(receiver)requireFace(receiver.id,-side);}}
 for(const host of hosts){
  const faceAxis=normal(host),edgeAxis=(1-faceAxis) as 0|1,faceSign:1|-1=required.get(host.id)?.size===1?[...required.get(host.id)!][0] as 1|-1:host.role==='bottom'||host.role==='divider'?1:-1;
  const face=faceSign===1?hi(host,faceAxis):lo(host,faceAxis);
  if(host.size[faceAxis]<12)throw Error('Cabineo housings need panels at least 12 mm thick.');
  for(const side of [-1,1] as const){
   const edge=side===-1?lo(host,edgeAxis):hi(host,edgeAxis);
   const receiver=structural.find(p=>p.id!==host.id&&normal(p)===edgeAxis&&Math.abs((side===-1?hi(p,edgeAxis):lo(p,edgeAxis))-edge)<.001&&lo(p,faceAxis)<=lo(host,faceAxis)+.001&&hi(p,faceAxis)>=hi(host,faceAxis)-.001&&Math.min(hi(host,2),hi(p,2))-Math.max(lo(host,2),lo(p,2))>.001);
   if(!receiver)continue;
   if(Math.min(hi(host,2),hi(receiver,2))-Math.max(lo(host,2),lo(receiver,2))<40)throw Error('Cabineo needs at least 40 mm of joint depth.');
   if(receiver.size[edgeAxis]<fitting.screwDepth+1)throw Error(`${fitting.name} needs a receiving panel at least ${fitting.screwDepth+1} mm thick.`);
   if(host.size[edgeAxis]<67)throw Error('The panel is too narrow for opposing Cabineo housings.');
   const backClearance=c.carcass.back.joint?resolveConstruction(c,stock(c,'carcass').thickness,stock(c,'back').thickness).rearSetback:-Infinity;
   const front=Math.max(lo(host,2),lo(receiver,2),backClearance),back=Math.min(hi(host,2),hi(receiver,2)),setback=Math.min(50,(back-front)/2),first=front+setback,last=back-setback;
   const steps=Math.max(1,Math.ceil((last-first)/300)),custom=cnc(c).cabineoPerSide;
   if(custom>1&&((last-first)/(custom-1)>300||(last-first)/(custom-1)<20))throw Error('Cabineo count must keep 20–300 mm between connectors. Adjust the per-side count.');
   const positions=custom===1?[(front+back)/2]:custom>1?Array.from({length:custom},(_,i)=>first+(last-first)*i/(custom-1)):last-first<.001?[first]:Array.from({length:steps+1},(_,i)=>first+(last-first)*i/steps);
   for(const [index,z] of positions.entries()){
    const id=`${host.id}/cabineo/${side}/${index}`,bores:CabineoBore[]=[];
    for(const [j,offset] of [3.6,14.8,26].entries()){
     const point:Vec3=[0,0,z];point[edgeAxis]=edge-side*offset;point[faceAxis]=face;
     bores.push({id:`${id}/housing/${j}`,group:id,panelId:host.id,kind:'housing',point,axis:faceAxis as 0|1,sign:-faceSign as 1|-1,diameter:15,depth:11});
    }
    const point:Vec3=[0,0,z];point[edgeAxis]=edge;point[faceAxis]=face-faceSign*5;
    bores.push({id:`${id}/receiver`,group:id,panelId:receiver.id,kind:'receiver',point,axis:edgeAxis,sign:side,diameter:5,depth:fitting.screwDepth});
    out.push({id,hostId:host.id,receiverId:receiver.id,variant,bores});
   }
  }
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
