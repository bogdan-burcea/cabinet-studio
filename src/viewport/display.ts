import type {EvaluatedCabinet} from '../geometry/evaluate';
import type {Vec3} from '../domain/cabinet';
export type RenderMode='solid'|'transparent'|'wireframe';
// Presentation offsets only; canonical geometry and saved intent are never changed.
export function explodedOffset(role:string,center:Vec3,bodyCenter:Vec3,amount:number):Vec3 {
 if(!amount)return [0,0,0];
 if(role==='left')return [-amount,0,0];if(role==='right')return [amount,0,0];
 if(role==='bottom'||role==='foot')return [0,-amount,0];if(role==='top'||role.startsWith('top-'))return [0,amount,0];
 if(role==='back'||role.startsWith('back-')||role==='mounting')return [0,0,-amount];
 if(role.startsWith('plinth'))return [0,-amount,amount];
 if(role==='door'||role==='drawer-front')return [0,0,amount];
 if(role.startsWith('front-'))return [0,role==='front-upper-rail'?amount*.35:-amount*.35,amount];
 if(role==='drawer-back')return [0,0,amount*.5];
 if(role==='divider')return [(center[0]>=bodyCenter[0]?1:-1)*amount*.6,0,amount*.3];
 return [0,(center[1]>=bodyCenter[1]?1:-1)*amount*.35,amount*.5];
}

interface ExplodedPart {id:string;role:string;center:Vec3;size:Vec3;assemblyId?:string}
/** Compact exploded packing: shelves move by the requested gap, while tall
 * dividers retain their order with radial separation. Canonical geometry is never changed. */
export function explodedLayout(parts:ExplodedPart[],amount:number):Map<string,Vec3>{
 const result=new Map<string,Vec3>();if(!amount){parts.forEach(p=>result.set(p.id,[0,0,0]));return result;}
 const low=(p:ExplodedPart,a:number)=>p.center[a]-p.size[a]/2,high=(p:ExplodedPart,a:number)=>p.center[a]+p.size[a]/2;
 const center=parts.length?[0,1,2].map(a=>(Math.min(...parts.map(p=>low(p,a)))+Math.max(...parts.map(p=>high(p,a))))/2) as Vec3:[0,0,0] as Vec3;
 const shelf=(p:ExplodedPart)=>p.role==='shelf'||p.role==='drawer-bottom',frontPart=(p:ExplodedPart)=>p.role==='door'||p.role==='drawer-front';
 const ordinary=parts.filter(p=>!shelf(p)&&p.role!=='divider');ordinary.forEach(p=>result.set(p.id,explodedOffset(p.role,p.center,center,amount)));
 const gap=Math.min(12,amount/4);
 const span=([0,1] as const).map(a=>Math.max(1,Math.max(...parts.map(p=>high(p,a)))-Math.min(...parts.map(p=>low(p,a)))));
 const radial=(p:ExplodedPart):Vec3=>[(p.center[0]-center[0])*2*amount/span[0],(p.center[1]-center[1])*2*amount/span[1],0];
 for(const p of parts.filter(p=>p.role==='divider'))result.set(p.id,radial(p));
 const placed:ExplodedPart[]=[];
 for(const p of parts.filter(shelf).sort((a,b)=>a.center[1]-b.center[1]||a.center[0]-b.center[0]||a.id.localeCompare(b.id))){
  const spread=radial(p);let x=low(p,0)+spread[0];for(const other of placed)if(Math.abs(other.center[1]-p.center[1])<(other.size[1]+p.size[1])/2+gap&&x<high(other,0)+gap&&x+p.size[0]>low(other,0)-gap)x=high(other,0)+gap;
  const offset:Vec3=[x-low(p,0),spread[1],amount];result.set(p.id,offset);placed.push({...p,center:p.center.map((n,i)=>n+offset[i]) as Vec3});
 }
 // Give unusually wide shelf groups enough side room without pushing the
 // shelves a cabinet depth toward the camera.
 for(const p of ordinary.filter(p=>p.role==='left'||p.role==='right')){const offset=result.get(p.id)!;if(p.role==='right')offset[0]=Math.max(offset[0],Math.max(...placed.map(q=>high(q,0)),high(p,0))+gap-low(p,0));else offset[0]=Math.min(offset[0],Math.min(...placed.map(q=>low(q,0)),low(p,0))-gap-high(p,0));}
 const nonDoors=parts.filter(p=>!frontPart(p)),front=Math.max(0,...nonDoors.map(p=>high(p,2)+result.get(p.id)![2]))+amount;
 // Drawer fronts stay at their drawer's exploded height. Doors occupy a
 // separate depth lane, so overlapping elevations never lift fronts above the box.
 const drawerFronts=parts.filter(p=>p.role==='drawer-front'),doorFront=front+(drawerFronts.length?Math.max(...drawerFronts.map(p=>p.size[2]))+amount:0);
 for(const p of parts.filter(frontPart)){
  const bottom=p.assemblyId?result.get(p.assemblyId+'/bottom'):undefined;
  result.set(p.id,p.role==='door'?[Math.sign(p.center[0]-center[0])*amount,0,doorFront-low(p,2)]:[bottom?.[0]??0,bottom?.[1]??-amount*.5,front-low(p,2)]);
 }
 // Also cover optional advanced panels: separate any residual collision in Y.
 const boxes:ExplodedPart[]=[];
 for(const p of [...parts.filter(p=>!frontPart(p)),...parts.filter(frontPart).sort((a,b)=>a.center[1]-b.center[1]||a.center[0]-b.center[0]||a.id.localeCompare(b.id))]){let offset=result.get(p.id)!,box={...p,center:p.center.map((n,i)=>n+offset[i]) as Vec3};
  const overlaps=(other:ExplodedPart)=>[0,1,2].every(a=>Math.min(high(box,a),high(other,a))-Math.max(low(box,a),low(other,a))>1e-6);
  if(boxes.some(overlaps)){offset=[...offset] as Vec3;const axis=frontPart(p)?2:1;offset[axis]=Math.max(...boxes.map(q=>high(q,axis)))+amount-low(p,axis);result.set(p.id,offset);box={...p,center:p.center.map((n,i)=>n+offset[i]) as Vec3};}boxes.push(box);
 }
 return result;
}

/** Plan drawer boards with the carcass, then keep each fitting with its real owner. */
export function explodedCabinetLayout(model:EvaluatedCabinet,amount:number):Map<string,Vec3>{
 const boards=model.drawers.drawers.flatMap(d=>d.parts.filter(p=>p.material!=='steel'||p.id.endsWith('/front')).map(p=>({...p,assemblyId:d.id,role:p.id.endsWith('/front')?'drawer-front':p.id.endsWith('/bottom')?'drawer-bottom':'drawer-back'})));
 const offsets=explodedLayout([...model.panels,...boards],amount),zero:Vec3=[0,0,0];
 const support=(point:Vec3)=>model.panels.filter(p=>p.orientation==='yz'&&point[1]>=p.center[1]-p.size[1]/2-1&&point[1]<=p.center[1]+p.size[1]/2+1&&point[2]>=p.center[2]-p.size[2]/2-1&&point[2]<=p.center[2]+p.size[2]/2+1).sort((a,b)=>Math.abs(a.center[0]-point[0])-Math.abs(b.center[0]-point[0])||a.id.localeCompare(b.id))[0];
 for(const drawer of model.drawers.drawers)for(const part of drawer.parts){
  if(offsets.has(part.id))continue;
  const side=part.id.endsWith('-left')?'left':'right',x=drawer.allocation.origin[0]+(side==='left'?0:drawer.allocation.size[0]);
  const receiver=support([x,part.center[1],part.center[2]]),sideOffset=receiver?offsets.get(receiver.id)!:zero;
  const bottom=offsets.get(drawer.id+'/bottom')??zero,body:Vec3=[bottom[0]+sideOffset[0]*.6,bottom[1],bottom[2]];
  const target=part.id.endsWith('/inner-handle')||part.id.endsWith('/front-gallery')||part.id.includes('/handle/')||part.id.includes('front-fixing-')?offsets.get(drawer.id+'/front')!:part.id.includes('/runner-')?sideOffset:part.id.includes('/back-fixing-')?offsets.get(drawer.id+'/back')!:part.id.includes('/gallery-')||part.id.includes('/cover-')?offsets.get(drawer.id+'/side-'+side)??body:body;
  offsets.set(part.id,amount?target:zero);
 }
 for(const pad of model.adjustable.supports){const receiver=support(pad.center);offsets.set(pad.id,receiver?offsets.get(receiver.id)!:zero);}
 for(const part of model.mounting.parts)offsets.set(part.id,[0,0,-amount]);
 return offsets;
}
