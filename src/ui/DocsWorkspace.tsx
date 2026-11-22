import {useEffect,useMemo,useState} from 'react';
import {flattenParts} from '../cnc/parts';
import {planSheets,type SheetSettings} from '../cnc/layout';
import type {Cabinet} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {billOfMaterials} from '../docs/project';
import type {LabelStock} from '../docs/pdf';
import {SegmentedTabs} from './WorkspaceTabs';
import {Button,FieldPair,Section} from './components';

const docTabs=[{id:'downloads',label:'Downloads',controls:'docs-downloads'},{id:'cost',label:'Cost estimate',controls:'docs-cost'}] as const;
const defaults={pageWidth:210,pageHeight:297,width:80,height:48,margin:10,gap:4};
const labelFields=[['pageWidth','Page width'],['pageHeight','Page height'],['width','Label width'],['height','Label height'],['margin','Margin'],['gap','Gap']] as const;
const browserAddress=()=>new URL(location.pathname,location.origin).toString();
type Preferences={currency:string;prices:Record<string,string>;stock:LabelStock;address:string};
function readPreferences(key:string):Preferences {
 const fallback={currency:'RON',prices:{},stock:defaults,address:browserAddress()};
 try{
  const saved=JSON.parse(localStorage.getItem(key)??'{}');
  const stock={...defaults,...Object.fromEntries(Object.entries(saved.stock??{}).filter(([,n])=>typeof n==='number'))};
  return {...fallback,...saved,stock};
 }catch{return fallback;}
}
export function DocsWorkspace({active,cabinet,model,settings,allowance,onNotice}:{
 active:boolean;cabinet:Cabinet;model:EvaluatedCabinet;settings:SheetSettings;allowance:number;onNotice(s:string,error?:boolean):void;
}){
 const [view,setView]=useState<'downloads'|'cost'>('downloads');
 const key='cabinet-studio-docs/'+cabinet.id;
 const [prefs,setPrefs]=useState(()=>readPreferences(key)),[error,setError]=useState(''),[working,setWorking]=useState(false);
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(prefs));}catch{/* Session settings remain usable. */}},[key,prefs]);
 const parts=useMemo(()=>active?flattenParts(model):[],[active,model]);
 const plan=useMemo(()=>planSheets(parts,settings,allowance),[parts,settings,allowance]);
 const bill=useMemo(()=>billOfMaterials(cabinet,model,plan),[cabinet,model,plan]);
 const patch=(next:Partial<Preferences>)=>setPrefs(old=>({...old,...next}));
 const subtotal=(lines:{id:string;count:number}[])=>lines.reduce((n,line)=>n+line.count*(Number(prefs.prices[line.id])||0),0);
 const money=(n:number)=>`${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${prefs.currency.trim()||'RON'}`;
 const missing=[...bill.stock,...bill.hardware].filter(line=>!prefs.prices[line.id]?.trim()).length;
 function costs(lines:{id:string;label:string;count:number;size?:string}[]){
  return lines.length?<div className="table table--density-compact docs-table"><table aria-label={lines===bill.stock?'Stock costs':'Hardware costs'}><thead><tr><th scope="col">Item</th><th scope="col" className="table-cell--numeric">Qty</th><th scope="col" className="table-cell--numeric">Unit cost</th><th scope="col" className="table-cell--numeric">Subtotal</th></tr></thead><tbody>
   {lines.map(line=><tr key={line.id}><th scope="row">{line.label}{line.size&&<small>{line.size}</small>}</th><td className="table-cell--numeric">{line.count}</td><td className="table-cell--numeric">
    <input className="textbox__control" aria-label={`Unit cost for ${line.label}`} type="number" min="0" step=".01" placeholder="0.00"
     value={prefs.prices[line.id]??''} onChange={event=>{const value=event.target.value;if(Number(value)>=0&&Number.isFinite(Number(value)))setPrefs(old=>({...old,prices:{...old.prices,[line.id]:value}}));}}/>
   </td><td className="table-cell--numeric">{money(line.count*Number(prefs.prices[line.id]??0))}</td></tr>)}
  </tbody></table></div>:<p className="field-note">No items.</p>;
 }
 function stockField([id,label]:(typeof labelFields)[number]){
  return <label className="construction-choice" key={id}>{label}<span className="textbox">
   <input className="textbox__control" type="number" min="0" step=".5" value={Number.isNaN(prefs.stock[id])?'':prefs.stock[id]}
    onChange={event=>patch({stock:{...prefs.stock,[id]:event.target.value===''?NaN:Number(event.target.value)}})}/></span></label>;
 }
 async function download(){
  if(working)return;
  setWorking(true);setError('');
  try{
   const {partLabels}=await import('../docs/pdf');
   const stem=cabinet.name.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'cabinet';
   partLabels(cabinet,parts,prefs.stock).save(`${stem}-labels.pdf`);
   onNotice('Part labels downloaded.');
  }catch(cause){setError((cause as Error).message);}
  finally{setWorking(false);}
 }
 return <main className="docs-workspace" id="workspace-docs" role="tabpanel" aria-labelledby="workspace-tab-2" hidden={!active}>
  {active&&<div className="docs-content">
   <header><h1>Documents &amp; costs</h1><p>{cabinet.name}</p></header>
   <SegmentedTabs<'downloads'|'cost'> tabs={docTabs} value={view} onChange={setView} label="Documents" prefix="docs-tab" className="docs-tabs"/>
   <div id="docs-downloads" role="tabpanel" aria-labelledby="docs-tab-0" hidden={view!=='downloads'} className="docs-panel">
    <Section title="Part labels" aside={<span className="unit-badge">mm</span>}>
     <div className="docs-label-grid">
      {[0,2,4].map(i=><FieldPair key={i}>{stockField(labelFields[i])}{stockField(labelFields[i+1])}</FieldPair>)}
     </div>
     <p className="field-note">Print at 100% scale. Labels use numbered part references.</p>
     {error&&<p className="field-note" role="alert">{error}</p>}
     <div className="docs-actions"><Button disabled={working} onClick={download}>Download labels PDF</Button></div>
    </Section>
   </div>
   <div id="docs-cost" role="tabpanel" aria-labelledby="docs-tab-1" hidden={view!=='cost'} className="docs-panel">
    <Section title="Cost estimate" aside={<label className="construction-choice docs-currency">Currency<span className="textbox">
      <input className="textbox__control" value={prefs.currency} maxLength={8} onChange={e=>patch({currency:e.target.value.toUpperCase()})}/></span></label>}>
     <dl className="docs-summary">
      <div><dt>{missing||plan.unplaced.length?'Priced subtotal':'Estimated total'}</dt><dd>{money(subtotal(bill.stock)+subtotal(bill.hardware))}</dd></div>
      <div><dt>Stock</dt><dd>{money(subtotal(bill.stock))}</dd></div>
      <div><dt>Hardware</dt><dd>{money(subtotal(bill.hardware))}</dd></div>
     </dl>
     {!!missing&&<p className="field-note">{missing} {missing===1?'item has':'items have'} no unit cost.</p>}
     {!!plan.unplaced.length&&<p className="field-note">{plan.unplaced.length} unplaced parts are excluded from stock cost.</p>}
    </Section>
    <Section title="Stock sheets">{costs(bill.stock)}</Section>
    <Section title="Hardware">{costs(bill.hardware)}</Section>
   </div>
  </div>}
 </main>;
}
