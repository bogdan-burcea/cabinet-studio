import type { Cabinet, SlabDoor, Vec3 } from '../domain/cabinet';
import { stock } from '../catalogue/materials';
import { handleGeometry } from '../catalogue/fronts';
import { resolveConstruction } from './construction';
import { resolveInteriors } from './interiors';
import { resolveAdjustable } from './adjustable';
import {divisionAtDoorBoundary,effectiveDoor,interiorLayout} from './front-links';
import type { Issue } from './validate';
export interface FrontBody { id: string; label: string; role: 'door'; materialRole: 'front'; orientation: 'xy'; size: Vec3; center: Vec3; pivot: Vec3; handing: SlabDoor['handing']; placement: SlabDoor['placement']; provenance: string }
export interface FrontHandlePart { id: string; ownerId: string; shape: 'box' | 'cylinder'; size: Vec3; center: Vec3 }
export interface Bounds { size: Vec3; center: Vec3 }
export function overlaps(a: Bounds,b: Bounds): boolean {
  return a.size.every((n,i) => Math.min(a.center[i]+n/2,b.center[i]+b.size[i]/2)-Math.max(a.center[i]-n/2,b.center[i]-b.size[i]/2)>1e-6);
}
const precise = (n:number,min:number,max:number) => Number.isFinite(n) && n>=min && n<=max && Math.abs(n*10-Math.round(n*10))<1e-6;
function frontObstacles(c:Cabinet):Bounds[] {
  const construction=resolveConstruction(c,stock(c,'carcass').thickness,stock(c,'back').thickness);
  const interiors=resolveInteriors(c,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness);
  const adjustable=resolveAdjustable(c,interiors.openings);
  return [...construction.panels,...interiors.divisions,...adjustable.shelves].map(part=>({size:part.size,center:part.origin.map((n,i)=>n+part.size[i]/2) as Vec3}));
}
export function frontStructure(c:Cabinet) {
  const construction=resolveConstruction(c,stock(c,'carcass').thickness,stock(c,'back').thickness);
  const interiors=resolveInteriors(c,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness);
  return [...construction.panels.filter(p=>p.role==='left'||p.role==='right'),...interiors.divisions.filter(p=>p.axis==='vertical')];
}
export function supportedHingeSides(c:Cabinet,front:SlabDoor):SlabDoor['handing'][] {
  front=effectiveDoor(c,front);
  const {width:w,height:h,depth:d,origin:[ox,oy,oz]}=c.envelope,r=front.region;
  const low=oy+h*r.bottom,high=oy+h*r.top,offset=Math.min(60,(high-low)/4);
  return (['left','right'] as const).filter(side=>{
    const edge=r[side],x=ox+w*edge;
    return [low+offset,high-offset].every(y=>frontStructure(c).some(p=>{
      const px=p.origin[0]+p.size[0]/2;
      const aligned=edge===0?Math.abs(p.origin[0]-ox)<1e-6:edge===1?Math.abs(p.origin[0]+p.size[0]-ox-w)<1e-6:Math.abs(px-x)<0.11;
      return aligned&&y>=p.origin[1]+10&&y<=p.origin[1]+p.size[1]-10&&p.origin[2]+p.size[2]>=oz+d-40;
    }));
  });
}
export function resolveFronts(c: Cabinet, obstacles?: Bounds[]) {
  const doors: FrontBody[] = [], handles: FrontHandlePart[] = [], issues: Issue[] = [];
  const { width:w,height:h,depth:d,origin:[ox,oy,oz] } = c.envelope, carcass = stock(c,'carcass').thickness;
  if (c.fronts.length>32) issues.push({code:'front-complexity',featureId:c.id,severity:'error',message:'At most 32 slab doors are supported.'});
  let resolved:SlabDoor[];try{resolved=c.fronts.map(f=>effectiveDoor(c,f));}catch(error){return {doors,handles,issues:[{code:'front-link',featureId:c.id,severity:'error' as const,message:(error as Error).message}],overallDepth:d};}
  let divisions:ReturnType<typeof interiorLayout>['divisions']|undefined;
  for (const [index,front] of resolved.entries()) {
    const label=`Slab door ${index+1}`, fail=(message:string)=>issues.push({code:'front-layout',featureId:front.id,severity:'error',message:`${label}: ${message} The previous cabinet is preserved.`});
    const r=front.region, handle=front.handle;
    if(front.kind!=='slab-door'||front.policyRevision!=='slab-1'||!['overlay','inset'].includes(front.placement)||!['left','right'].includes(front.handing)) {fail('unsupported slab construction or policy.');continue;}
    if(!Object.values(r).every(n=>Number.isFinite(n)&&n>=0&&n<=1)||r.left>=r.right||r.bottom>=r.top) {fail('its independent coverage region must be inside the cabinet and have positive width/height.');continue;}
    if(!precise(front.reveal,1,10)||!precise(front.clearance,1,10)) {fail('reveal and front clearance must be 1–10 mm in 0.1 mm steps.');continue;}
    let profile; try {profile=handleGeometry(handle.geometry);}catch(error){fail((error as Error).message);continue;}
    if(!['none','knob','pull','hole'].includes(handle.kind)||!['vertical','horizontal'].includes(handle.orientation)||!['top','centre','bottom'].includes(handle.height)||!(profile.pitches as readonly number[]).includes(handle.pitch)||!precise(handle.edgeOffset,10,200)||!precise(handle.endOffset,10,300)) {fail('unsupported handle style, pitch, placement or offset.');continue;}
    if(handle.horizontal!==undefined&&!['latch','left','centre','right'].includes(handle.horizontal)||handle.diameter!==undefined&&!precise(handle.diameter,10,80)||handle.projection!==undefined&&!precise(handle.projection,12,80)||handle.drillDiameter!==undefined&&!precise(handle.drillDiameter,2,8)){fail('unsupported handle dimensions or position.');continue;}
    const thickness=stock(c,'front',front.id).thickness;
    const rear=oz+d+(front.placement==='overlay'?front.clearance:-front.clearance-thickness);
    const inset=(key:'left'|'right'|'bottom'|'top')=>{
      if(front.placement!=='inset')return 0;
      if(r[key]===0||r[key]===1)return carcass;
      const axis=key==='left'||key==='right'?0:1;
      // A division that reaches into the door depth stays exposed between leaves.
      divisions??=interiorLayout(c).divisions;
      return Math.max(0,...divisions.filter(p=>p.origin[2]+p.size[2]>rear+.001&&divisionAtDoorBoundary(c,r,p,key)).map(p=>p.size[axis]/2));
    };
    const x1=ox+w*r.left+inset('left')+front.reveal*(r.left===0?1:0.5), x2=ox+w*r.right-inset('right')-front.reveal*(r.right===1?1:0.5);
    const y1=oy+h*r.bottom+inset('bottom')+front.reveal*(r.bottom===0?1:0.5), y2=oy+h*r.top-inset('top')-front.reveal*(r.top===1?1:0.5);
    if(x2-x1<80||x2-x1>1200||y2-y1<120) {fail('concept slab width must be 80–1200 mm and height at least 120 mm. Adjust the layout, reveal or cabinet size.');continue;}
    if(!supportedHingeSides(c,front).includes(front.handing)){issues.push({code:'hinge-support',featureId:front.id,severity:'error',message:`${label}: the ${front.handing} hinge edge needs a side panel or vertical divider at both mounting positions, reaching the front mounting zone. Change hinge side or add a supporting divider.`});continue;}
    const door:FrontBody={id:front.id,label,role:'door',materialRole:'front',orientation:'xy',size:[x2-x1,y2-y1,thickness],center:[(x1+x2)/2,(y1+y2)/2,rear+thickness/2],pivot:[front.handing==='left'?x1:x2,(y1+y2)/2,rear],handing:front.handing,placement:front.placement,provenance:`${front.id}/slab-1`};
    if(front.placement==='inset'&&(obstacles??=frontObstacles(c)).some(body=>overlaps(door,body))) {fail('inset slab conflicts with existing construction or interiors. Set back the affected interiors or keep overlay placement.');continue;}
    const conflict=resolved.find((other,j)=>j<index&&r.left<other.region.right-1e-8&&r.right>other.region.left+1e-8&&r.bottom<other.region.top-1e-8&&r.top>other.region.bottom+1e-8);
    if(conflict) {fail('coverage overlaps another door. Remove or split the existing front first; fronts are independent of interior divisions.');continue;}
    const parts:FrontHandlePart[]=[];
    if(handle.kind!=='none') {
      const length=handle.kind==='knob'?(handle.diameter??profile.knobDiameter):handle.kind==='hole'?(handle.diameter??30):handle.pitch+2*profile.pullOverhang;
      const sx=handle.kind==='pull'&&handle.orientation==='vertical'?profile.pullThickness:length, sy=handle.kind==='pull'&&handle.orientation==='horizontal'?profile.pullThickness:length;
      const horizontal=handle.horizontal??'latch',right=horizontal==='right'||horizontal==='latch'&&front.handing==='left';
      const x=horizontal==='centre'?(x1+x2)/2:right?x2-handle.edgeOffset-sx/2:x1+handle.edgeOffset+sx/2;
      const y=handle.height==='centre'?(y1+y2)/2:handle.height==='top'?y2-handle.endOffset-sy/2:y1+handle.endOffset+sy/2;
      if(x-sx/2<x1+5-1e-6||x+sx/2>x2-5+1e-6||y-sy/2<y1+5-1e-6||y+sy/2>y2-5+1e-6) {fail('handle envelope needs 5 mm clearance from the slab edges. Reduce pitch/offsets or enlarge the front.');continue;}
      const face=rear+thickness;
      const add=(key:string,shape:FrontHandlePart['shape'],size:Vec3,center:Vec3)=>parts.push({id:`${front.id}/handle/${key}`,ownerId:front.id,shape,size,center});
      if(handle.kind==='knob') {const projection=handle.projection??profile.knobProjection;add('knob','cylinder',[length,length,projection],[x,y,face+projection/2]);}
      else if(handle.kind==='pull') {
        const b=profile.pullThickness, projection=handle.projection??profile.pullProjection, postDepth=projection-b;
        add('bar','box',[sx,sy,b],[x,y,face+projection-b/2]);
        for(const sign of [-1,1]) add(sign<0?'post-1':'post-2','box',[b,b,postDepth],[x+(handle.orientation==='horizontal'?sign*handle.pitch/2:0),y+(handle.orientation==='vertical'?sign*handle.pitch/2:0),face+postDepth/2]);
      }
    }
    doors.push(door);handles.push(...parts);
  }
  const overallDepth=d+Math.max(0,...doors.map(door=>door.center[2]+door.size[2]/2-(oz+d)),...handles.map(part=>part.center[2]+part.size[2]/2-(oz+d)));
  return {doors,handles,issues,overallDepth};
}
