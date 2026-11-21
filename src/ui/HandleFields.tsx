import type {SlabDoor} from '../domain/cabinet';
import {conceptHandle} from '../catalogue/fronts';
import {Section,FieldPair} from './components';
import {DimensionField} from './DimensionField';
import {Icon} from '../design-system/Icon';
export function HandleFields({handle,onChange,onCancel,drawer=false}:{handle:SlabDoor['handle'];onChange(change:Partial<SlabDoor['handle']>):boolean;onCancel():void;drawer?:boolean}){
 const setHandle=onChange;
 const choice=(label:string,value:string,options:[string,string][],change:(v:string)=>void)=><label className="construction-choice">{label}<span className="select select--fluid"><select aria-label={label} value={value} onChange={e=>change(e.target.value)}>{options.map(([v,text])=><option key={v} value={v}>{text}</option>)}</select><Icon name="chevron" size={12}/></span></label>;
 const number=(label:string,value:number,min:number,max:number,commit:(v:number)=>boolean,step=1)=><DimensionField plain label={label} value={value} cancelValue={value} limits={{min,max}} step={step} onPreview={()=>{}} onCommit={commit} onCancel={onCancel}/>;
 return  <Section title="Handle">
 {choice('Handle type',handle.kind,[['none','None'],['pull','Pull'],['knob','Knob'],['hole','Finger hole'],['notch','Side notch']],value=>setHandle({kind:value as SlabDoor['handle']['kind'],...(value==='notch'?{height:'centre' as const,horizontal:'centre' as const,notchEdge:'top' as const,notchWidth:80,notchDepth:25,cornerDiameter:8}:{}),...(value==='hole'?{diameter:30}:value==='knob'?{diameter:24}:{})}))}
 {handle.kind==='notch'&&<>
 {choice('Notch edge',handle.notchEdge??'top',[['top','Top'],['bottom','Bottom'],['left','Left'],['right','Right']],v=>setHandle({notchEdge:v as SlabDoor['handle']['notchEdge']}))}
 <FieldPair>{number('Notch width',handle.notchWidth??80,10,500,v=>setHandle({notchWidth:v}),.1)}{number('Notch depth',handle.notchDepth??25,5,200,v=>setHandle({notchDepth:v}),.1)}</FieldPair>
 <FieldPair>{number('Outside radius',handle.outsideRadius??0,0,100,v=>setHandle({outsideRadius:v}),.1)}{number('Interior corner Ø',handle.cornerDiameter??8,1,100,v=>setHandle({cornerDiameter:v}),.1)}</FieldPair>
 <FieldPair>{choice('Position',handle.height,[['top','Near top'],['centre','Centre'],['bottom','Near bottom']],v=>setHandle({height:v as SlabDoor['handle']['height'],horizontal:v==='centre'?'centre':v==='top'?'right':'left'}))}</FieldPair>
 <p className="field-note">Interior corner diameter must accommodate the selected cutter. The notch cuts through the front.</p>
 </>}
 {handle.kind!=='none'&&handle.kind!=='notch'&&<>
 {handle.kind==='pull'&&<FieldPair>{choice('Orientation',handle.orientation,[['vertical','Vertical'],['horizontal','Horizontal']],v=>setHandle({orientation:v as SlabDoor['handle']['orientation']}))}{choice('Hole spacing',String(handle.pitch),conceptHandle.pitches.map(v=>[String(v),`${v} mm`]),v=>setHandle({pitch:Number(v)}))}</FieldPair>}
 <FieldPair>{choice(drawer?'Across front':'Across door',handle.horizontal??'latch',[...!drawer?[['latch','Latch side'] as [string,string]]:[],['left','Left'],['centre','Centre'],['right','Right']],v=>setHandle({horizontal:v as SlabDoor['handle']['horizontal']}))}{choice('Height anchor',handle.height,[['top','Top'],['centre','Centre'],['bottom','Bottom']],v=>setHandle({height:v as SlabDoor['handle']['height']}))}</FieldPair>
 <FieldPair>{(handle.horizontal??'latch')!=='centre'&&number('Side gap',handle.edgeOffset,10,200,edgeOffset=>setHandle({edgeOffset}),.1)}{handle.height!=='centre'&&number('End gap',handle.endOffset,10,300,endOffset=>setHandle({endOffset}),.1)}</FieldPair>
 <FieldPair>{handle.kind!=='pull'&&number('Diameter',handle.diameter??(handle.kind==='hole'?30:24),10,handle.kind==='hole'?100:80,diameter=>setHandle({diameter}),.1)}{handle.kind!=='hole'&&number('Projection',handle.projection??(handle.kind==='pull'?32:24),12,80,projection=>setHandle({projection}),.1)}{handle.kind!=='hole'&&number('Fixing Ø',handle.drillDiameter??5,2,8,drillDiameter=>setHandle({drillDiameter}),.1)}</FieldPair>
 {handle.kind==='hole'&&<p className="field-note">Finger-hole diameter: min. 10 mm, max. 100 mm (app limits); the hole must also fit the door with 5 mm edge clearance.</p>}
 <p className="field-note">Gaps are measured from the front edge to the handle outline. Fixings drill through the front. Handle bodies are generic geometry.</p>
 </>}
 </Section>;
}
