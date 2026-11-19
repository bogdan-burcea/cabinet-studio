import type {Cabinet,Vec3} from '../domain/cabinet';
import type {BackPocket} from './back-panel';
import type {ConstructionPanel} from './construction';
import {cnc} from './cnc';
/** Diagonal dogbones: cutter centre lies r/√2 inside the rectangular pocket.
 * Only internal profile corners receive relief; open stock edges are excluded. */
export function addDogbones(c:Cabinet,panels:(Pick<ConstructionPanel,'role'|'origin'|'size'>&{id?:string})[],cuts:BackPocket[]):BackPocket[]{
 const settings=cnc(c);if(!settings.dogbones)return cuts;
 const r=settings.bitDiameter/2,offset=r/Math.SQRT2;
 return cuts.map(cut=>{const panel=panels.find(p=>(p.id??`${c.id}/panel/${p.role}`)===cut.panelId);if(!panel)return cut;const axes=[0,1,2].filter(a=>a!==cut.axis),[u,v]=axes,reliefs:{center:Vec3;radius:number}[]=[];
  if(Math.min(cut.size[u],cut.size[v])<settings.bitDiameter)throw Error('The cutter is wider than a connection slot. Use a smaller drill bit or widen the slot.');
  for(const su of [0,1])for(const sv of [0,1]){const x=cut.origin[u]+su*cut.size[u],y=cut.origin[v]+sv*cut.size[v];if(x<=panel.origin[u]+.001||x>=panel.origin[u]+panel.size[u]-.001||y<=panel.origin[v]+.001||y>=panel.origin[v]+panel.size[v]-.001)continue;const center=[...cut.origin] as Vec3;center[u]=x+(su?-offset:offset);center[v]=y+(sv?-offset:offset);reliefs.push({center,radius:r});}
  return {...cut,reliefs};
 });
}
