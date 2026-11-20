import type {Cabinet,Vec3,SlabDoor} from '../domain/cabinet';
import type {BackPocket} from './back-panel';
import type {FrontBody} from './fronts';
import type {EvaluatedDrawer} from './drawers';
import {cnc} from './cnc';
/** Through profiles are shared by assembly, face previews, nesting and STEP. */
export function frontProfileCuts(c:Cabinet,doors:FrontBody[],drawers:EvaluatedDrawer[]):BackPocket[]{
 const cuts:BackPocket[]=[];
 const fronts=[...doors.map(body=>({body,radius:c.fronts.find(d=>d.id===body.id)?.cornerRadius??0,handle:c.fronts.find(d=>d.id===body.id)!.handle})),...drawers.map(d=>({body:d.parts.find(p=>p.id===d.id+'/front')!,radius:d.intent.cornerRadius??0,handle:d.intent.handle}))];
 for(const {body,radius,handle:h} of fronts){
  const [w,hh,t]=body.size,[cx,cy,cz]=body.center,x=cx-w/2,y=cy-hh/2,z=cz-t/2;
  const add=(key:string,points:[number,number][])=>{
   const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),lo=[Math.min(...xs),Math.min(...ys),z] as Vec3;
   cuts.push({id:body.id+'/profile/'+key,panelId:body.id,kind:'front-profile',axis:2,face:1,origin:lo,size:[Math.max(...xs)-lo[0],Math.max(...ys)-lo[1],t],outline:points.map(p=>[p[0],p[1],z])});
  };
  if(!Number.isFinite(radius)||radius<0||radius>Math.min(w,hh)/2||Math.abs(radius*10-Math.round(radius*10))>1e-6)throw Error('Front corner radius must be 0 mm to half the smaller front dimension, in 0.1 mm steps.');
  if(radius>0)for(const sx of [-1,1])for(const sy of [-1,1]){
   const corner:[number,number]=[cx+sx*w/2,cy+sy*hh/2],center:[number,number]=[corner[0]-sx*radius,corner[1]-sy*radius];
   const points:[number,number][]=[corner,[corner[0],corner[1]-sy*radius]];
   for(let i=0;i<=16;i++){const a=i*Math.PI/32;points.push([center[0]+sx*radius*Math.cos(a),center[1]+sy*radius*Math.sin(a)]);}
   points.push(corner);add(`corner-${sx}-${sy}`,points);
  }
  if(h?.kind==='notch'){
   const width=h.notchWidth??80,depth=h.notchDepth??25,diameter=h.cornerDiameter??8,r=diameter/2,outer=h.outsideRadius??0,edge=h.notchEdge??'top',vertical=edge==='left'||edge==='right',span=vertical?hh:w;
   if(![width,depth,diameter].every(Number.isFinite)||width<10||depth<5||r<.5||width<2*r||depth<r||width>span-10||depth>(vertical?w:hh)-5)throw Error('Side notch must fit the front: width ≥ corner diameter, depth ≥ corner radius, with 5 mm clearance at its ends.');
   if(diameter+1e-6<cnc(c).bitDiameter)throw Error(`Notch interior corner Ø${diameter} mm is smaller than the Ø${cnc(c).bitDiameter} mm cutter. Increase corner diameter or use a smaller cutter.`);
   const anchor=vertical?h.height:(h.horizontal??'centre'),centre=anchor==='centre'?span/2:anchor==='top'||anchor==='right'||anchor==='latch'?span-(vertical?h.endOffset:h.edgeOffset)-width/2:(vertical?h.endOffset:h.edgeOffset)+width/2;
   const start=centre-width/2,end=centre+width/2;if(start<5||end>span-5)throw Error('Side notch must leave 5 mm at both ends of the selected edge.');
   if(!Number.isFinite(outer)||outer<0||outer>100||Math.abs(outer*10-Math.round(outer*10))>1e-6||outer+r>depth||start-outer<5||end+outer>span-5)throw Error('Outside notch radius must fit the notch depth and leave 5 mm at the edge ends. Reduce the radius or increase notch depth.');
   const points:[number,number][]=[[start-outer,-.1],[end+outer,-.1],[end+outer,0]];
   // Convex mouth corners round the remaining front, independently of the inner corners.
   if(outer>0)for(let i=0;i<=16;i++){const a=-Math.PI/2-i*Math.PI/32;points.push([end+outer+outer*Math.cos(a),outer+outer*Math.sin(a)]);}
   points.push([end,depth-r]);
   for(let i=0;i<=16;i++){const a=i*Math.PI/32;points.push([end-r+r*Math.cos(a),depth-r+r*Math.sin(a)]);}
   points.push([start+r,depth]);for(let i=0;i<=16;i++){const a=Math.PI/2+i*Math.PI/32;points.push([start+r+r*Math.cos(a),depth-r+r*Math.sin(a)]);}
   points.push([start,outer]);
   if(outer>0)for(let i=0;i<=16;i++){const a=-i*Math.PI/32;points.push([start-outer+outer*Math.cos(a),outer+outer*Math.sin(a)]);}
   points.push([start-outer,-.1]);
   add('notch',points.map(([u,v])=>edge==='left'?[x+v,y+u]:edge==='right'?[x+w-v,y+u]:edge==='bottom'?[x+u,y+v]:[x+u,y+hh-v]));
  }
 }
 return cuts;
}
