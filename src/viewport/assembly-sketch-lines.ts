import type {Vec3} from '../domain/cabinet';
import type {AssemblyHandleSymbol,AssemblySketchLine} from '../rules/assembly';

/** Untextured front strokes in the box mesh's local coordinates, in millimetres. */
export function sketchLinePositions(size:Vec3,marks:AssemblySketchLine[],handles:AssemblyHandleSymbol[]):Float32Array{
 const positions:number[]=[],z=size[2]/2+.05;
 const line=(a:[number,number],b:[number,number])=>{
  if(a[0]===b[0]&&a[1]===b[1])return;
  positions.push(a[0]-size[0]/2,a[1]-size[1]/2,z,b[0]-size[0]/2,b[1]-size[1]/2,z);
 };
 for(const mark of marks)line(mark.from,mark.to);
 for(const handle of handles){
  if(handle.shape==='line')line(handle.from,handle.to);
  else if(handle.shape==='rectangle'){
   const [x,y]=handle.center,[w,h]=handle.size,corners:[number,number][]=[[x-w/2,y-h/2],[x+w/2,y-h/2],[x+w/2,y+h/2],[x-w/2,y+h/2]];
   corners.forEach((p,i)=>line(p,corners[(i+1)%4]));
  }else{
   // A closed polygon avoids texture stretching and keeps round symbols round.
   const point=(i:number):[number,number]=>[handle.center[0]+handle.radius*Math.cos(i/64*Math.PI*2),handle.center[1]+handle.radius*Math.sin(i/64*Math.PI*2)];
   for(let i=0;i<64;i++)line(point(i),point((i+1)%64));
  }
 }
 return new Float32Array(positions);
}
