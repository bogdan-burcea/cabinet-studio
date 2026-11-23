import {Icon} from '../design-system/Icon';
export function DrawerTypeField({internal,onChange}:{internal:boolean;onChange(value:boolean):void}){
 return <label className="construction-choice">Drawer type<span className="select select--fluid"><select aria-label="Drawer type" value={internal?'internal':'external'} onChange={e=>onChange(e.target.value==='internal')}><option value="external">External drawer</option><option value="internal">Internal drawer · pantry</option></select><Icon name="chevron" size={12}/></span></label>;
}
