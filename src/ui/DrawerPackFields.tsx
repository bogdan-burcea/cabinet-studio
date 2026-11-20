import {drawerPacks,drawerPack,drawerLengths} from '../catalogue/drawers';
import type {ProductPin} from '../domain/cabinet';
import {FieldPair} from './components';
import {Icon} from '../design-system/Icon';

export function DrawerPackFields({value,onChange,automatic=false}:{value:ProductPin;automatic?:boolean;onChange(pin:ProductPin):void}){
 const pack=drawerPack(value),height=pack.sideHeight>100?'K':'M';
 const change=(h:string,length:number)=>{
  const selected=drawerPacks.find(p=>(p.sideHeight>100?'K':'M')===h&&p.nominalLength===length)!;
  onChange({id:selected.id,revision:selected.revision});
 };
 return <FieldPair>
  <label className="construction-choice">Side height<span className="select select--fluid"><select aria-label="Drawer side height" value={height} onChange={e=>change(e.target.value,pack.nominalLength)}><option value="M">M · 83.6 mm</option><option value="K">K · 115.6 mm</option></select><Icon name="chevron" size={12}/></span></label>
  <label className="construction-choice">Rail length{automatic?' · auto':''}<span className="select select--fluid"><select disabled={automatic} aria-label="Drawer rail length" value={pack.nominalLength} onChange={e=>change(height,Number(e.target.value))}>{drawerLengths.map(length=><option key={length} value={length}>{length} mm</option>)}</select><Icon name="chevron" size={12}/></span></label>
 </FieldPair>;
}
