import type {Cabinet} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {Section,FieldPair} from './components';
import {DimensionField} from './DimensionField';
export function HingeInspector({cabinet,model,ids,commit}:{cabinet:Cabinet;model:EvaluatedCabinet;ids:string[];commit(c:Cabinet):boolean}){
 const hinges=model.doorHardware.hinges.filter(h=>ids.includes(h.id));if(!hinges.length)return null;
 const values=hinges.map(h=>cabinet.fronts.find(d=>d.id===h.ownerId)!.hinge?.offsets?.[Number(h.id.split('/').at(-1))]??0),common=values.every(v=>v===values[0])?values[0]:0;
 const offset=(id:string,value:number)=>commit({...cabinet,fronts:cabinet.fronts.map(d=>{
  const selected=hinges.filter(h=>h.ownerId===d.id&&(id==='all'||h.id===id));if(!selected.length||!d.hinge)return d;
  const offsets=Array.from({length:d.hinge.count},(_,i)=>d.hinge!.offsets?.[i]??0);
  for(const h of selected)offsets[Number(h.id.split('/').at(-1))]=value;
  return {...d,hinge:{...d.hinge,offsets}};
 })});
 return <Section title={hinges.length>1?'Selected hinges':'Hinge'}>
  {hinges.length>1&&<DimensionField plain label="Common offset" value={common} cancelValue={common} limits={{min:-3000,max:3000}} onPreview={()=>{}} onCommit={v=>offset('all',v)} onCancel={()=>{}}/>}
  <FieldPair>{hinges.map(h=>{const d=cabinet.fronts.find(d=>d.id===h.ownerId)!,i=Number(h.id.split('/').at(-1)),value=d.hinge?.offsets?.[i]??0;return <DimensionField key={h.id} plain label={`Hinge ${i+1} offset`} accessibleLabel={`${model.fronts.doors.find(p=>p.id===d.id)?.label} hinge ${i+1} offset`} value={value} cancelValue={value} limits={{min:-3000,max:3000}} onPreview={()=>{}} onCommit={v=>offset(h.id,v)} onCancel={()=>{}}/>;})}</FieldPair>
  <p className="field-note">Offsets move only the selected hinges from their regular positions. Plate and cup drilling move together.</p>
 </Section>;
}
