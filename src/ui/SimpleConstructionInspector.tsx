import type {ReactNode} from 'react';
import type {Cabinet,Carcass} from '../domain/cabinet';
import {changeConstruction,setConstructionMode,defaultFrontRails} from '../commands/construction';
import {OPTIONAL_RAIL_LIMITS} from '../rules/construction';
import {Icon} from '../design-system/Icon';
import {Section,FieldPair} from './components';
import {DimensionField} from './DimensionField';
export function SimpleConstructionInspector({cabinet,scope='top',commit,railFasteners}:{cabinet:Cabinet;scope?:'top'|'front';commit(c:Cabinet):boolean;railFasteners?:ReactNode}){
 const c=cabinet.carcass,rails=c.frontRails??defaultFrontRails();
 const width=(label:string,value:number,edit:(n:number)=>Carcass)=><DimensionField key={label} plain label={label} step={.1} value={value} cancelValue={value} limits={OPTIONAL_RAIL_LIMITS} onPreview={()=>{}} onCommit={n=>commit(changeConstruction(cabinet,edit(n)))} onCancel={()=>{}}/>;
 return <>
 {scope==='top'&&<Section title="Top panel">
 <label className="construction-choice">Construction<span className="select select--fluid"><select aria-label="Top construction" value={c.top.mode} onChange={e=>commit(setConstructionMode(cabinet,'top',e.target.value as Carcass['top']['mode']))}><option value="full">Full panel</option><option value="open">Open</option><option value="rails">Front & rear rails</option></select><Icon name="chevron" size={12}/></span></label>
 {c.top.mode==='rails'&&<FieldPair>{width('Front rail width',c.top.frontDepth,n=>({...c,top:{...c.top,frontDepth:n}}))}{width('Rear rail width',c.top.rearDepth,n=>({...c,top:{...c.top,rearDepth:n}}))}</FieldPair>}
 {c.top.mode==='rails'&&railFasteners}
 </Section>}
 {scope==='front'&&<Section title="Front reinforcement" aside={<span className="unit-badge">mm</span>}>
 <FieldPair>{(['top','bottom'] as const).map(side=><label className="construction-choice" key={side}>{side==='top'?'Top rail':'Bottom rail'}<span className="select select--fluid"><select aria-label={`${side==='top'?'Top':'Bottom'} front reinforcement`} value={rails[side].enabled?'on':'off'} onChange={e=>commit(changeConstruction(cabinet,{...c,frontRails:{...rails,[side]:{...rails[side],enabled:e.target.value==='on'}}}))}><option value="off">None</option><option value="on">Rail</option></select><Icon name="chevron" size={12}/></span></label>)}</FieldPair>
 {(rails.top.enabled||rails.bottom.enabled)&&<FieldPair>{(['top','bottom'] as const).filter(side=>rails[side].enabled).map(side=>width(side==='top'?'Top rail width':'Bottom rail width',rails[side].width,n=>({...c,frontRails:{...rails,[side]:{...rails[side],width:n}}})))}</FieldPair>}
 </Section>}
 </>;
}
