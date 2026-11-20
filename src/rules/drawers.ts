import {resolveHandle} from './handles';
import {layoutDrawerIntents} from './drawer-layout';
import type {Cabinet,MetalDrawer,Vec3} from '../domain/cabinet';
import {drawerPack} from '../catalogue/drawers';
import {stock} from '../catalogue/materials';
import {resolveConstruction} from './construction';
import {resolveInteriors} from './interiors';
import {resolveAdjustable} from './adjustable';
import {resolveFronts} from './fronts';
import type {Issue} from './validate';
export interface DrawerPart {id:string;ownerId:string;label:string;article:string|null;material:'chipboard-16'|'front-stock'|'steel';size:Vec3;center:Vec3;moving:boolean;shape?:'box'|'cylinder';fidelity:'board'|'envelope'}
export interface EvaluatedDrawer {id:string;label:string;intent:MetalDrawer;parts:DrawerPart[];bottom:Vec3;back:Vec3;front:Vec3;allocation:{origin:Vec3;size:Vec3};requiredDepth:number}
const overlap=(a:{origin:Vec3;size:Vec3},b:{origin:Vec3;size:Vec3})=>a.size.every((v,i)=>Math.min(a.origin[i]+v,b.origin[i]+b.size[i])-Math.max(a.origin[i],b.origin[i])>1e-6);
export function resolveDrawers(c:Cabinet){
 const issues:Issue[]=[],drawers:EvaluatedDrawer[]=[];
 const t=stock(c,'carcass').thickness,b=stock(c,'back').thickness;
 const interiors=resolveInteriors(c,t,b,stock(c,'interior').thickness),construction=resolveConstruction(c,t,b);
 const shelves=resolveAdjustable(c,interiors.openings),doors=resolveFronts(c).doors;
 const seen=new Set<string>();
 const protectedIds=new Set([c.id,...construction.panels.map(p=>`${c.id}/panel/${p.role}`),...c.fronts.map(d=>d.id),...c.contents.map(s=>s.id),...interiors.divisions.map(d=>d.id),...interiors.openings.map(o=>o.id)]);
 if((c.drawers?.length??0)>32)issues.push({code:'drawer-count',featureId:c.id,severity:'error',message:'At most 32 metal drawers are supported.'});
 for(const [index,d] of layoutDrawerIntents(c).entries()){
  const fail=(message:string)=>issues.push({code:'drawer-fit',featureId:d.id,severity:'error',message:`Drawer ${index+1}: ${message} The previous cabinet is preserved.`});
  if(seen.has(d.id)||protectedIds.has(d.id)||!d.id||d.id.length>128){fail('duplicate or invalid drawer identity.');continue;}seen.add(d.id);
  let pack;try{pack=drawerPack(d.pack);}catch(e){fail((e as Error).message);continue;}
  if(d.kind!=='metal-drawer'||d.policyRevision!=='antaro-external-1'){fail('unsupported drawer policy.');continue;}
  const opening=interiors.openings.find(o=>o.id===d.openingId);
  if(!opening){fail('its supporting opening no longer exists. Remove or relocate the drawer before dividing that opening.');continue;}
  if(![d.offset,d.frontHeight].every(v=>Number.isFinite(v)&&(!!d.stack||Math.abs(v*10-Math.round(v*10))<1e-6))||d.offset<0||d.frontHeight<pack.minimumHeight||d.offset+d.frontHeight>opening.size[1]+1e-6){fail(`allocate at least ${pack.minimumHeight} mm height within the opening, in 0.1 mm steps.`);continue;}
  const f=d.front??{placement:'overlay',gap:2,clearance:2,left:0,right:0,top:0,bottom:0};
  if(!['inset','overlay'].includes(f.placement)||!['gap','clearance','left','right','top','bottom'].every(key=>{
   const value=f[key as 'gap'];return Number.isFinite(value)&&value>=0&&value<=(key==='gap'||key==='clearance'?10:50)&&Math.abs(value*10-Math.round(value*10))<1e-6;
  })){fail('front gaps must be 0–10 mm and overlaps 0–50 mm, in 0.1 mm steps.');continue;}
  const frontThickness=stock(c,'carcass').thickness;
  const insetDepth=f.placement==='inset'?frontThickness+f.clearance:0;
  if(opening.size[2]<pack.minimumDepth+insetDepth){fail(`${pack.nominalLength} mm runners and this front need ${pack.minimumDepth+insetDepth} mm clear depth; this opening has ${opening.size[2]} mm.`);continue;}
  // Deliberately narrower than the manufacturer range until wide-drawer stabilisers are verified.
  if(opening.size[0]<240||opening.size[0]>900){fail('this first pack supports 240–900 mm clear width (application policy).');continue;}
  if(t<16){fail('runner attachment needs at least 16 mm side stock in this application.');continue;}
  const [x,y,z]=opening.origin,[w]=opening.size,faceZ=c.envelope.origin[2]+c.envelope.depth,frontZ=faceZ-insetDepth,low=y+d.offset;
  const allocation={origin:[x,low,frontZ-pack.minimumDepth] as Vec3,size:[w,d.frontHeight,pack.minimumDepth] as Vec3};
  const sidePanels=[...construction.panels,...interiors.divisions.map(v=>({...v,role:v.axis==='vertical'?'divider':'shelf'}))].filter(p=>['left','right','divider'].includes(p.role));
  for(const side of ['left','right'] as const){const face=side==='left'?x:x+w;
   if(!sidePanels.some(p=>Math.abs((side==='left'?p.origin[0]+p.size[0]:p.origin[0])-face)<1e-6&&p.origin[1]<=low&&p.origin[1]+p.size[1]>=low+pack.minimumHeight&&p.origin[2]<=frontZ-pack.nominalLength&&p.origin[2]+p.size[2]>=frontZ-1e-6))fail(`${side} runner needs an uninterrupted mounting side for the entire ${pack.nominalLength} mm length. A recessed divider cannot support it.`);
  }
  if(drawers.some(other=>overlap(other.allocation,allocation)))fail('drawer allocations overlap. Move it above the existing drawer.');
  if(shelves.shelves.some(s=>overlap({origin:s.origin,size:s.size},allocation)))fail('an adjustable shelf occupies this allocation. Move the shelf or drawer.');
  const overlay=f.placement==='overlay';
  const left=overlay?f.left:0,right=overlay?f.right:0;
  const bottomOverlap=overlay?f.bottom:0,top=overlay?f.top:0;
  const frontBounds={origin:[x+f.gap-left,low+f.gap-bottomOverlap,overlay?faceZ+f.clearance:faceZ-frontThickness-f.clearance] as Vec3,
   size:[w-2*f.gap+left+right,d.frontHeight-2*f.gap+bottomOverlap+top,frontThickness] as Vec3};
  const envelope=c.envelope;
  if(frontBounds.origin[0]<envelope.origin[0]-1e-6||frontBounds.origin[0]+frontBounds.size[0]>envelope.origin[0]+envelope.width+1e-6||
    frontBounds.origin[1]<envelope.origin[1]-1e-6||frontBounds.origin[1]+frontBounds.size[1]>envelope.origin[1]+envelope.height+1e-6){
   fail('front overlaps extend beyond the cabinet. Reduce the overlaps.');continue;
  }
  if(frontBounds.size.some(n=>n<=0)){fail('front gaps leave no panel.');continue;}
  if(drawers.some(other=>{
   const part=other.parts.find(p=>p.id===other.id+'/front')!;
   return overlap(frontBounds,{origin:part.center.map((n,i)=>n-part.size[i]/2) as Vec3,size:part.size});
  })){fail('drawer fronts overlap. Reduce the overlaps or increase their gap.');continue;}
  if(doors.some(door=>overlap({origin:[door.center[0]-door.size[0]/2,door.center[1]-door.size[1]/2,0],size:[door.size[0],door.size[1],1]}, {origin:[frontBounds.origin[0],frontBounds.origin[1],0],size:[frontBounds.size[0],frontBounds.size[1],1]})))fail('a slab door covers this drawer front. Remove or reallocate that door first.');
  const parts:DrawerPart[]=[];
  const add=(key:string,label:string,size:Vec3,origin:Vec3,material:DrawerPart['material'],article:string|null,moving=true)=>parts.push({id:`${d.id}/${key}`,ownerId:d.id,label,size,center:origin.map((n,i)=>n+size[i]/2) as Vec3,material,article,moving,fidelity:material==='steel'?'envelope':'board'});
  const bottom:Vec3=[w-pack.bottomWidthDeduction,16,pack.nominalLength-pack.bottomLengthDeduction],back:Vec3=[w-pack.backWidthDeduction,pack.backHeight,16];
  // Board and hardware datums checked against the supplied assembled K550 STEP.
  const boardFront=frontZ,baseY=low+9;
  add('bottom','16 mm drawer bottom',bottom,[x+37.5,baseY,boardFront-bottom[2]],'chipboard-16',null);
  add('back','16 mm drawer back',back,[x+43.5,baseY,boardFront-bottom[2]-16],'chipboard-16',null);
  add('front','Drawer slab front',frontBounds.size,frontBounds.origin,'front-stock',null);
  for(const side of ['left','right'] as const){
   const k=pack.sideHeight>100,short=pack.nominalLength<=300,wallLow=short?5:2.44317,wallHeight=(short?121.5:124.05683)-(k?0:32);
   add(`side-${side}`,`${side} ${k?'K':'M'} side`,[48.60054,wallHeight,pack.nominalLength],
    [side==='left'?x+5.39946:x+w-54,low+wallLow,frontZ-pack.nominalLength],'steel',pack.components[1].article);
   add(`runner-${side}`,`${side} BLUMOTION runner`,[32.605,43.6,pack.nominalLength-2.8],
    [side==='left'?x:x+w-32.605,low+.2,frontZ-pack.nominalLength-1.2],'steel',pack.components[0].article,false);
   add(`back-fixing-${side}`,`${side} back fixing`,[47.4,k?100.2:68.2,20.2],
    [side==='left'?x+14.1:x+w-61.5,low+25.4,frontZ-pack.nominalLength+5.9],'steel',pack.components[2].article);
   // Screw-on ZSF.35A2 is deliberately schematic: the supplied INSERTA
   // ZSF.39A2 is a different article and must not be substituted for it.
   add(`front-fixing-${side}`,`${side} screw-on front bracket`,[12,44,8],
    [side==='left'?x+9.5:x+w-21.5,low+10.5,frontZ-6],'steel','ZSF.35A2');
  }
  if(d.handle){try{const front=parts.find(p=>p.id===d.id+'/front')!;parts.push(...resolveHandle(d.handle,front).parts.map(p=>({...p,ownerId:d.id,label:'Drawer handle',material:'steel' as const,article:null,moving:true,fidelity:'envelope' as const})));}catch(error){fail((error as Error).message);continue;}}
  drawers.push({id:d.id,label:c.names?.[d.id]??`Drawer ${index+1}`,intent:d,parts,bottom,back,front:frontBounds.size,allocation,requiredDepth:pack.minimumDepth+insetDepth});
 }
 return {drawers,issues};
}
