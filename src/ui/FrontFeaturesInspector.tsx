import type {Cabinet} from '../domain/cabinet';
import {frontTargets,editFrontFeatures} from '../commands/front-features';
import {defaultDrawerHandle} from '../rules/handles';
import {HandleFields} from './HandleFields';
import {Section,FieldPair} from './components';
import {DimensionField} from './DimensionField';
import {Icon} from '../design-system/Icon';
export function FrontFeaturesInspector({cabinet,ids,commit,scope=false}:{cabinet:Cabinet;ids:string[];commit(c:Cabinet):boolean;scope?:boolean}){
 const targets=frontTargets(cabinet,ids),door=cabinet.fronts.find(d=>targets.includes(d.id)),drawer=cabinet.drawers?.find(d=>targets.includes(d.id));
 if(!targets.length)return null;
 const gap=scope?cabinet.frontDefaults?.edgeGap??2:door?.reveal??drawer?.front?.gap??2,clearance=scope?cabinet.frontDefaults?.frontGap??2:door?.clearance??drawer?.front?.clearance??2,radius=scope?cabinet.frontDefaults?.cornerRadius??0:door?.cornerRadius??drawer?.cornerRadius??0;
 const edit=(patch:Parameters<typeof editFrontFeatures>[2])=>commit(editFrontFeatures(cabinet,targets,patch,scope));
 const field=(label:string,key:'edgeGap'|'frontGap'|'cornerRadius',value:number,max:number)=><DimensionField plain label={label} value={value} cancelValue={value} step={.1} limits={{min:key==='edgeGap'||key==='frontGap'?1:0,max}} onPreview={()=>{}} onCommit={n=>edit({[key]:n})} onCancel={()=>{}}/>;
 return <><Section title={scope?'Front layout':'Shared front features'}>
  <p className="field-note">{scope?'Cabinet-wide defaults, applied to every existing front and new fronts.':'Changes apply to the selected door and drawer fronts.'}</p>
  <FieldPair>{field('Edge clearance','edgeGap',gap,10)}{field('Front stand-off','frontGap',clearance,10)}</FieldPair>
  <p className="field-note">Edge clearance leaves room at the frame. Front stand-off sets the distance from the cabinet face. Adjacent drawer fronts each reserve their edge clearance.</p>
  <FieldPair>{field('Corner radius','cornerRadius',radius,500)}</FieldPair>
  <label className="construction-choice">Front fit<span className="select select--fluid"><select aria-label="Shared front fit" value={door?.placement??drawer?.front?.placement??'overlay'} onChange={e=>edit({placement:e.target.value as 'inset'|'overlay'})}><option value="overlay">Overlay · cover frame</option><option value="inset">Inset · inside frame</option></select><Icon name="chevron" size={12}/></span></label>
 </Section><HandleFields handle={door?.handle??drawer?.handle??defaultDrawerHandle()} drawer={!door} onCancel={()=>{}} onChange={handle=>edit({handle})}/></>;
}
