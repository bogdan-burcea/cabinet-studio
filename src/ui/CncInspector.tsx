import type {Cabinet} from '../domain/cabinet';
import {cnc} from '../rules/cnc';
import {setCnc} from '../commands/cnc';
import {Section} from './components';
import {DimensionField} from './DimensionField';
import {Icon} from '../design-system/Icon';
export function CncInspector({cabinet,onCommit,onCancel}:{cabinet:Cabinet;onCommit(c:Cabinet):boolean;onCancel():void}){
 const value=cnc(cabinet);
 return <Section title="Machining"><DimensionField plain label="Joint tolerance" value={value.tolerance} cancelValue={value.tolerance} limits={{min:0,max:10}} onPreview={()=>{}} onCommit={tolerance=>onCommit(setCnc(cabinet,{tolerance}))} onCancel={onCancel}/><DimensionField plain label="Cutter diameter" value={value.bitDiameter} cancelValue={value.bitDiameter} limits={{min:1,max:20}} onPreview={()=>{}} onCommit={bitDiameter=>onCommit(setCnc(cabinet,{bitDiameter}))} onCancel={onCancel}/>
 <label className="construction-choice">Dogbone relief<span className="select select--fluid"><select aria-label="Dogbone relief" value={String(value.dogbones)} onChange={e=>onCommit(setCnc(cabinet,{dogbones:e.target.value==='true'}))}><option value="false">Off</option><option value="true">On · use cutter diameter</option></select><Icon name="chevron" size={12}/></span></label>
 <label className="construction-choice spaced-choice">Opposed pilot bores<span className="select select--fluid"><select aria-label="Opposed pilot bores" value={String(value.throughOpposed)} onChange={e=>onCommit(setCnc(cabinet,{throughOpposed:e.target.value==='true'}))}><option value="true">Through when needed</option><option value="false">Keep blind</option></select><Icon name="chevron" size={12}/></span></label>
 <p className="field-note">Tolerance is total clearance in wooden connection cuts. Fitting drill sizes stay fixed.</p></Section>;
}
