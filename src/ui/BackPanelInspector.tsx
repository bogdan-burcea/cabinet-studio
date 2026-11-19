import type {Cabinet} from '../domain/cabinet';
import {stock} from '../catalogue/materials';
import {setBackFastener,setBackPanel,defaultBackJoint,type BackJoint} from '../commands/back-panel';
import {Section} from './components';
import {Icon} from '../design-system/Icon';
import {DimensionField} from './DimensionField';
export function BackPanelInspector({cabinet,onCommit,onCancel}:{cabinet:Cabinet;onCommit(c:Cabinet):boolean;onCancel():void}){
 const joint=cabinet.carcass.back.joint??defaultBackJoint;
 return <Section title="Back panel"><label className="construction-choice">Thickness<span className="select select--fluid"><select aria-label="Back thickness" value={stock(cabinet,'back').thickness} onChange={e=>onCommit(setBackPanel(cabinet,{thickness:+e.target.value}))}>{[3,6,9,12,16,18].map(n=><option key={n} value={n}>{n} mm</option>)}</select><Icon name="chevron" size={12}/></span></label>
 <label className="construction-choice back-construction">Construction<span className="select select--fluid"><select aria-label="Back construction" value={joint.mode} onChange={e=>onCommit(setBackPanel(cabinet,{mode:e.target.value as BackJoint['mode']}))}><option value="inset">Inset between panels</option><option value="applied">Applied</option><option value="groove">In grooves / dados</option><option value="rebate">In rebates</option></select><Icon name="chevron" size={12}/></span></label>
 {joint.mode==='groove'&&<DimensionField plain label="Rear inset" value={joint.inset} cancelValue={joint.inset} limits={{min:3,max:100}} onPreview={()=>{}} onCommit={n=>onCommit(setBackPanel(cabinet,{inset:n}))} onCancel={onCancel}/>}
 {['groove','rebate'].includes(joint.mode)&&<DimensionField plain label="Seat depth" value={joint.depth} cancelValue={joint.depth} limits={{min:1,max:stock(cabinet,'carcass').thickness-3}} onPreview={()=>{}} onCommit={n=>onCommit(setBackPanel(cabinet,{depth:n}))} onCancel={onCancel}/>}
 <label className="construction-choice back-construction">Fasteners<span className="select select--fluid"><select aria-label="Back fasteners" value={joint.fastener?.id??''} onChange={e=>onCommit(setBackFastener(cabinet,!!e.target.value))}><option value="">None</option><option value="hafele-26009765">Häfele Ixconnect 260.09.765</option></select><Icon name="chevron" size={12}/></span></label>
 {!joint.fastener&&<p className="field-note">Selecting Ixconnect sets a 3 mm grooved back, rear inset ≥11 mm and seat depth ≤6 mm.</p>}
 {joint.fastener&&<DimensionField plain label="Per side" value={joint.fastener.perSide} cancelValue={joint.fastener.perSide} limits={{min:1,max:20}} onPreview={()=>{}} onCommit={n=>onCommit(setBackPanel(cabinet,{fastener:{...joint.fastener!,perSide:n}}))} onCancel={onCancel}/>}
 </Section>;
}
