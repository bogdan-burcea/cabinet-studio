import {flatPreview,type FlatPart} from '../cnc/parts';
import type {Vec3} from '../domain/cabinet';

export type Point=[number,number];
export type Diagram={faces:{points:Point[];shade:number}[];width:number;height:number};
type Block={size:Vec3;center:Vec3};
const project=([x,y,z]:Vec3):Point=>[(x-z)*.866,(x+z)*.5-y];

function diagram(blocks:Block[]):Diagram {
 const faces=blocks.flatMap(({size,center})=>{
  const corner=(x:number,y:number,z:number)=>center.map((v,i)=>v+size[i]*[x,y,z][i]/2) as Vec3;
  const vertices=[corner(-1,-1,1),corner(1,-1,1),corner(1,1,1),corner(-1,1,1),corner(1,-1,-1),corner(1,1,-1),corner(-1,1,-1)];
  return [[0,1,2,3],[1,4,5,2],[3,2,5,6]].map((ids,shade)=>{
   const points=ids.map(i=>vertices[i]);
   return {points:points.map(project),shade,depth:points.reduce((sum,[x,y,z])=>sum+x+y+z,0)/4};
  });
 }).sort((a,b)=>a.depth-b.depth);
 const points=faces.flatMap(face=>face.points);
 const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));
 const shift=([a,b]:Point):Point=>[a-x,b-y];
 return {faces:faces.map(face=>({...face,points:face.points.map(shift)})),
  width:Math.max(...points.map(p=>p[0]))-x,height:Math.max(...points.map(p=>p[1]))-y};
}

export function partDiagram(part:FlatPart){
 const {width,height,thickness}=part;
 const view=diagram([{size:[width,thickness,height],center:[0,0,0]}]);
 const projectionOrigin=project([-width/2,thickness/2,height/2]);
 const anchor=view.faces.find(face=>face.shade===2)!.points[0];
 const toTop=(u:number,v:number):Point=>{
  const mapped=project([u-width/2,thickness/2,v-height/2]);
  return [anchor[0]+mapped[0]-projectionOrigin[0],anchor[1]+mapped[1]-projectionOrigin[1]];
 };
 const drills=flatPreview(part,part.face).face.bores;
 for(const bore of drills){
  const radius=bore.diameter/2;
  if(bore.x<radius||bore.x>width-radius||bore.y<radius||bore.y>height-radius)continue;
  view.faces.push({shade:3,points:Array.from({length:20},(_,i)=>{
   const angle=i*Math.PI/10;
   return toTop(bore.x+radius*Math.cos(angle),bore.y+radius*Math.sin(angle));
  })});
 }
 return view;
}

