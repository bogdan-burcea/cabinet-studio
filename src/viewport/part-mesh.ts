import {pocketProfiles,rectProfile,circleProfile} from '../geometry/cut-profiles';
import * as THREE from 'three';
import clipping,{type MultiPolygon,type Polygon} from 'polygon-clipping';
import type {Panel} from '../geometry/evaluate';
import {faceAxes} from '../geometry/banding';
import type {BackPocket} from '../rules/back-panel';
import type {CabineoBore} from '../rules/cabineo';
const cache=new Map<string,THREE.BufferGeometry>();
const rectangle=rectProfile;
const shapes=(polygons:MultiPolygon)=>polygons.map(p=>{const shape=new THREE.Shape(p[0].map(v=>new THREE.Vector2(...v)));shape.holes=p.slice(1).map(r=>new THREE.Path(r.map(v=>new THREE.Vector2(...v))));return shape;});
/** Layered profile booleans create real blind bores and rectangular seats, without
 * floating hole meshes or cylinder wire cages. Canonical board bounds stay independent. */
export function panelDisplayGeometry(panel:Panel,pockets:BackPocket[],bores:CabineoBore[]=[]){
 const cuts=pockets.filter(p=>p.panelId===panel.id),holes=bores.filter(b=>b.panelId===panel.id);
 if(!cuts.length&&!holes.length)return new THREE.BoxGeometry(...panel.coreSize);
 const key=JSON.stringify([panel.coreSize,panel.coreCenter,cuts,holes]),cached=cache.get(key);if(cached)return cached.clone();
 const [u,v]=faceAxes[panel.orientation],n=([0,1,2].find(i=>i!==u&&i!==v)!) as 0|1|2,min=panel.coreCenter.map((x,i)=>x-panel.coreSize[i]/2),max=min.map((x,i)=>x+panel.coreSize[i]);
 const operations=[...cuts.flatMap(p=>pocketProfiles(p,u,v,panel.coreCenter[u],panel.coreCenter[v]).map(polygon=>({lo:p.origin[n],hi:p.origin[n]+p.size[n],polygon}))),...holes.map(b=>({lo:Math.min(b.point[n],b.point[n]+b.sign*b.depth),hi:Math.max(b.point[n],b.point[n]+b.sign*b.depth),polygon:circleProfile(b.point[u]-panel.coreCenter[u],b.point[v]-panel.coreCenter[v],b.diameter/2)}))];
 const levels=[...new Set([min[n],max[n],...operations.flatMap(o=>[Math.max(min[n],Math.min(max[n],o.lo)),Math.max(min[n],Math.min(max[n],o.hi))])])].sort((a,b)=>a-b),base=rectangle(-panel.coreSize[u]/2,-panel.coreSize[v]/2,panel.coreSize[u],panel.coreSize[v]);
 const layers=levels.slice(0,-1).map((lo,i)=>{const hi=levels[i+1],active=operations.filter(o=>(lo+hi)/2>o.lo-1e-6&&(lo+hi)/2<o.hi+1e-6);return {lo,hi,profile:active.length?clipping.difference(base,...active.map(o=>o.polygon)):[base] as MultiPolygon};});
 const positions:number[]=[],basis=new THREE.Matrix4().makeBasis(new THREE.Vector3().setComponent(u,1),new THREE.Vector3().setComponent(v,1),new THREE.Vector3().setComponent(n,1)),mirror=basis.determinant()<0;
 function append(g:THREE.BufferGeometry,z:number,reverse=false,start=0,count?:number,release=true){const raw=g.index?g.toNonIndexed():g,at=raw.getAttribute('position'),end=Math.min(at.count,start+(count??at.count));for(let i=start;i<end;i+=3)for(const j of mirror!==reverse?[0,2,1]:[0,1,2]){const p=[0,0,0];p[u]=at.getX(i+j);p[v]=at.getY(i+j);p[n]=at.getZ(i+j)+z-panel.coreCenter[n];positions.push(...p);}if(raw!==g)raw.dispose();if(release)g.dispose();}
 layers.forEach((layer,i)=>{
  if(!layer.profile.length)return;
  const shell=new THREE.ExtrudeGeometry(shapes(layer.profile),{depth:layer.hi-layer.lo,bevelEnabled:false,steps:1});
  for(const walls of shell.groups.filter(g=>g.materialIndex===1))append(shell,layer.lo,false,walls.start,walls.count,false);shell.dispose();
  const below=i?clipping.difference(layer.profile,layers[i-1].profile):layer.profile,above=i<layers.length-1?clipping.difference(layer.profile,layers[i+1].profile):layer.profile;
  if(below.length)append(new THREE.ShapeGeometry(shapes(below)),layer.lo,true);
  if(above.length)append(new THREE.ShapeGeometry(shapes(above)),layer.hi);
 });
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.computeVertexNormals();
 cache.set(key,result.clone());if(cache.size>48){const oldest=cache.keys().next().value!;cache.get(oldest)!.dispose();cache.delete(oldest);}return result;
}

/** Edges must belong to an orthogonal cut or a circular profile. Earcut's cap
 * bridges are triangulation details, not machining edges; nearly collinear cap
 * triangles can otherwise expose long spurious diagonals after Float32 rounding. */
export function panelDisplayEdges(panel:Panel,mesh:THREE.BufferGeometry,pockets:BackPocket[],bores:CabineoBore[]){
 const original=new THREE.EdgesGeometry(mesh,20),vertices=original.getAttribute('position'),positions:number[]=[];
 const circles=[...bores.filter(b=>b.panelId===panel.id).map(b=>({axis:b.axis,center:b.point,radius:b.diameter/2})),...pockets.filter(p=>p.panelId===panel.id).flatMap(p=>(p.reliefs??[]).map(r=>({axis:p.axis,center:r.center,radius:r.radius})))];
 for(let i=0;i<vertices.count;i+=2){const a=[vertices.getX(i),vertices.getY(i),vertices.getZ(i)],b=[vertices.getX(i+1),vertices.getY(i+1),vertices.getZ(i+1)],delta=a.map((n,j)=>b[j]-n);
  const orthogonal=delta.filter(n=>Math.abs(n)>.0001).length<=1;
  const curved=circles.some(circle=>{const axes=[0,1,2].filter(j=>j!==circle.axis),radius=(point:number[])=>Math.hypot(...axes.map(j=>point[j]+panel.coreCenter[j]-circle.center[j]));return Math.abs(delta[circle.axis])<.0001&&Math.hypot(...delta)<=circle.radius*.132+.001&&[a,b].every(point=>Math.abs(radius(point)-circle.radius)<.001);});
  if(orthogonal||curved)positions.push(...a,...b);
 }
 original.dispose();const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return geometry;
}
