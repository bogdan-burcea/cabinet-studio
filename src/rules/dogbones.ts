import type {Cabinet,Vec3} from '../domain/cabinet';
import type {BackPocket} from './back-panel';
import type {ConstructionPanel} from './construction';
import {cnc} from './cnc';
/** Back seats use T-bones, tangent to the closed end and widened across the slot.
 * Other joinery keeps diagonal relief at r/√2 inside the pocket.
 * Only internal profile corners receive relief; open stock edges are excluded. */
export function addDogbones(c:Cabinet,panels:(Pick<ConstructionPanel,'role'|'origin'|'size'>&{id?:string})[],cuts:BackPocket[]):BackPocket[]{
 const settings=cnc(c),grooves=['groove','rebate'].includes(c.carcass.back.joint?.mode??'');if(!settings.dogbones&&!grooves)return cuts;
 const r=settings.bitDiameter/2,offset=r/Math.SQRT2;
 return cuts.map(cut=>{if(!settings.dogbones&&!(grooves&&cut.id.includes('/back-seat/')))return cut;const panel=panels.find(p=>(p.id??`${c.id}/panel/${p.role}`)===cut.panelId);if(!panel)return cut;const axes=[0,1,2].filter(a=>a!==cut.axis),[u,v]=axes,reliefs:{center:Vec3;radius:number}[]=[];
  // A cutter that cannot enter a slot must not enlarge the fit clearance.
  // Keep the designed cut, skip unavailable relief, and report tooling separately.
  if(Math.min(cut.size[u],cut.size[v])+1e-6<settings.bitDiameter)return {...cut,reliefs:[]};
  const face=cut.face===1?panel.origin[cut.axis]+panel.size[cut.axis]:panel.origin[cut.axis],active=cuts.filter(other=>other.panelId===cut.panelId&&other.axis===cut.axis&&other.origin[cut.axis]<=face+1e-6&&other.origin[cut.axis]+other.size[cut.axis]>=face-1e-6);
  const solid=(x:number,y:number)=>x>panel.origin[u]&&x<panel.origin[u]+panel.size[u]&&y>panel.origin[v]&&y<panel.origin[v]+panel.size[v]&&!active.some(other=>x>other.origin[u]&&x<other.origin[u]+other.size[u]&&y>other.origin[v]&&y<other.origin[v]+other.size[v]);
  for(const su of [0,1])for(const sv of [0,1]){const x=cut.origin[u]+su*cut.size[u],y=cut.origin[v]+sv*cut.size[v];
   // Test the remaining profile, including adjacent cuts. Only a concave
   // corner (three solid quadrants) needs cutter relief. Convex finger tips,
   // stock edges and corners already opened by another cut do not.
   const eps=1e-5,quadrants=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([a,b])=>({a,b,solid:solid(x+a*eps,y+b*eps)}));
   if(quadrants.filter(q=>q.solid).length!==3)continue;
   const empty=quadrants.find(q=>!q.solid)!,center=[...cut.origin] as Vec3;if(cut.id.includes('/back-seat/')){center[u]=x+(cut.size[u]>=cut.size[v]?empty.a*r:0);center[v]=y+(cut.size[v]>cut.size[u]?empty.b*r:0);}else{center[u]=x+empty.a*offset;center[v]=y+empty.b*offset;}reliefs.push({center,radius:r});
  }
  return {...cut,reliefs};
 });
}

/** Tool feasibility is a notice, independent of the designed mating clearance. */
export function narrowToolCuts(c:Cabinet,cuts:BackPocket[]):BackPocket[]{
 const settings=cnc(c),seats=['groove','rebate'].includes(c.carcass.back.joint?.mode??'');
 return cuts.filter(cut=>(settings.dogbones||seats&&cut.id.includes('/back-seat/'))&&!cut.outline&&Math.min(...cut.size.filter((_,axis)=>axis!==cut.axis))+1e-6<settings.bitDiameter);
}
