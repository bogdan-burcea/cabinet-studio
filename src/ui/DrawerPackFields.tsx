import {drawerPacks,drawerPack,drawerLengths} from '../catalogue/drawers';
import type {ProductPin} from '../domain/cabinet';
import {FieldPair} from './components';
import {Icon} from '../design-system/Icon';

export function DrawerPackFields({value,onChange,automatic=false}:{value:ProductPin;automatic?:boolean;onChange(pin:ProductPin,manual?:boolean):void}){
 const pack=drawerPack(value),height=pack.sideHeight>100?'K':'M';
 const change=(h:string,length:number,manual?:boolean)=>{
  const selected=drawerPacks.find(p=>(p.sideHeight>100?'K':'M')===h&&p.nominalLength===length)!;
  onChange({id:selected.id,revision:selected.revision},manual);
 };
 return <FieldPair>
  <label className="construction-choice">Side height<span className="select select--fluid"><select aria-label="Drawer side height" value={height} onChange={e=>change(e.target.value,pack.nominalLength)}><option value="M">M · 83.6 mm</option><option value="K">K · 115.6 mm</option></select><Icon name="chevron" size={12}/></span></label>
  <label className="construction-choice">Rail length (mm)<span className="select select--fluid"><select aria-label="Drawer rail length" value={automatic?'auto':pack.nominalLength} onChange={e=>e.target.value==='auto'?onChange(value,false):change(height,Number(e.target.value),true)}><option value="auto">Auto{automatic?` · ${pack.nominalLength}`:''}</option>{drawerLengths.map(length=><option key={length} value={length}>{length} mm</option>)}</select><Icon name="chevron" size={12}/></span></label>
 </FieldPair>;
}
