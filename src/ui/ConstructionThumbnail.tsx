import type {Panel} from '../geometry/evaluate';
import type {CabineoBore,CabineoJoint} from '../rules/cabineo';
import type {BackPocket} from '../rules/back-panel';
import {faceAxes} from '../geometry/banding';
import {preferredFace} from '../geometry/part-face';
import {machiningFaces} from '../rules/machining-review';
import {partPreview} from '../geometry/part-preview';
import {PartPaths} from './PartDrawing';
import {Section} from './components';

/** Draw the actual boards together, preserving their assembled separation. */
export function ConstructionThumbnail({panels,joints,pockets,drilling,backBores}:{panels:Panel[];joints:CabineoJoint[];pockets:BackPocket[];drilling:CabineoBore[];backBores:CabineoBore[]}){
 if(!panels.length)return null;
 const [u,v]=faceAxes[panels[0].orientation],bores=[...joints.flatMap(j=>j.bores),...drilling,...backBores];
 const low=Math.min(...panels.map(p=>p.center[u]-p.size[u]/2)),high=Math.max(...panels.map(p=>p.center[v]+p.size[v]/2));
 const width=Math.max(...panels.map(p=>p.center[u]+p.size[u]/2))-low,height=high-Math.min(...panels.map(p=>p.center[v]-p.size[v]/2));
 const scale=Math.min(228/width,232/height),w=width*scale,h=height*scale,x=(280-w)/2,y=(280-h)/2;
 return <Section title="Part preview">
  <svg className="part-thumbnail" viewBox="0 0 280 310" role="img" aria-label={`${panels.map(p=>p.label).join(' and ')}, ${width} by ${height} millimetres`}>
   <svg x={x} y={y} width={w} height={h} viewBox={`0 0 ${width} ${height}`} overflow="visible">
    {panels.map(panel=>{const faces=machiningFaces(panel,bores,pockets),face=faces.size===1?[...faces][0] as 1|-1:preferredFace(panel,bores);return <g key={panel.id} transform={`translate(${panel.center[u]-panel.size[u]/2-low} ${high-panel.center[v]-panel.size[v]/2})`}><PartPaths preview={partPreview(panel,bores,pockets,face,false)}/></g>;})}
   </svg>
   <text x="140" y={y+h+20} textAnchor="middle">{+width.toFixed(1)} mm</text>
   <text x={x-12} y="140" textAnchor="middle" transform={`rotate(-90 ${x-12} 140)`}>{+height.toFixed(1)} mm</text>
  </svg>
 </Section>;
}
