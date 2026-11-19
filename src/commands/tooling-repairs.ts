import type {Cabinet} from '../domain/cabinet';
import {evaluate} from '../geometry/evaluate';
import {narrowToolCuts} from '../rules/dogbones';
import {cnc} from '../rules/cnc';
import {stock} from '../catalogue/materials';
import {setCnc} from './cnc';
import {setBackPanel,setBackFastener} from './back-panel';
import type {EditRepair} from './edit-repairs';
/** Repair tooling without changing the fit allowance or arbitrary slot dimensions. */
export function toolingRepairs(c:Cabinet):EditRepair[]{
 const e=evaluate(c),cuts=narrowToolCuts(c,e.pockets);if(!cuts.length)return [];
 const width=Math.min(...cuts.flatMap(p=>p.size.filter((_,i)=>i!==p.axis))),options:EditRepair[]=[];
 const add=(label:string,cabinet:Cabinet)=>{try{const next=evaluate(cabinet);if(!narrowToolCuts(cabinet,next.pockets).length)options.push({label,cabinet});}catch{/* Never offer an invalid repair. */}};
 const bit=Math.floor(width+1e-6);if(bit>=1)add(`Use a Ø${bit} mm cutter`,setCnc(c,{bitDiameter:bit}));
 const joint=c.carcass.back.joint;
 if(cuts.every(p=>!p.kind)&&joint?.mode==='groove'){
  const thickness=Math.max(stock(c,'back').thickness,Math.ceil(cnc(c).bitDiameter-joint.clearance));
  if(thickness<=24){const next=setBackPanel(c,{thickness});if(joint.fastener&&thickness>3.5)add(`Use ${thickness} mm back stock; remove incompatible Ixconnect fixings`,setBackFastener(next,false));else add(`Use ${thickness} mm back stock to widen its groove`,next);}
 }
 return options;
}
