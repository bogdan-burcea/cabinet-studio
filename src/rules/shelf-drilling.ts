import type {Cabinet,AdjustableShelf,Vec3} from '../domain/cabinet';
import type {JoineryPanel,CabineoBore} from './cabineo';
import type {Opening} from './interiors';
import {conceptShelfSupport as pattern} from '../catalogue/shelves';
import {shelfPattern} from './shelf-pattern';
export {shelfHoleMaximum} from './shelf-pattern';
interface RowSet {shelf:AdjustableShelf;panel:JoineryPanel;side:1|-1;ys:number[];min:number;max:number}
/** Preserve both physical faces until pairing is resolved. Coincident opposed
 * bores become one through hole; staggered patterns stay distinct. */
export function shelfDrilling(c:Cabinet,panels:JoineryPanel[],openings:Opening[]):CabineoBore[]{
 const sets:RowSet[]=[];
 for(const shelf of c.contents){
  if(!shelf.drilling)continue;
  const opening=openings.find(o=>o.id===shelf.openingId);if(!opening)throw Error('The adjustable shelf needs an available opening.');
  const drilled=shelfPattern(c,shelf,opening),depth=opening.size[2]-shelf.frontSetback;
  for(const side of [-1,1] as const){
   const boundary=opening.origin[0]+(side===1?opening.size[0]:0),panel=panels.find(p=>p.orientation==='yz'&&Math.abs(p.center[0]-side*p.size[0]/2-boundary)<.001&&p.center[1]-p.size[1]/2<=opening.origin[1]+.001&&p.center[1]+p.size[1]/2>=opening.origin[1]+opening.size[1]-.001);
   if(!panel)throw Error('Adjustable shelf holes need a side panel or divider at each side.');
   const min=Math.max(panel.center[2]-panel.size[2]/2,opening.origin[2]),max=Math.min(panel.center[2]+panel.size[2]/2,opening.origin[2]+depth);
   sets.push({shelf,panel,side,ys:drilled.ys.map(y=>opening.origin[1]+y),min,max});
  }
 }
 // Every hole set on a shared support uses the common usable depth. A
 // shallower shelf therefore keeps the divider rows aligned for both faces.
 const bores:CabineoBore[]=[];
 for(const set of sets){
  const {shelf,panel,side,ys}=set,thin=panel.size[0]<5,shared=sets.filter(other=>other.panel.id===panel.id),min=Math.max(...shared.map(s=>s.min)),max=Math.min(...shared.map(s=>s.max)),inset=Math.min(pattern.rowInset,(max-min-6)/2);
  if(inset<2.5)throw Error('The adjustable shelf needs more depth for its two support rows.');
  for(const z of [min+inset,max-inset])for(const y of ys){
   const point:Vec3=[panel.center[0]-side*panel.size[0]/2,y,z],id=`${panel.id}/adjustment/${+y.toFixed(4)}/${+z.toFixed(4)}/${side}`;
   bores.push({id,group:shelf.id,panelId:panel.id,kind:'shelf-support',point,axis:0,sign:side,diameter:5,depth:thin?panel.size[0]:Math.max(4,Math.min(8,panel.size[0]-2)),...(thin?{through:true}:{})});
  }
 }
 const output=new Map<string,CabineoBore>();
 for(const bore of bores){
  const physical=`${bore.panelId}/${+bore.point[1].toFixed(4)}/${+bore.point[2].toFixed(4)}`,existing=output.get(physical);
  if(existing&&existing.sign!==bore.sign){const panel=panels.find(p=>p.id===bore.panelId)!;output.set(physical,{...existing,id:physical,point:[panel.center[0]-panel.size[0]/2,bore.point[1],bore.point[2]],sign:1,depth:panel.size[0],through:true});}
  else if(!existing)output.set(physical,bore);
 }
 return [...output.values()];
}
