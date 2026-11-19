import type {Cabinet,MetalDrawer,Vec3} from '../domain/cabinet';
import {drawerPack} from '../catalogue/drawers';
import {stock} from '../catalogue/materials';
import {resolveConstruction} from './construction';
import {resolveInteriors} from './interiors';
import {resolveAdjustable} from './adjustable';
import {resolveFronts} from './fronts';
import type {Issue} from './validate';
export interface DrawerPart {id:string;ownerId:string;label:string;article:string|null;material:'chipboard-16'|'front-stock'|'steel';size:Vec3;center:Vec3;moving:boolean;fidelity:'board'|'envelope'}
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
 for(const [index,d] of (c.drawers??[]).entries()){
  const fail=(message:string)=>issues.push({code:'drawer-fit',featureId:d.id,severity:'error',message:`Drawer ${index+1}: ${message} The previous cabinet is preserved.`});
  if(seen.has(d.id)||protectedIds.has(d.id)||!d.id||d.id.length>128){fail('duplicate or invalid drawer identity.');continue;}seen.add(d.id);
  let pack;try{pack=drawerPack(d.pack);}catch(e){fail((e as Error).message);continue;}
  if(d.kind!=='metal-drawer'||d.policyRevision!=='antaro-external-1'){fail('unsupported drawer policy.');continue;}
  const opening=interiors.openings.find(o=>o.id===d.openingId);
  if(!opening){fail('its supporting opening no longer exists. Remove or relocate the drawer before dividing that opening.');continue;}
  if(![d.offset,d.frontHeight].every(v=>Number.isFinite(v)&&Math.abs(v*10-Math.round(v*10))<1e-6)||d.offset<0||d.frontHeight<pack.minimumHeight||d.offset+d.frontHeight>opening.size[1]+1e-6){fail(`allocate at least ${pack.minimumHeight} mm height within the opening, in 0.1 mm steps.`);continue;}
  if(opening.size[2]<pack.minimumDepth){fail(`500 mm runners need ${pack.minimumDepth} mm clear depth; this opening has ${opening.size[2]} mm.`);continue;}
  // Deliberately narrower than the manufacturer range until wide-drawer stabilisers are verified.
  if(opening.size[0]<240||opening.size[0]>900){fail('this first pack supports 240–900 mm clear width (application policy).');continue;}
  if(t<16){fail('runner attachment needs at least 16 mm side stock in this application.');continue;}
  const [x,y,z]=opening.origin,[w]=opening.size,frontZ=c.envelope.origin[2]+c.envelope.depth,low=y+d.offset;
  const allocation={origin:[x,low,frontZ-pack.minimumDepth] as Vec3,size:[w,d.frontHeight,pack.minimumDepth] as Vec3};
  const sidePanels=[...construction.panels,...interiors.divisions.map(v=>({...v,role:v.axis==='vertical'?'divider':'shelf'}))].filter(p=>['left','right','divider'].includes(p.role));
  for(const side of ['left','right'] as const){const face=side==='left'?x:x+w;
   if(!sidePanels.some(p=>Math.abs((side==='left'?p.origin[0]+p.size[0]:p.origin[0])-face)<1e-6&&p.origin[1]<=low&&p.origin[1]+p.size[1]>=low+pack.minimumHeight&&p.origin[2]<=frontZ-pack.nominalLength&&p.origin[2]+p.size[2]>=frontZ-1e-6))fail(`${side} runner needs an uninterrupted mounting side for the entire 500 mm length. A recessed divider cannot support it.`);
  }
  if(drawers.some(other=>overlap(other.allocation,allocation)))fail('drawer allocations overlap. Move it above the existing drawer.');
  if(shelves.shelves.some(s=>overlap({origin:s.origin,size:s.size},allocation)))fail('an adjustable shelf occupies this allocation. Move the shelf or drawer.');
  const frontThickness=stock(c,'carcass').thickness;
  const frontBounds={origin:[x+2,low+2,frontZ+2] as Vec3,size:[w-4,d.frontHeight-4,frontThickness] as Vec3};
  if(doors.some(door=>overlap({origin:[door.center[0]-door.size[0]/2,door.center[1]-door.size[1]/2,0],size:[door.size[0],door.size[1],1]}, {origin:[frontBounds.origin[0],frontBounds.origin[1],0],size:[frontBounds.size[0],frontBounds.size[1],1]})))fail('a slab door covers this drawer front. Remove or reallocate that door first.');
  const parts:DrawerPart[]=[];
  const add=(key:string,label:string,size:Vec3,origin:Vec3,material:DrawerPart['material'],article:string|null,moving=true)=>parts.push({id:`${d.id}/${key}`,ownerId:d.id,label,size,center:origin.map((n,i)=>n+size[i]/2) as Vec3,material,article,moving,fidelity:material==='steel'?'envelope':'board'});
  const bottom:Vec3=[w-pack.bottomWidthDeduction,16,pack.nominalLength-pack.bottomLengthDeduction],back:Vec3=[w-pack.backWidthDeduction,pack.backHeight,16];
  // Board dimensions are exact; their display position and steel profiles are simplified.
  const boardFront=frontZ-3,baseY=low+8.5;
  add('bottom','16 mm drawer bottom',bottom,[x+37.5,baseY,boardFront-bottom[2]],'chipboard-16',null);
  add('back','16 mm drawer back',back,[x+43.5,baseY,boardFront-bottom[2]-16],'chipboard-16',null);
  add('front','Drawer slab front',frontBounds.size,frontBounds.origin,'front-stock',null);
  for(const side of ['left','right'] as const){
   add(`side-${side}`,`${side} M side`,[12,pack.sideHeight,500],[side==='left'?x+25.5:x+w-37.5,baseY,frontZ-500],'steel','378M5002SA');
   add(`runner-${side}`,`${side} BLUMOTION runner`,[18,12,500],[side==='left'?x:x+w-18,low+2,frontZ-500],'steel','578.5001M',false);
   add(`back-fixing-${side}`,`${side} back fixing`,[12,64,5],[side==='left'?x+31.5:x+w-43.5,baseY+10,boardFront-bottom[2]-5],'steel','Z30M000S.04');
   add(`front-fixing-${side}`,`${side} screw-on front bracket`,[12,44,8],[side==='left'?x+9.5:x+w-21.5,low+20,frontZ-6],'steel','ZSF.35A2');
  }
  drawers.push({id:d.id,label:`TANDEMBOX drawer ${index+1}`,intent:d,parts,bottom,back,front:frontBounds.size,allocation,requiredDepth:pack.minimumDepth});
 }
 return {drawers,issues};
}
