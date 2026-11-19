import type {Cabinet,SlabDoor,Vec3} from '../domain/cabinet';
import type {FrontBody} from './fronts';
import {frontStructure} from './fronts';
import {effectiveDoor} from './front-links';
import {blumClip110 as profile} from '../catalogue/hinges';
import {conceptHandle} from '../catalogue/fronts';
import type {CabineoBore} from './cabineo';
export interface DoorHinge {id:string;ownerId:string;supportId:string;article:string;plate:string;y:number;cup:Vec3;softClose:boolean;mountingZone:{center:Vec3;size:Vec3}}
const precise=(n:number,min:number,max:number)=>Number.isFinite(n)&&n>=min&&n<=max&&Math.abs(n*10-Math.round(n*10))<1e-6;
/** Shared handle centre and drilling coordinates, measured to the visible envelope. */
export function handlePosition(front:SlabDoor,body:FrontBody){
 const h=front.handle,diameter=h.diameter??(h.kind==='hole'?30:conceptHandle.knobDiameter),length=h.kind==='pull'?h.pitch+2*conceptHandle.pullOverhang:diameter;
 const size=[h.kind==='pull'&&h.orientation==='vertical'?conceptHandle.pullThickness:length,h.kind==='pull'&&h.orientation==='horizontal'?conceptHandle.pullThickness:length];
 const anchor=h.horizontal??'latch',right=anchor==='right'||anchor==='latch'&&front.handing==='left';
 const x=body.center[0]+(anchor==='centre'?0:(right?1:-1)*(body.size[0]/2-h.edgeOffset-size[0]/2));
 const y=body.center[1]+(h.height==='centre'?0:(h.height==='top'?1:-1)*(body.size[1]/2-h.endOffset-size[1]/2));
 return {x,y,diameter};
}
export function doorHardware(c:Cabinet,doors:FrontBody[]){
 const bores:CabineoBore[]=[],hinges:DoorHinge[]=[];
 for(const body of doors){const front=effectiveDoor(c,c.fronts.find(d=>d.id===body.id)!),h=front.hinge;
  const rear=body.center[2]-body.size[2]/2,low=body.center[1]-body.size[1]/2,high=low+body.size[1];
  const add=(id:string,panelId:string,kind:CabineoBore['kind'],point:Vec3,axis:0|1|2,sign:1|-1,diameter:number,depth:number,through=false)=>bores.push({id,group:`${body.id}/hardware`,panelId,kind,point,axis,sign,diameter,depth,...through?{through:true}:{}});
  if(h){
   if(h.id!==profile.id||h.revision!==profile.revision||!Number.isInteger(h.count)||h.count<2||h.count>6||!precise(h.endOffset,35,300)||!precise(h.cupDistance,3,7))throw Error('Unsupported Blum hinge settings or revision.');
   if(body.size[2]<16||body.size[2]>26)throw Error('Blum 110° hinges require 16–26 mm door stock for this application.');
   if(body.size[1]-2*h.endOffset<45*(h.count-1))throw Error('Hinge positions need at least 45 mm separation. Reduce the end offset or hinge count.');
   if(h.offsets!==undefined&&(!Array.isArray(h.offsets)||h.offsets.length!==h.count||!h.offsets.every(n=>precise(n,-3000,3000))))throw Error('Hinge offsets must match the hinge count, in 0.1 mm steps.');
   const levels=Array.from({length:h.count},(_,i)=>low+h.endOffset+i*(body.size[1]-2*h.endOffset)/(h.count-1)+(h.offsets?.[i]??0));
   if(levels.some((y,i)=>y<low+35||y>high-35||i>0&&y-levels[i-1]<45))throw Error('Hinge positions need 35 mm end clearance and 45 mm separation.');
   const side=front.handing==='left'?-1:1,edge=body.center[0]+side*body.size[0]/2,cupX=edge-side*(h.cupDistance+17.5),boundary=c.envelope.origin[0]+c.envelope.width*front.region[front.handing];
   const outer=front.region[front.handing]===0||front.region[front.handing]===1;
   for(let i=0;i<h.count;i++){
    const y=levels[i],key=`${body.id}/hinge/${i}`;
    const support=frontStructure(c).find(p=>{
     const x=p.origin[0]+p.size[0]/2,aligned=front.region[front.handing]===0?Math.abs(p.origin[0]-c.envelope.origin[0])<.001:front.region[front.handing]===1?Math.abs(p.origin[0]+p.size[0]-c.envelope.origin[0]-c.envelope.width)<.001:Math.abs(x-boundary)<.11;
     return aligned&&y-16>=p.origin[1]&&y+16<=p.origin[1]+p.size[1]&&p.origin[2]+p.size[2]>=c.envelope.origin[2]+c.envelope.depth-40;
    });
    const article=front.placement==='inset'&&(outer||support&&support.origin[2]+support.size[2]>rear+.001)?profile.inset:outer?profile.overlay:profile.dual;
    if(!support)throw Error('A hinge mounting plate needs a real side panel or divider at every hinge position.');
    const supportId='id' in support?support.id as string:`${c.id}/panel/${support.role}`,face=side===-1?support.origin[0]+support.size[0]:support.origin[0],plateZ=c.envelope.origin[2]+c.envelope.depth-profile.plateLine-(front.placement==='inset'?body.size[2]+front.clearance:0);
    if(plateZ-1.5<support.origin[2]||plateZ+1.5>support.origin[2]+support.size[2])throw Error('The hinge plate line falls outside its support. Reduce the support front inset.');
    if(support.size[0]<9)throw Error('Hinge mounting supports need at least 9 mm stock for the selected pilot depth.');
    hinges.push({id:key,ownerId:body.id,supportId,article,plate:profile.plate,y,cup:[cupX,y,rear],softClose:profile.softClose,mountingZone:{center:[face-side*4,y,plateZ],size:[8,48,24]}});
    add(`${key}/cup`,body.id,'hinge-cup',[cupX,y,rear],2,1,35,13);
    for(const sign of [-1,1]){add(`${key}/cup-screw/${sign}`,body.id,'hinge-pilot',[cupX+side*9.5,y+sign*22.5,rear],2,1,2.5,10);add(`${key}/plate-screw/${sign}`,supportId,'hinge-pilot',[face,y+sign*16,plateZ],0,side,2.5,8);}
   }
  }
  if(front.handle.kind!=='none'){
   const {x,y,diameter}=handlePosition(front,body),handle=front.handle,count=handle.kind==='pull'?2:1;
   for(let i=0;i<count;i++){const delta=count===2?(i-.5)*handle.pitch:0;add(`${body.id}/handle-drill/${i}`,body.id,'handle',[x+(handle.orientation==='horizontal'?delta:0),y+(handle.orientation==='vertical'?delta:0),rear],2,1,handle.kind==='hole'?diameter:handle.drillDiameter??5,body.size[2],true);}
  }
 }
 return {bores,hinges};
}
