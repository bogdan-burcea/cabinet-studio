import type {Cabinet} from '../domain/cabinet';
import {setWallHanging} from '../commands/wall-hanging';
import {usesBlumWallHanger} from '../rules/wall-hanging';
import {Icon} from '../design-system/Icon';
import {DimensionField} from './DimensionField';
import {FieldPair,Section} from './components';

export function WallHangingInspector({cabinet,onCommit,onCancel}:{cabinet:Cabinet;onCommit(c:Cabinet):boolean;onCancel():void}){
 const active=usesBlumWallHanger(cabinet),installation=cabinet.installation,mounting=installation.mounting;
 return <Section title="Wall hanging">
  <label className="construction-choice">Hanger<span className="select select--fluid"><select value={active?'blum':'none'} onChange={e=>onCommit(setWallHanging(cabinet,e.target.value==='blum'))}><option value="none">None</option><option value="blum">Blum 48N0510 · screw-on pair</option></select><Icon name="chevron" size={12}/></span></label>
  {active?<><FieldPair><DimensionField plain label="Body above floor" value={mounting.floorClearance} cancelValue={mounting.floorClearance} limits={{min:50,max:2000}} onPreview={()=>{}} onCommit={floorClearance=>onCommit({...cabinet,installation:{...installation,mounting:{...mounting,floorClearance}}})} onCancel={onCancel}/></FieldPair>
   <p className="field-note">48N0510.03 left · 48N0510.02 right.</p></>:<p className="field-note">Selecting the hanger seats the back in a groove and releases floor support.</p>}
 </Section>;
}
