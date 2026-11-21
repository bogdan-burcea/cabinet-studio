import {pilotDiameter} from '../catalogue/pilots';
import {standardisePilotHoles} from '../commands/pilots';
import type {Cabinet} from '../domain/cabinet';
import {cnc} from '../rules/cnc';
import {setCnc} from '../commands/cnc';
import {Section,FieldPair,Button} from './components';
import {DimensionField} from './DimensionField';
import {Icon} from '../design-system/Icon';
export function CncInspector({cabinet,onCommit,onCancel}:{cabinet:Cabinet;onCommit(c:Cabinet):boolean;onCancel():void}){
 const value=cnc(cabinet);
 return <Section title="Machining"><FieldPair><DimensionField plain label="Fit allowance" accessibleLabel="Joint fit allowance" step={0.1} value={value.tolerance} cancelValue={value.tolerance} limits={{min:0,max:10}} onPreview={()=>{}} onCommit={tolerance=>onCommit(setCnc(cabinet,{tolerance}))} onCancel={onCancel}/><DimensionField plain label="Cutter Ø" accessibleLabel="Cutter diameter" value={value.bitDiameter} cancelValue={value.bitDiameter} limits={{min:1,max:20}} onPreview={()=>{}} onCommit={bitDiameter=>onCommit(setCnc(cabinet,{bitDiameter}))} onCancel={onCancel}/></FieldPair>
 <label className="construction-choice">Dogbone relief<span className="select select--fluid"><select aria-label="Dogbone relief" value={String(value.dogbones)} onChange={e=>onCommit(setCnc(cabinet,{dogbones:e.target.value==='true'}))}><option value="false">Off</option><option value="true">On · use cutter diameter</option></select><Icon name="chevron" size={12}/></span></label>
 <label className="construction-choice spaced-choice">Opposed pilot bores<span className="select select--fluid"><select aria-label="Opposed pilot bores" value={String(value.throughOpposed)} onChange={e=>onCommit(setCnc(cabinet,{throughOpposed:e.target.value==='true'}))}><option value="true">Through when needed</option><option value="false">Keep blind</option></select><Icon name="chevron" size={12}/></span></label>
 <FieldPair><DimensionField plain label="Pilot Ø" accessibleLabel="Wood pilot diameter" step={.1} value={pilotDiameter(cabinet)} cancelValue={pilotDiameter(cabinet)} limits={{min:.5,max:6}} onPreview={()=>{}} onCommit={n=>onCommit(standardisePilotHoles(cabinet,n))} onCancel={onCancel}/></FieldPair>
 <p className="field-note">Sets generic wood-screw pilots together. Manufacturer fitting bores stay unchanged. Thin-stock limits still apply to back pilots.</p>
 <p className="field-note">Total clearance between mating parts, split across opposing cut edges. Default 0.2 mm. Cutter size and fitting drill sizes stay independent.</p></Section>;
}
