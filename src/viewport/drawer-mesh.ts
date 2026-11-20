import * as THREE from 'three';
import leftWall from './assets/antaro-wall-left.json';
import rightWall from './assets/antaro-wall-right.json';
import leftRunner from './assets/antaro-runner-left.json';
import rightRunner from './assets/antaro-runner-right.json';
import leftBack from './assets/antaro-back-left.json';
import rightBack from './assets/antaro-back-right.json';
import type {DrawerPart} from '../rules/drawers';

type Point=[number,number,number];
const meshCache=new Map<string,THREE.BufferGeometry>(),edgeCache=new Map<string,THREE.BufferGeometry>();
const keyOf=(part:DrawerPart)=>`${part.id.slice(part.id.indexOf('/')+1)}:${part.size.join(',')}`;
function remember(cache:Map<string,THREE.BufferGeometry>,key:string,geometry:THREE.BufferGeometry){
 cache.set(key,geometry.clone());if(cache.size>96){const key=cache.keys().next().value!;cache.get(key)!.dispose();cache.delete(key);}
}
export function drawerDisplayEdges(part:DrawerPart,geometry:THREE.BufferGeometry){
 const key=keyOf(part),cached=edgeCache.get(key);if(cached)return cached.clone();
 const edges=new THREE.EdgesGeometry(geometry,20);remember(edgeCache,key,edges);return edges;
}
// Clip out a plain strip, then join its boundaries. Unlike global scaling,
// this preserves the cross-section, bores and end mechanisms outside the strip.
function removeStrip(triangles:Point[][],axis:1|2,lo:number,hi:number):Point[][]{
 const clip=(polygon:Point[],bound:number,below:boolean)=>{
  const result:Point[]=[];
  for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length];
   const inside=(p:Point)=>below?p[axis]<=bound:p[axis]>=bound;
   if(inside(a))result.push(a);
   if(inside(a)!==inside(b)){
    const f=(bound-a[axis])/(b[axis]-a[axis]);
    result.push(a.map((n,d)=>n+(b[d]-n)*f) as Point);
   }
  }
  return result;
 };
 return triangles.flatMap(triangle=>[clip(triangle,lo,true),clip(triangle,hi,false).map(p=>p.map((n,i)=>i===axis?n-(hi-lo):n) as Point)].flatMap(p=>p.slice(1,-1).map((_,i)=>[p[0],p[i+1],p[i+2]])));
}

// K550 comes directly from the assembled STEP in millimetres. M/500 variants
// are display adaptations of plain strips; they are not manufacturer M/500 CAD.
export function drawerDisplayGeometry(part:DrawerPart){
 const left=part.id.endsWith('-left'),wall=part.id.includes('/side-'),runner=part.id.includes('/runner-'),back=part.id.includes('/back-fixing-');
 if(!wall&&!runner&&!back)return part.shape==='cylinder'?new THREE.CylinderGeometry(part.size[0]/2,part.size[0]/2,part.size[2],24).rotateX(Math.PI/2):new THREE.BoxGeometry(...part.size);
 const key=keyOf(part),cached=meshCache.get(key);if(cached)return cached.clone();
 const source=wall?(left?leftWall:rightWall):runner?(left?leftRunner:rightRunner):(left?leftBack:rightBack);
 const point=(index:number)=>source.vertices.slice(index*3,index*3+3) as Point;
 let triangles:Point[][]=[];
 for(let i=0;i<source.triangles.length;i+=3)triangles.push(source.triangles.slice(i,i+3).map(point));
 if(wall&&part.size[1]<100||back&&part.size[1]<80)triangles=removeStrip(triangles,1,90,122);
 if(wall||runner){
  const length=part.size[2]+(runner?2.8:0),delta=550-length;
  if(delta>0)triangles=removeStrip(triangles,2,-420,-420+delta);
  else if(delta<0)triangles=triangles.map(t=>t.map(p=>[p[0],p[1],p[2]+delta*Math.max(0,Math.min(1,(-370-p[2])/50))]));
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(triangles.flat(2),3));
 geometry.computeBoundingBox();const center=geometry.boundingBox!.getCenter(new THREE.Vector3());
 geometry.translate(-center.x,-center.y,-center.z);
 geometry.computeVertexNormals();
 remember(meshCache,key,geometry);
 return geometry;
}
