import clipping from 'polygon-clipping';
import type {Cabinet,SlabDoor,ShakerSettings,Vec3} from '../domain/cabinet';
import type {FrontBody} from './fronts';
import type {BackPocket} from './back-panel';
import type {CabineoBore} from './cabineo';
import type {Panel,EvaluatedCabinet} from '../geometry/evaluate';
import {panelMaterials} from '../geometry/banding';
import {binding} from '../catalogue/materials';
import {cnc} from './cnc';
import {roundSeam,expandPolygon,clipToJointEdge} from './shaker-joints';
import {circleProfile,pocketProfiles} from '../geometry/cut-profiles';
export const defaultShaker:ShakerSettings={frameWidth:70,recessDepth:6,panelThickness:6,infill:'wood'};
export type ShakerPanel=Panel&{doorOwnerId:string;infill?:boolean;glass?:boolean};
const precise=(n:number,lo:number,hi:number)=>Number.isFinite(n)&&n>=lo&&n<=hi&&Math.abs(n*10-Math.round(n*10))<1e-6;
const overlaps=(a:{origin:Vec3;size:Vec3},b:{origin:Vec3;size:Vec3})=>a.size.every((n,i)=>Math.min(a.origin[i]+n,b.origin[i]+b.size[i])-Math.max(a.origin[i],b.origin[i])>.00001);
export function resolveShaker(c:Cabinet,doors:FrontBody[],inputBores:CabineoBore[],inputCuts:BackPocket[]=[]){
 const panels:ShakerPanel[]=[],pockets:BackPocket[]=[],bores=inputBores.map(b=>({...b})),owners=new Set<string>();
 for(const door of c.fronts){
  if(door.style!==undefined&&!['slab','shaker-routed','shaker-routed-panel','shaker-frame'].includes(door.style))throw Error('Choose slab, routed shaker or framed shaker doors.');
  if(door.shaker!==undefined&&(!door.shaker||typeof door.shaker!=='object'||Array.isArray(door.shaker)||!Object.keys(defaultShaker).every(k=>Object.hasOwn(door.shaker!,k))||Object.keys(door.shaker).length!==4))throw Error('Invalid shaker construction settings.');
  if(door.shaker&&(!precise(door.shaker.frameWidth,50,150)||!precise(door.shaker.recessDepth,1,21)||!precise(door.shaker.panelThickness,3,18)||!['wood','glass'].includes(door.shaker.infill)))throw Error('Invalid shaker dimensions or infill. Use frame width 50–150 mm, recess depth 1–21 mm and panel thickness 3–18 mm.');
  if(!door.style||door.style==='slab')continue;
  const body=doors.find(d=>d.id===door.id);if(!body)continue;
  const s=door.shaker??defaultShaker,{frameWidth:f}=s,[w,h,t]=body.size,[cx,cy,cz]=body.center,x=cx-w/2,y=cy-h/2,z=cz-t/2,ow=w-2*f,oh=h-2*f;
  if(!precise(f,50,150)||!precise(s.recessDepth,1,21)||!precise(s.panelThickness,3,18)||!['wood','glass'].includes(s.infill))throw Error('Shaker frame width must be 50–150 mm; panel thickness 3–18 mm; recess depth 1–21 mm, in 0.1 mm steps.');
  if(ow<40||oh<80)throw Error('Shaker opening needs at least 40 × 80 mm. Reduce frame width or increase the door size.');
  const cut=(id:string,panelId:string,origin:Vec3,size:Vec3,face:1|-1,outline?:Vec3[])=>{const p:BackPocket={id,panelId,origin,size,axis:2,face,kind:'front-profile',...outline?{outline}:{}};pockets.push(p);return p;};
  if(door.style==='shaker-routed'){
   if(t-s.recessDepth<3)throw Error('Routed shaker recess must leave at least 3 mm of stock. Reduce recess depth or increase door thickness.');
   if(s.infill==='glass')throw Error('Glass needs a separate framed panel. Choose framed shaker construction for glass.');
   const r=Math.min(cnc(c).bitDiameter/2,ow/2,oh/2),outline:Vec3[]=[];
   for(const [qx,qy,start] of [[x+f+r,y+f+r,Math.PI],[x+w-f-r,y+f+r,-Math.PI/2],[x+w-f-r,y+h-f-r,0],[x+f+r,y+h-f-r,Math.PI/2]])for(let i=0;i<=16;i++){const a=start+i*Math.PI/32;outline.push([qx+Math.cos(a)*r,qy+Math.sin(a)*r,z+t-s.recessDepth]);}
   cut(`${door.id}/shaker/recess`,door.id,[x+f,y+f,z+t-s.recessDepth],[ow,oh,s.recessDepth],1,outline);
  }else{
   if(s.panelThickness+2>t-3)throw Error('Shaker panel rebate must leave at least 3 mm of frame. Reduce panel thickness or increase door thickness.');
   const framed=door.style==='shaker-frame';
   const toolLimit=Math.min(8,9-cnc(c).tolerance);
   if(framed&&cnc(c).bitDiameter>toolLimit)throw Error(`Rounded shaker frame joints need a cutter no wider than ${toolLimit} mm at this fit allowance. Choose a smaller cutter; joint clearance is unchanged.`);
   if(Object.values(c.banding[door.id]??{}).some(Boolean))throw Error('Framed shaker doors require unbanded frame stock. Remove the door edge bands before changing construction.');
   owners.add(door.id);
   cut(`${door.id}/shaker/aperture`,door.id,[x+f,y+f,z],[ow,oh,t],1);
   // Workshop frame and rebated infill dimensions; Studio keeps its pinned fit allowance.
   const reach=20,lap=8,fit=cnc(c).tolerance,depth=s.panelThickness+2;
   const add=(role:string,origin:Vec3,size:Vec3,infill=false)=>{
    const id=`${door.id}/shaker/${role}`,selected=binding(c,'front',door.id),glass=infill&&s.infill==='glass';
    const mat={...selected,stock:infill?{id:`generic-${glass?'glass':'panel'}-${s.panelThickness}`,revision:'1'}:selected.stock,...glass?{grain:'none' as const,finish:{id:'unspecified',revision:'1'}}:{}};
    const source={id,materialRole:'front' as const,size,center:origin.map((n,i)=>n+size[i]/2) as Vec3,orientation:'xy' as const};
    const materials=panelMaterials({...c,fronts:[...c.fronts,{...door,id,material:mat}]},source);
    const part:ShakerPanel={...source,...materials,role:'door',label:`${body.label} · ${role.replaceAll('-',' ')}`,provenance:door.id,doorOwnerId:door.id,...infill?{infill:true}:{},...glass?{glass:true}:{}};panels.push(part);return part;
   };
   const left=framed?add('left-stile',[x,y,z],[f,h,t]):add('routed-frame',[x,y,z],[w,h,t]),right=framed?add('right-stile',[x+w-f,y,z],[f,h,t]):left,bottom=framed?add('bottom-rail',[x+f-reach,y,z],[ow+2*reach,f,t]):left,top=framed?add('top-rail',[x+f-reach,y+h-f,z],[ow+2*reach,f,t]):left;
   const pieces=framed?[left,right,bottom,top]:[left];
   if(!framed){
    const r=Math.min(cnc(c).bitDiameter/2,ow/2,oh/2),outline:Vec3[]=[];
    for(const [qx,qy,start] of [[x+f+r,y+f+r,Math.PI],[x+w-f-r,y+f+r,-Math.PI/2],[x+w-f-r,y+h-f-r,0],[x+f+r,y+h-f-r,Math.PI/2]])for(let i=0;i<=16;i++){const a=start+i*Math.PI/32;outline.push([qx+Math.cos(a)*r,qy+Math.sin(a)*r,z]);}
    cut(`${left.id}/aperture`,left.id,[x+f,y+f,z],[ow,oh,t],1,outline);
   }
   add(s.infill==='glass'?'glass-panel':'centre-panel',[x+f-lap+fit/2,y+f-lap+fit/2,z+2],[ow+2*lap-fit,oh+2*lap-fit,s.panelThickness],true);
   const rebate={origin:[x+f-lap,y+f-lap,z] as Vec3,size:[ow+2*lap,oh+2*lap,depth] as Vec3};
   for(const part of pieces){const lo=part.center.map((n,i)=>Math.max(n-part.size[i]/2,rebate.origin[i])) as Vec3,hi=part.center.map((n,i)=>Math.min(n+part.size[i]/2,rebate.origin[i]+rebate.size[i]));cut(`${part.id}/rebate`,part.id,lo,hi.map((n,i)=>n-lo[i]) as Vec3,-1);}
   // The Workshop's complementary flat dovetail seam; no controller code is reused.
   const neck=Math.max(12,Math.min(f/3,f-2*(lap+4+2)-10)),head=neck+10;
   const profile=(part:ShakerPanel,points:number[][],key:string)=>{const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),ox=Math.min(...xs),oy=Math.min(...ys);cut(`${part.id}/joint/${key}`,part.id,[ox,oy,z],[Math.max(...xs)-ox,Math.max(...ys)-oy,t],-1,points.map(p=>[p[0],p[1],z]));};
   for(const [rail,ry] of (framed?[[bottom,y],[top,y+h-f]]:[]) as [ShakerPanel,number][])for(const isLeft of [true,false]){
    const stile=isLeft?left:right,edge=isLeft?x+f:x+w-f,dir=isLeft?-1:1,tip=edge+dir*reach,centre=ry+f/2,key=`${rail.id.split('/').at(-1)}-${isLeft?'left':'right'}`;
    const arcs=roundSeam([[edge,ry],[edge,centre-neck/2],[tip,centre-head/2],[tip,centre+head/2],[edge,centre+neck/2],[edge,ry+f]]),lower=arcs.slice(0,2).flat(),upper=arcs.slice(2).flat();
    profile(rail,[[edge,ry],[tip,ry],...lower.slice().reverse()],key+'-lower');profile(rail,[[edge,ry+f],[tip,ry+f],...upper],key+'-upper');profile(stile,clipToJointEdge(expandPolygon([...lower,...upper],fit/2),edge,dir),key+'-socket');
   }
   if(!framed&&cnc(c).bitDiameter>8)throw Error('Separate shaker panel rebates need a cutter no wider than 8 mm. Choose a smaller cutter.');
   // Corner reliefs let the square infill fit an 8 mm routed rebate.
   for(const [part,px] of [[left,x+f-lap+2.5],[right,x+w-f+lap-2.5]] as [ShakerPanel,number][])for(const py of [y+f-lap+2.5,y+h-f+lap-2.5]){
    const radius=framed?4:cnc(c).bitDiameter/2,outline=Array.from({length:48},(_,i)=>[px+radius*Math.cos(i*Math.PI/24),py+radius*Math.sin(i*Math.PI/24),z] as Vec3);cut(`${part.id}/rebate-relief/${py}`,part.id,[px-radius,py-radius,z],[radius*2,radius*2,depth],-1,outline);
   }
   for(const bore of bores.filter(b=>b.panelId===door.id)){
    const end=bore.point[bore.axis]+bore.sign*bore.depth,r=bore.diameter/2;
    const matches=pieces.filter(part=>part.size.every((n,i)=>{const lo=i===bore.axis?Math.min(bore.point[i],end):bore.point[i]-r,hi=i===bore.axis?Math.max(bore.point[i],end):bore.point[i]+r;return lo>=part.center[i]-n/2-.0001&&hi<=part.center[i]+n/2+.0001;}));
    if(matches.length!==1)throw Error('Shaker hinge or handle drilling must fit one solid frame member. Move the fixing onto a stile or rail, increase frame width, or adjust hinge setbacks.');bore.panelId=matches[0].id;
   }
   for(const p of inputCuts.filter(p=>p.panelId===door.id))for(const part of pieces){const origin=part.center.map((n,i)=>n-part.size[i]/2) as Vec3;if(overlaps({origin,size:part.size},p))pockets.push({...p,id:`${part.id}/outer/${p.id}`,panelId:part.id});}
  }
 }
 // Actual holes must not run through a recess, panel rebate or dovetail socket.
 for(const bore of bores)for(const p of pockets){if(bore.panelId!==p.panelId||bore.axis!==2)continue;const end=bore.point[2]+bore.sign*bore.depth;if(Math.min(Math.max(bore.point[2],end),p.origin[2]+p.size[2])-Math.max(Math.min(bore.point[2],end),p.origin[2])<.0001)continue;
  if(clipping.intersection(circleProfile(bore.point[0],bore.point[1],bore.diameter/2),...pocketProfiles(p,0,1)).length)throw Error('Shaker drilling crosses the centre recess, rebate or frame joint. Move the handle onto solid frame wood, increase frame width or adjust hinge setbacks.');
 }
 return {panels,pockets,bores,owners:[...owners]};
}
export function physicalPanels(e:EvaluatedCabinet):Panel[]{return e.shaker?.owners.length?[...e.panels.filter(p=>!e.shaker.owners.includes(p.id)),...e.shaker.panels]:e.panels;}
export function physicalPockets(e:EvaluatedCabinet){return e.shaker?.owners.length?[...e.pockets.filter(p=>!e.shaker.owners.includes(p.panelId)),...e.shaker.pockets.filter(p=>e.shaker.owners.some(id=>p.panelId.startsWith(id+'/shaker/')))]:e.pockets;}
