import {pilotDiameter} from '../catalogue/pilots';
import {resolveHandle} from './handles';
import type {Cabinet,SlabDoor,Vec3} from '../domain/cabinet';
import type {FrontBody} from './fronts';
import {frontStructure} from './fronts';
import {effectiveDoor} from './front-links';
import {resolveHinge,isMetalla,metallaMinimumGap,metallaNominalEdge,blumClip155,isThinHinge,thinPlateHeight,hingeProfiles,cupSetbackMax} from '../catalogue/hinges';
import {conceptHandle} from '../catalogue/fronts';
import type {CabineoBore} from './cabineo';
export interface DoorHinge {customMotion?:{openProtrusion:number;openingAdvance:number};profileId:string;id:string;ownerId:string;supportId:string;article:string;plate:string;y:number;cup:Vec3;softClose:boolean;maxAngle:number;mountingZone:{center:Vec3;size:Vec3}}
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
   const profile=resolveHinge(h),custom=h.id==='custom-hinge'?h.custom:undefined;
   if(!profile||h.revision!==profile.revision||!Number.isInteger(h.count)||h.count<2||h.count>6||!precise(h.endOffset,35,300))throw Error('Unsupported hinge settings or revision.');
   const thin=isThinHinge(h.id),cupMin=thin?23.5:3,cupMax=cupSetbackMax(h.id,front.placement==='inset');
   if(!precise(h.cupDistance,cupMin,cupMax))throw Error(`${profile.name} fixing distance must be ${cupMin}–${cupMax} mm in 0.1 mm steps.`);
   const metalla=isMetalla(h.id),wide=profile.id===blumClip155.id,minStock=custom?3:thin?8:metalla?15:16,maxStock=custom?40:thin?14:metalla?24:wide?31:26;
   if(body.size[2]<minStock||body.size[2]>maxStock)throw Error(`${metalla?profile.name:`Blum ${profile.maxAngle}°`}${thin?' EXPANDO T':''} hinges require ${minStock}–${maxStock} mm door stock for this application.`);
   if(custom&&Math.max(custom.cupDepth,custom.doorPilotDepth)>body.size[2]-1)throw Error('Custom hinge drilling exceeds the door thickness. Reduce the drilling depth or increase door thickness.');
   if(body.size[1]-2*h.endOffset<45*(h.count-1))throw Error('Hinge positions need at least 45 mm separation. Reduce the end offset or hinge count.');
   if(h.offsets!==undefined&&(!Array.isArray(h.offsets)||h.offsets.length!==h.count||!h.offsets.every(n=>precise(n,-3000,3000))))throw Error('Hinge offsets must match the hinge count, in 0.1 mm steps.');
   const levels=Array.from({length:h.count},(_,i)=>low+h.endOffset+i*(body.size[1]-2*h.endOffset)/(h.count-1)+(h.offsets?.[i]??0));
   if(levels.some((y,i)=>y<low+35||y>high-35||i>0&&y-levels[i-1]<45))throw Error('Hinge positions need 35 mm end clearance and 45 mm separation.');
   const side=front.handing==='left'?-1:1,edge=body.center[0]+side*body.size[0]/2,cupX=edge-side*(h.cupDistance+profile.cupDiameter/2),boundary=c.envelope.origin[0]+c.envelope.width*front.region[front.handing];
   const outer=front.region[front.handing]===0||front.region[front.handing]===1;
   for(let i=0;i<h.count;i++){
    const y=levels[i],key=`${body.id}/hinge/${i}`;
    const support=frontStructure(c).find(p=>{
     const x=p.origin[0]+p.size[0]/2,aligned=front.region[front.handing]===0?Math.abs(p.origin[0]-c.envelope.origin[0])<.001:front.region[front.handing]===1?Math.abs(p.origin[0]+p.size[0]-c.envelope.origin[0]-c.envelope.width)<.001:Math.abs(x-boundary)<.11;
     return aligned&&y-16>=p.origin[1]&&y+16<=p.origin[1]+p.size[1]&&p.origin[2]+p.size[2]>=c.envelope.origin[2]+c.envelope.depth-40;
    });
    const inset=front.placement==='inset'&&(outer||support&&support.origin[2]+support.size[2]>rear+.001);
    const article=inset?profile.inset:outer?profile.overlay:profile.dual;
    let plate:string=wide&&inset?blumClip155.insetPlate:profile.plate;
    if(!support)throw Error('A hinge mounting plate needs a real side panel or divider at every hinge position.');
    const supportId='id' in support?support.id as string:`${c.id}/panel/${support.role}`,face=side===-1?support.origin[0]+support.size[0]:support.origin[0],plateZ=c.envelope.origin[2]+c.envelope.depth-profile.plateLine-(custom?0:wide||thin||metalla?(inset?body.size[2]+1.5:0):(front.placement==='inset'?body.size[2]+front.clearance:0));
    if(thin){const height=thinPlateHeight(support.size[0],body.size[2]);if(height===6)throw Error('This thin-front combination requires a 6 mm plate; the EXPANDO T pack currently supports 0 or 3 mm cam plates.');plate=height===3?'173H7130':'173H7100';const expected=27+height-side*(face-edge);if(Math.abs(h.cupDistance-expected)>2.001)throw Error(`EXPANDO T fixing distance B must match this front overlay/reveal: ${+expected.toFixed(1)} mm nominal (±2 mm side adjustment).`);}
    if(metalla){
     const kind=inset?'inset':outer?'overlay':'dual',edgeDistance=-side*(edge-face),nominal=metallaNominalEdge(kind,h.cupDistance,profile.maxAngle);
     if(Math.abs(edgeDistance-nominal)>(profile.maxAngle===110?3.001:2.501))throw Error('Metalla mounting exceeds its side adjustment range. Adjust the cup setback, door reveal or overlay to match the H=0 plate.');
     const gap=metallaMinimumGap(body.size[2],h.cupDistance);
     if((inset?edgeDistance:front.reveal)+1e-6<gap)throw Error(`Metalla needs at least ${gap} mm edge gap at this thickness and cup setback. Increase the door reveal or reduce the cup setback.`);
    }
    const extra=wide?blumClip155.extraPlateSetback:0;
    if(plateZ-extra-1.5<support.origin[2]||plateZ+1.5>support.origin[2]+support.size[2])throw Error('The hinge plate line falls outside its support. Reduce the support front inset.');
    if(support.size[0]<(custom?custom.platePilotDepth+1:9))throw Error('Hinge mounting supports need at least 9 mm stock for the selected pilot depth.');
    const plateDepth=custom?custom.mountingDepth:metalla?56:wide?46:24,reach=custom?custom.mountingReach:metalla?12:thin?(plate==='173H7130'?11:8):wide&&inset?17.5:8;
    hinges.push({...custom?{customMotion:{openProtrusion:custom.openProtrusion,openingAdvance:custom.openingAdvance}}:{},profileId:h.id,id:key,ownerId:body.id,supportId,article,plate,y,cup:[cupX,y,rear],softClose:profile.softClose,maxAngle:profile.maxAngle,mountingZone:{center:[face-side*reach/2,y,plateZ-extra/2],size:[reach,custom?.mountingHeight??48,plateDepth]}});
    if(!thin)add(`${key}/cup`,body.id,'hinge-cup',[cupX,y,rear],2,1,profile.cupDiameter,profile.cupDepth);
    if(wide)add(`${key}/plate-screw/extra`,supportId,'hinge-pilot',[face,y,plateZ-extra],0,side,pilotDiameter(c),8);
    for(const sign of [-1,1]){add(`${key}/${thin?'expando':'cup-screw'}/${sign}`,body.id,'hinge-pilot',[cupX+side*profile.screwOffset,y+sign*profile.screwPitch/2,rear],2,1,thin?10:custom?.doorPilotDiameter??pilotDiameter(c),thin?6:custom?.doorPilotDepth??10);add(`${key}/plate-screw/${sign}`,supportId,'hinge-pilot',[face,y+sign*profile.platePitch/2,plateZ],0,side,custom?.platePilotDiameter??pilotDiameter(c),custom?.platePilotDepth??8);}
   }
  }
  bores.push(...resolveHandle(front.handle,body).bores);
 }
 return {bores,hinges};
}
