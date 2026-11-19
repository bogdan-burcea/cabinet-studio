import type {Cabinet} from '../domain/cabinet';
import {evaluate} from '../geometry/evaluate';
import {setBackPanel,setBackFastener} from './back-panel';
import type {EditRepair} from './edit-repairs';
/** Move only the matched top/bottom back-fixing pair. Search whole mm from the
 * current position; each offered candidate passes geometry and collision review. */
export function backFixingRepairs(c:Cabinet):EditRepair[]{
 const f=c.carcass.back.joint?.fastener;if(!f)return [];
 const collisions=(candidate:Cabinet)=>{const e=evaluate(candidate),ids=new Set(e.backFasteners.map(b=>b.id));return e.issues.filter(i=>i.code==='machining-collision'&&i.operationIds?.some(id=>ids.has(id)));};
 if(!collisions(c).length)return [];
 const options:EditRepair[]=[],initial=f.offset??0,limit=Math.floor(c.envelope.width/2-50);
 for(const sign of [-1,1])for(let delta=1;delta<=2*limit;delta++){
  const offset=initial+sign*delta;if(Math.abs(offset)>limit)break;
  try{const next=setBackPanel(c,{fastener:{...f,offset}});if(!collisions(next).length){options.push({label:`Move top/bottom back fixings ${delta} mm ${sign<0?'left':'right'}`,cabinet:next});break;}}catch{/* Reject unsafe candidates. */}
 }
 if(!options.length){const cabinet=setBackFastener(c,false);try{evaluate(cabinet);options.push({label:'Remove incompatible back fixings',cabinet});}catch{}}
 return options;
}
