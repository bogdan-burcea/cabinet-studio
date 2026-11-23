import type {CabineoBore} from './cabineo';
/** Minimum edge-to-feature gap for automatic safe-placement corrections. */
export const SAFE_FEATURE_CLEARANCE=10;
/** Exact intersection of finite, axis-aligned drill cylinders. Tangency is not
 * interference. Unlike bounding boxes, perpendicular bores need a shared round section. */
export function holesOverlap(a:CabineoBore,b:CabineoBore){
 const interval=(h:CabineoBore)=>{const end=h.point[h.axis]+h.sign*h.depth;return [Math.min(h.point[h.axis],end),Math.max(h.point[h.axis],end)];},ia=interval(a),ib=interval(b),ra=a.diameter/2-.001,rb=b.diameter/2-.001;
 if(a.axis===b.axis)return Math.min(ia[1],ib[1])-Math.max(ia[0],ib[0])>.001&&a.point.reduce((sum,n,i)=>sum+(i===a.axis?0:(n-b.point[i])**2),0)<(ra+rb)**2;
 const gap=(n:number,span:number[])=>Math.max(span[0]-n,0,n-span[1]),dx=gap(b.point[a.axis],ia),dy=gap(a.point[b.axis],ib),cross=([0,1,2] as const).find(i=>i!==a.axis&&i!==b.axis)!;
 if(dx>=rb||dy>=ra)return false;
 const za=Math.sqrt(ra*ra-dy*dy),zb=Math.sqrt(rb*rb-dx*dx);
 return Math.min(a.point[cross]+za,b.point[cross]+zb)-Math.max(a.point[cross]-za,b.point[cross]-zb)>.001;
}
export function intentionalHoleUnion(a:CabineoBore,b:CabineoBore){
 // The pinned Cabineo housing/pilot pattern is one intentional compound cut.
 if(a.group===b.group&&[a.kind,b.kind].every(k=>k==='housing'||k==='pilot'))return true;
 // Aligned opposed Cabineo receivers share one physical pilot after one-face
 // conversion. Only an exactly coaxial, equal-diameter contained cut is shared.
 if(a.kind==='receiver'&&b.kind==='receiver'&&a.panelId===b.panelId&&a.axis===b.axis&&Math.abs(a.diameter-b.diameter)<.001&&a.point.every((n,i)=>i===a.axis||Math.abs(n-b.point[i])<.001)){
  const span=(h:CabineoBore)=>{const end=h.point[h.axis]+h.sign*h.depth;return [Math.min(h.point[h.axis],end),Math.max(h.point[h.axis],end)];},sa=span(a),sb=span(b);
  if(a.through&&sa[0]<=sb[0]+.001&&sa[1]>=sb[1]-.001||b.through&&sb[0]<=sa[0]+.001&&sb[1]>=sa[1]-.001)return true;
 }
 // Shared opposed shelf rows represent the same physical through bore.
 return a.kind==='shelf-support'&&b.kind==='shelf-support'&&a.through&&b.through&&a.axis===b.axis&&Math.abs(a.diameter-b.diameter)<.001&&a.point.every((n,i)=>i===a.axis||Math.abs(n-b.point[i])<.001);
}

/** Keep at least 4 mm of material between a foot hole and any other cut. */
export function footHoleSafetyConflict(a:CabineoBore,b:CabineoBore){
 if(a.kind==='foot-pilot')return holesOverlap({...a,diameter:a.diameter+8},b);
 if(b.kind==='foot-pilot')return holesOverlap(a,{...b,diameter:b.diameter+8});
 return false;
}
