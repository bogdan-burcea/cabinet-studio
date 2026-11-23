import {chooseDrawerPack,drawerPack,drawerPacks,type DrawerConfiguration} from '../catalogue/drawers';
import type {ProductPin} from '../domain/cabinet';
import {FieldPair} from './components';
import {Icon} from '../design-system/Icon';

export function DrawerPackFields({value,onChange,automatic=false,internal=false}:{value:ProductPin;automatic?:boolean;internal?:boolean;onChange(pin:ProductPin,manual?:boolean):void}){
 const pack=drawerPack(value),merivo=pack.family==='merivobox';
 const change=(patch:Parameters<typeof chooseDrawerPack>[1],manual?:boolean)=>onChange(chooseDrawerPack(value,patch),manual);
 const lengths=[...new Set(drawerPacks.filter(p=>p.family===pack.family&&p.configuration===pack.configuration&&(!merivo||p.manufacturerDynamicLoadKg===pack.manufacturerDynamicLoadKg)).map(p=>p.nominalLength))].sort((a,b)=>a-b);
 const select=(label:string,accessible:string,value:string|number,change:(value:string)=>void,options:{value:string|number;label:string}[])=><label className="construction-choice">{label}<span className="select select--fluid"><select aria-label={accessible} value={value} onChange={e=>change(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select><Icon name="chevron" size={12}/></span></label>;
 return <>
  <FieldPair>{select('Drawer system','Drawer system',pack.family,family=>change({family:family as 'antaro'|'merivobox'}),[{value:'antaro',label:'TANDEMBOX ANTARO'},{value:'merivobox',label:'MERIVOBOX'}])}
   {merivo&&select('Load class','Drawer load class',pack.manufacturerDynamicLoadKg,load=>change({load:Number(load)}),[{value:40,label:'40 kg'},{value:70,label:'70 kg'}])}</FieldPair>
  <FieldPair>{select(merivo?'Construction':'Side height','Drawer side height',pack.configuration,configuration=>change({configuration:configuration as DrawerConfiguration}),merivo?[{value:'m',label:'M · 91 mm'},{value:'e-gallery',label:'E · gallery · 192 mm'},{value:'e-closed',label:'E · closed BOXCAP · 192 mm'}]:[{value:'m',label:'M · 83.6 mm'},...internal?[]:[{value:'k',label:'K · 115.6 mm'}]])}
   {select('Rail length (mm)','Drawer rail length',automatic?'auto':pack.nominalLength,length=>length==='auto'?onChange(value,false):change({length:Number(length)},true),[{value:'auto',label:`Auto${automatic?' · '+pack.nominalLength:''}`},...lengths.map(n=>({value:n,label:`${n} mm`}))])}</FieldPair>
 </>;
}
