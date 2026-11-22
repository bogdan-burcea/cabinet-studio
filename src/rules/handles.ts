import type {SlabDoor,Vec3} from '../domain/cabinet';
import {conceptHandle,handleGeometry} from '../catalogue/fronts';
import type {CabineoBore} from './cabineo';
export type HandleSettings=SlabDoor['handle'];
export type HandlePart={id:string;ownerId:string;shape:'box'|'cylinder';size:Vec3;center:Vec3};
export function defaultDrawerHandle():HandleSettings{return {geometry:{id:conceptHandle.id,revision:conceptHandle.revision},kind:'none',pitch:128,orientation:'horizontal',horizontal:'centre',height:'top',edgeOffset:40,endOffset:32};}
const precise=(n:number,min:number,max:number)=>Number.isFinite(n)&&n>=min&&n<=max&&Math.abs(n*10-Math.round(n*10))<1e-6;
export function resolveHandle(handle:HandleSettings,body:{id:string;size:Vec3;center:Vec3;handing?:'left'|'right'}){
 const profile=handleGeometry(handle.geometry),parts:HandlePart[]=[],bores:CabineoBore[]=[];
 if(!['none','knob','pull','hole','notch'].includes(handle.kind)||!['vertical','horizontal'].includes(handle.orientation)||!['top','centre','bottom'].includes(handle.height)||!precise(handle.pitch,10,2000)||!precise(handle.edgeOffset,10,200)||!precise(handle.endOffset,10,300))throw Error('Unsupported handle style, pitch, placement or offset.');
 if(handle.horizontal!==undefined&&!['latch','left','centre','right'].includes(handle.horizontal)||handle.diameter!==undefined&&!precise(handle.diameter,10,handle.kind==='hole'?100:80)||handle.projection!==undefined&&!precise(handle.projection,12,80)||handle.drillDiameter!==undefined&&!precise(handle.drillDiameter,2,8))throw Error('Unsupported handle dimensions or position.');
 if(handle.notchEdge!==undefined&&!['left','right','top','bottom'].includes(handle.notchEdge)||handle.notchWidth!==undefined&&!precise(handle.notchWidth,10,500)||handle.notchDepth!==undefined&&!precise(handle.notchDepth,5,200)||handle.cornerDiameter!==undefined&&!precise(handle.cornerDiameter,1,100)||handle.outsideRadius!==undefined&&!precise(handle.outsideRadius,0,100))throw Error('Unsupported side-notch settings.');
 const diameter=handle.diameter??(handle.kind==='hole'?30:profile.knobDiameter),length=handle.kind==='pull'?handle.pitch+2*profile.pullOverhang:diameter;
 const sx=handle.kind==='pull'&&handle.orientation==='vertical'?profile.pullThickness:length,sy=handle.kind==='pull'&&handle.orientation==='horizontal'?profile.pullThickness:length;
 const anchor=handle.horizontal??'latch',right=anchor==='right'||anchor==='latch'&&(body.handing??'left')==='left';
 const x=body.center[0]+(anchor==='centre'?0:(right?1:-1)*(body.size[0]/2-handle.edgeOffset-sx/2));
 const y=body.center[1]+(handle.height==='centre'?0:(handle.height==='top'?1:-1)*(body.size[1]/2-handle.endOffset-sy/2));
 if(handle.kind==='none'||handle.kind==='notch')return {parts,bores,x,y,diameter};
 if(Math.abs(x-body.center[0])+sx/2>body.size[0]/2-5+1e-6||Math.abs(y-body.center[1])+sy/2>body.size[1]/2-5+1e-6)throw Error('handle envelope needs 5 mm clearance from the slab edges. Reduce pitch/offsets or enlarge the front.');
 const rear=body.center[2]-body.size[2]/2,face=rear+body.size[2];
 const add=(key:string,shape:HandlePart['shape'],size:Vec3,center:Vec3)=>parts.push({id:`${body.id}/handle/${key}`,ownerId:body.id,shape,size,center});
 if(handle.kind==='knob'){const projection=handle.projection??profile.knobProjection;add('knob','cylinder',[diameter,diameter,projection],[x,y,face+projection/2]);}
 if(handle.kind==='pull'){
  const b=profile.pullThickness,projection=handle.projection??profile.pullProjection,postDepth=projection-b;
  add('bar','box',[sx,sy,b],[x,y,face+projection-b/2]);
  for(const sign of [-1,1])add(sign<0?'post-1':'post-2','box',[b,b,postDepth],[x+(handle.orientation==='horizontal'?sign*handle.pitch/2:0),y+(handle.orientation==='vertical'?sign*handle.pitch/2:0),face+postDepth/2]);
 }
 const count=handle.kind==='pull'?2:1;
 for(let i=0;i<count;i++){
  const delta=count===2?(i-.5)*handle.pitch:0,id=`${body.id}/handle-drill/${i}`;
  bores.push({id,group:`${body.id}/handle`,panelId:body.id,kind:'handle',point:[x+(handle.orientation==='horizontal'?delta:0),y+(handle.orientation==='vertical'?delta:0),rear],axis:2,sign:1,diameter:handle.kind==='hole'?diameter:handle.drillDiameter??5,depth:body.size[2],through:true});
 }
 return {parts,bores,x,y,diameter};
}
