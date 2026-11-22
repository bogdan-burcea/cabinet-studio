import type {BackPocket} from './back-panel';
/** A feature may cross two adjoining rail notches. Check their union rather than
 * requiring a single cut to contain the entire clipped feature bounding box. */
export function clearedByRailNotches(from:number[],to:number[],cuts:BackPocket[]){
 if(!cuts.length||from.some((n,i)=>to[i]-n<1e-6))return false;
 const axes=[0,1,2].map(axis=>[...new Set([from[axis],to[axis],...cuts.flatMap(p=>[p.origin[axis],p.origin[axis]+p.size[axis]]).filter(n=>n>from[axis]+1e-6&&n<to[axis]-1e-6)])].sort((a,b)=>a-b));
 for(let x=0;x<axes[0].length-1;x++)for(let y=0;y<axes[1].length-1;y++)for(let z=0;z<axes[2].length-1;z++){
  const point=[x,y,z].map((index,axis)=>(axes[axis][index]+axes[axis][index+1])/2);
  if(!cuts.some(c=>point.every((n,i)=>n>=c.origin[i]-1e-6&&n<=c.origin[i]+c.size[i]+1e-6)))return false;
 }
 return true;
}
