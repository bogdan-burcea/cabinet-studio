import type {Cabinet} from '../domain/cabinet';
import type {Panel} from '../geometry/evaluate';
import type {CabineoBore} from './cabineo';
import type {BackPocket} from './back-panel';
/** Previously banded boards could not use assembly connectors. Check the actual
 * remaining core before enabling that combination; never move fitting datums. */
export function checkBandingClearance(c:Cabinet,panels:Panel[],bores:CabineoBore[],pockets:BackPocket[]){
 for(const panel of panels){
  const door=c.fronts.find(d=>d.id===panel.id)??c.drawers?.find(d=>`${d.id}/front`===panel.id);
  if(door?.cornerRadius&&panel.edges.some(e=>e.product))throw Error(`${panel.label}: banding around rounded corners is not supported yet. Keep the rounded front unbanded, or set Corner radius to 0 before adding bands. The previous cabinet is preserved.`);
  for(const band of panel.edges.filter(e=>e.product)){
   const low=band.center.map((n,i)=>n-band.size[i]/2),high=band.center.map((n,i)=>n+band.size[i]/2);
   const collision=bores.some(b=>{
    if(b.panelId!==panel.id)return false;
    const end=b.point[b.axis]+b.sign*b.depth;
    if(Math.min(high[b.axis],Math.max(b.point[b.axis],end))-Math.max(low[b.axis],Math.min(b.point[b.axis],end))<=.001)return false;
    return [0,1,2].filter(i=>i!==b.axis).reduce((n,i)=>n+Math.max(low[i]-b.point[i],0,b.point[i]-high[i])**2,0)<(b.diameter/2-.001)**2;
   });
   // New thick strips and connector assemblies must not cover an existing joint.
   // Retain legacy thin-band files, whose schematic corner treatment predates CNC.
   const joint=(c.hardware.length>0||band.thickness>2)&&pockets.some(p=>p.panelId===panel.id&&[0,1,2].every(i=>Math.min(high[i],p.origin[i]+p.size[i])-Math.max(low[i],p.origin[i])>.001));
   if(collision||joint)throw Error(`${panel.label}: ${band.label.toLowerCase()} band reaches ${collision?'a hardware hole':'a joint or routed cut'}. Reduce or remove banding on this edge, or adjust the fitting / joint setback. The previous cabinet is preserved.`);
  }
 }
}
