import {createHash} from 'node:crypto';
import type {Cabinet} from '../../src/domain/cabinet';
/** Freeze old-feature outputs, not the newly added drawers/hinges or revision labels. */
export async function pinnedConstruction(root=new URL('../../src/',import.meta.url)){
 const mod=async(path:string)=>import(new URL(path,root).href);
 const [{createCabinet},{setConstructionMode},{setBackPanel},{setStockThickness,setPuzzleCorners},{setSimpleSupport,setSimplePlinth},{setCabineo},{addDrawerStack},{antaroPin},{addSimpleDoors},{defaultHinge},{evaluate}]=await Promise.all(['domain/cabinet.ts','commands/construction.ts','commands/back-panel.ts','commands/stock.ts','commands/simple-supports.ts','commands/cabineo.ts','commands/drawers.ts','catalogue/drawers.ts','commands/simple-doors.ts','catalogue/hinges.ts','geometry/evaluate.ts'].map(mod));
 const base=()=>{const c=createCabinet();c.id='pinned-cabinet';c.compartments.id='pinned-opening';return c;};
 const drawers=addDrawerStack(base(),'pinned-opening',3,antaroPin).cabinet;
 drawers.drawers.forEach((d:any,i:number)=>{d.id=`pinned-drawer-${i}`;if(d.stack)d.stack.groupId='pinned-stack';});
 const doors=(id:string)=>{const c=addSimpleDoors(base(),'pair').cabinet;c.fronts.forEach((d:any,i:number)=>{d.id=`pinned-door-${i}`;d.hinge=defaultHinge(id);});return c;};
 const cases:Record<string,Cabinet>={default:base(),'stock-16':setStockThickness(base(),16),'grooved-back':setBackPanel(base(),{mode:'groove',inset:22}),'rear-rails':setConstructionMode(base(),'back','rails'),'rails-with-back':setConstructionMode(base(),'back','rails-panel'),'screwed-rail-back':setBackPanel(setConstructionMode(base(),'back','rails-panel'),{mode:'rail-screws'}),'top-rails':setConstructionMode(base(),'top','rails'),puzzle:setPuzzleCorners(base(),true),'feet-plinth':setSimplePlinth(setSimpleSupport(base(),'feet-concept'),{enabled:true}),'antaro-external':drawers,'blum-110':doors('blum-clip-110'),'blum-155':doors('blum-clip-155')};
 return Object.fromEntries(Object.entries(cases).map(([name,c])=>{
  const e=evaluate(c),shape={panels:e.panels.map((p:any)=>[p.id,p.role,p.size,p.center,p.orientation,p.coreSize,p.coreCenter]),pockets:e.pockets,drilling:e.drilling,joints:e.cabineo,construction:e.construction,openings:e.openings,adjustable:e.adjustable,hardware:e.doorHardware.hinges.map((h:any)=>[h.id,h.ownerId,h.supportId,h.article,h.plate,h.y,h.cup,h.softClose,h.maxAngle,h.mountingZone]),drawers:e.drawers.drawers.map((d:any)=>[d.id,d.allocation,d.parts,d.drilling])};
  const json=JSON.stringify(shape,(_key,value)=>typeof value==='number'?Math.round(value*1e6)/1e6:value);
  return [name,{sha256:createHash('sha256').update(json).digest('hex'),panels:e.panels.length,holes:e.drilling.length}];
 }));
}
