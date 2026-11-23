import {stock} from '../catalogue/materials';
import {HandleFields} from './HandleFields';
import type {Cabinet,SlabDoor} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {blumThin110,isThinHinge,thinPlateHeight,cupSetbackMax,defaultHinge,hingeProfiles,type HingeId} from '../catalogue/hinges';
import {conceptHandle} from '../catalogue/fronts';
import {Section,FieldPair} from './components';
import {Icon} from '../design-system/Icon';
import {DimensionField} from './DimensionField';
export function DoorHardwareInspector(p:{cabinet:Cabinet;evaluated:EvaluatedCabinet;ids:string[];onCommit(c:Cabinet):boolean;onCancel():void}){
 const doors=p.cabinet.fronts.filter(d=>p.ids.includes(d.id)),door=doors[0];if(!door)return null;
 const handle=door.handle,hinge=door.hinge;
 const mixedHinges=doors.some(d=>d.hinge?.id!==hinge?.id);
 const profile=hinge&&hingeProfiles[hinge.id],thin=!!hinge&&isThinHinge(hinge.id);
 const cupMax=hinge?Math.min(...doors.map(d=>cupSetbackMax(d.hinge?.id??hinge.id,d.placement==='inset'))):7;
 const selectedHardware=p.evaluated.doorHardware.hinges.filter(h=>p.ids.includes(h.ownerId));
 const fittedArticles=[...new Set(selectedHardware.map(h=>`${h.article} + ${h.plate}`))];
 const patch=(make:(d:SlabDoor)=>SlabDoor)=>p.onCommit({...p.cabinet,fronts:p.cabinet.fronts.map(d=>p.ids.includes(d.id)?make(d):d)});
 const setHandle=(change:Partial<SlabDoor['handle']>)=>patch(d=>({...d,handle:{...d.handle,...change}}));
 const setHinge=(change:Partial<NonNullable<SlabDoor['hinge']>>)=>patch(d=>{const {offsets,...regular}=d.hinge??defaultHinge();return {...d,hinge:{...regular,...change.count===undefined&&change.endOffset===undefined&&offsets?{offsets}:{},...change}};});
 const choice=(label:string,value:string,options:[string,string,boolean?][],onChange:(v:string)=>void)=><label className="construction-choice">{label}<span className="select select--fluid"><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,text,disabled])=><option key={v} value={v} disabled={disabled}>{text}</option>)}</select><Icon name="chevron" size={12}/></span></label>;
 const number=(label:string,value:number,min:number,max:number,commit:(v:number)=>boolean,step=1)=><DimensionField plain label={label} value={value} cancelValue={value} limits={{min,max}} step={step} onPreview={()=>{}} onCommit={commit} onCancel={p.onCancel}/>;
 return <>
 <Section title="Hinges">
 {choice('Hinge system',mixedHinges?'mixed':hinge?.id??'none',
 [['none','None'],...mixedHinges?[['mixed','Mixed'] as [string,string]]:[],...Object.values(hingeProfiles).map(h=>[h.id,isThinHinge(h.id)?'Blum · EXPANDO T 110° · soft-close':`Blum · BLUMOTION ${h.maxAngle}°`,isThinHinge(h.id)&&doors.some(d=>{const t=stock(p.cabinet,'front',d.id).thickness;return t<8||t>14;})] as [string,string,boolean])],
 value=>{if(value==='mixed')return;patch(d=>{
  const {hinge,...rest}=d;
  if(value==='none')return rest;
  const id=value as HingeId,next=hinge??defaultHinge(id),min=isThinHinge(id)?23.5:3;
  const body=p.evaluated.fronts.doors.find(b=>b.id===d.id),inward=d.handing==='left'?1:-1;
  const support=body?p.evaluated.panels.filter(panel=>panel.orientation==='yz'&&panel.center[1]-panel.size[1]/2<body.center[1]&&panel.center[1]+panel.size[1]/2>body.center[1]).sort((a,b)=>Math.abs(a.center[0]+inward*a.size[0]/2-body.pivot[0])-Math.abs(b.center[0]+inward*b.size[0]/2-body.pivot[0]))[0]:undefined;
  const b=body&&support?27+thinPlateHeight(support.size[0],body.size[2])+inward*(support.center[0]+inward*support.size[0]/2-body.pivot[0]):25;
  return {...rest,hinge:{...next,id,revision:hingeProfiles[id].revision,cupDistance:isThinHinge(id)&&(!hinge||!isThinHinge(hinge.id))?+b.toFixed(1):Math.max(min,Math.min(next.cupDistance,cupSetbackMax(id,d.placement==='inset')))}};
 });})}
 {hinge&&!mixedHinges&&<>
 <FieldPair>{number('Hinges / door',hinge.count,2,6,count=>setHinge({count}))}{number('End setback',hinge.endOffset,35,300,endOffset=>setHinge({endOffset}))}</FieldPair>
 <FieldPair>{number(thin?'Fixing distance B':'Cup setback',hinge.cupDistance,thin?23.5:3,cupMax,cupDistance=>setHinge({cupDistance}),.1)}</FieldPair>
 <p className="field-note">{fittedArticles.join(' / ')} · {thin?'Two Ø10 × 6 mm EXPANDO T fixings per hinge, 32 mm apart.':`Ø${profile?.cupDiameter} × ${profile?.cupDepth} mm cup.`} Integrated soft close.</p>
 <p className="field-note">{thin?'For 8–14 mm wood fronts only. B = front overlay + 27 mm + plate spacing; inset overlay is negative. B is measured to the fixing centres, 23.5–46 mm. Plate spacing follows side/front thickness.':`Cup setback: min. 3 mm, max. ${cupMax} mm, measured from the door edge to the Ø35 cup edge in Blum’s drawing.`}</p>
 <p className="field-note">Mounting-zone checks use an estimated clearance envelope.</p>
 <p className="field-note">{thin?'EXPANDO T uses expansion anchors, not cup screws. Support screw pilots remain application choices; follow the mounting plate assembly instructions.':'Count is user specified. Screw pilots: Ø2.5 × 10 door / ×8 support; confirm against your screws and stock.'}</p>
 </>}
 </Section>
 <HandleFields handle={handle} onChange={setHandle} onCancel={p.onCancel}/>
 </>;
}
