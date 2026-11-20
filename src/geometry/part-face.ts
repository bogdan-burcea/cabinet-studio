import type {Panel} from './evaluate';
import {faceAxes} from './banding';
import type {CabineoBore} from '../rules/cabineo';
/** Flat coordinates preserve an explicit physical face; never combine opposed bores. */
export function partFace(panel:Panel,bores:CabineoBore[],faceSign:1|-1,mirrorX?:boolean){
 const [u,v]=faceAxes[panel.orientation],axis=([0,1,2].find(n=>n!==u&&n!==v)!) as 0|1|2;
 const width=panel.size[u],height=panel.size[v],mirror=mirrorX??(faceSign===(axis===1?-1:1));
 return {width,height,thickness:panel.size[axis],axis,bores:bores.filter(b=>b.panelId===panel.id&&b.axis===axis&&(b.sign===-faceSign||b.through)).map(b=>{
  const x=b.point[u]-panel.center[u]+width/2,y=b.point[v]-panel.center[v]+height/2;
  return {...b,x:mirror?width-x:x,y:height-y};
 })};
}
export function preferredFace(panel:Panel,bores:CabineoBore[]):1|-1{
 const bore=bores.find(b=>b.panelId===panel.id);
 if(bore)return -bore.sign as 1|-1;
 return panel.role==='right'||panel.role==='top'||panel.role==='shelf'?-1:1;
}

/** Named directions in the assembled cabinet coordinate system. */
export function cabinetFace(axis:0|1|2,sign:1|-1){
 return (sign===1?['Right','Top','Front']:['Left','Bottom','Rear'])[axis];
}
