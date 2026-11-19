import {defaultFootDrilling} from '../rules/foot-drilling';
import {plinthSetback} from '../rules/installation';
import {stock} from '../catalogue/materials';
import type {Cabinet} from '../domain/cabinet';
import {setSimpleSupport,setSimpleFeet,setSimplePlinth} from '../commands/simple-supports';
import {Section,FieldPair} from './components';
import {Icon} from '../design-system/Icon';
import {DimensionField} from './DimensionField';
export function BaseSupportInspector(p:{cabinet:Cabinet;onCommit(c:Cabinet):boolean;onCancel():void}){
 const i=p.cabinet.installation,f=i.feet,b=i.plinth,d=f.drilling??defaultFootDrilling(p.cabinet),wall=p.cabinet.cabinetType==='wall';
 const drill=(patch:Partial<typeof d>)=>p.onCommit(setSimpleFeet(p.cabinet,{drilling:{...d,...patch}}));
 const choice=(label:string,value:string,options:[string,string][],onChange:(v:string)=>void)=><label className="construction-choice">{label}<span className="select select--fluid"><select disabled={wall} aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,text])=><option key={v} value={v}>{text}</option>)}</select><Icon name="chevron" size={12}/></span></label>;
 const number=(label:string,value:number,min:number,max:number,commit:(n:number)=>boolean)=><DimensionField plain label={label} value={value} cancelValue={value} limits={{min,max}} onPreview={()=>{}} onCommit={commit} onCancel={p.onCancel}/>;
 const returns=b.leftReturn&&b.rightReturn?'both':b.leftReturn?'left':b.rightReturn?'right':'none';
 return <Section title="Feet & plinth">
 {choice('Support',i.type==='feet-concept'?(f.layout??'four'):'none',[['none','No feet'],['four','Four feet'],['front-pair','Two front feet']],v=>p.onCommit(setSimpleFeet(setSimpleSupport(p.cabinet,v==='none'?'unassigned':'feet-concept'),{layout:v==='front-pair'?'front-pair':'four'})))}
 {i.type==='feet-concept'&&<><FieldPair>{number('Foot height',f.height,5,200,height=>p.onCommit(setSimpleFeet(p.cabinet,{height})))}</FieldPair>
 <div className="support-group"><h4>Foot placement</h4><FieldPair>{number('Side inset',f.sideInset,30,600,sideInset=>p.onCommit(setSimpleFeet(p.cabinet,{sideInset})))}{number('Front inset',f.frontInset,30,600,frontInset=>p.onCommit(setSimpleFeet(p.cabinet,{frontInset})))}{f.layout!=='front-pair'&&number('Rear inset',f.rearInset,30,600,rearInset=>p.onCommit(setSimpleFeet(p.cabinet,{rearInset})))}</FieldPair></div>
 <div className="support-group"><h4>Foot holes</h4>{choice('Hole pattern',d.pattern,[['single','Single'],['pair','Pair'],['triangle','Triangle'],['rectangle','Rectangle']],pattern=>drill({pattern:pattern as typeof d.pattern}))}<FieldPair>{d.pattern!=='single'&&number('Width spacing',d.pitchX,4,50,pitchX=>drill({pitchX}))}{['triangle','rectangle'].includes(d.pattern)&&number('Depth spacing',d.pitchZ,4,50,pitchZ=>drill({pitchZ}))}{number('Hole Ø',d.diameter,1,8,diameter=>drill({diameter}))}</FieldPair></div>
 {choice('Plinth',b.enabled?'on':'off',[['off','None'],['on','Front plinth']],v=>p.onCommit(setSimplePlinth(p.cabinet,{enabled:v==='on'})))}
 {b.enabled&&<>{choice('Side returns',returns,[['none','None'],['left','Left'],['right','Right'],['both','Both sides']],v=>p.onCommit(setSimplePlinth(p.cabinet,{leftReturn:v==='left'||v==='both',rightReturn:v==='right'||v==='both'})))}<FieldPair>{number('Gap to front feet',Math.max(0,b.footGap??f.frontInset-30-stock(p.cabinet,'plinth').thickness-plinthSetback(p.cabinet)),0,150,footGap=>p.onCommit(setSimplePlinth(p.cabinet,{footGap})))}{number('Top gap',b.topGap,0,20,topGap=>p.onCommit(setSimplePlinth(p.cabinet,{topGap})))}{number('Floor gap',b.bottomGap,0,20,bottomGap=>p.onCommit(setSimplePlinth(p.cabinet,{bottomGap})))}</FieldPair></>}
 <p className="field-note">Foot holes drill through the bottom. Plinth height is at least 40 mm. Fitting articles and load capacity remain unverified.</p></>}
 {wall&&<p className="field-note">Feet and plinth are unavailable for wall cabinets.</p>}
 </Section>;
}
