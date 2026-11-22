import type {BackPocket} from '../src/rules/back-panel';
/** A bounding-box overlap is clear only when one actual through notch contains
 * the entire shared volume. This does not waive arbitrary intersections. */
export function disjointAfterNotches(a:{id:string;size:number[];center:number[]},b:{id:string;size:number[];center:number[]},cuts:BackPocket[]){
 const lo=a.size.map((n,i)=>Math.max(a.center[i]-n/2,b.center[i]-b.size[i]/2));
 const hi=a.size.map((n,i)=>Math.min(a.center[i]+n/2,b.center[i]+b.size[i]/2));
 if(lo.some((n,i)=>hi[i]-n<=1e-6))return true;
 return cuts.some(c=>c.kind==='rail-notch'&&(c.panelId===a.id||c.panelId===b.id)&&lo.every((n,i)=>c.origin[i]<=n+1e-6&&c.origin[i]+c.size[i]>=hi[i]-1e-6));
}
