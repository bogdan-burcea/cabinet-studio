import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import type {Cabinet} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {flattenParts} from '../cnc/parts';
import {planSheets,type SheetSettings} from '../cnc/layout';
import {PlacementHistory} from '../cnc/placement-history';
import {costQuantities,calculateEstimate,formatRon,parseCostInput,estimateCsv,type CostPreferences,type CostLine} from '../costs/estimate';
import {decodeCostPreferences,manualCostPreferences,estimateKey,priceBookKey} from '../costs/preferences';
import {UtilitiesTabs} from './UtilitiesTabs';
import {labelJob} from '../docs/label-job';
import {PartLabelsPanel} from './PartLabelsPanel';
import {Checkbox,Button,IconButton,Section,Notice} from './components';
const emptyHistory=new PlacementHistory();
function CostInput({label,value,onChange,onNotice,hours=false}:{label:string;value?:number;hours?:boolean;onChange(n:number|undefined):void;onNotice(s:string,error?:boolean):void}){
 const [draft,setDraft]=useState(value===undefined?'':String(value)),editing=useRef(false),cancelled=useRef(false);
 useEffect(()=>{if(!editing.current)setDraft(value===undefined?'':String(value));},[value]);
 function commit(){editing.current=false;if(cancelled.current){cancelled.current=false;return;}
  try{const n=parseCostInput(draft,hours);onChange(n);setDraft(n===undefined?'':String(n));}
  catch(error){setDraft(value===undefined?'':String(value));onNotice(`${label}: ${(error as Error).message}`,true);}
 }
 return <span className="textbox cost-input"><input className="textbox__control" aria-label={label} inputMode="decimal" placeholder="0.00" value={draft} onFocus={()=>{editing.current=true;}} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancelled.current=true;setDraft(value===undefined?'':String(value));e.currentTarget.blur();}}}/></span>;
}
export function CostPanel({cabinet,model,settings,history,onClose,onNotice,onReview}:{cabinet:Cabinet;model:EvaluatedCabinet;settings:SheetSettings;history:PlacementHistory|null;onClose():void;onNotice(s:string,error?:boolean):void;onReview():void}){
 const choices=useSyncExternalStore((history??emptyHistory).subscribe,(history??emptyHistory).getSnapshot).choices;
 const parts=useMemo(()=>flattenParts(model),[model]);
 const plan=useMemo(()=>{try{return planSheets(parts,settings,cabinet.carcass.machining?.tolerance??.2,choices);}catch{return planSheets(parts,settings,cabinet.carcass.machining?.tolerance??.2);}},[parts,settings,choices,cabinet.carcass.machining?.tolerance]);
 const quantities=useMemo(()=>costQuantities(cabinet,model,plan,'sheet'),[cabinet,model,plan]);
 const [prefs,setPrefs]=useState<CostPreferences>(()=>{try{const defaults=decodeCostPreferences(localStorage.getItem(priceBookKey)),saved=decodeCostPreferences(localStorage.getItem(estimateKey(cabinet.id)),defaults);if(defaults.catalogue||Object.keys(defaults.prices).some(id=>id.startsWith('stock/reference/')||id.startsWith('stock/catalogue/')))localStorage.setItem(priceBookKey,JSON.stringify(manualCostPreferences([...quantities.stock,...quantities.hardware],defaults)));return {...manualCostPreferences([...quantities.stock,...quantities.hardware],{...saved,prices:{...defaults.prices,...saved.prices},catalogue:saved.catalogue??defaults.catalogue}),stockBasis:'sheet'};}catch{return {version:1,prices:{},labourHours:0};}});

 const [tab,setTab]=useState<'costs'|'labels'>('costs');

 const labels=useMemo(()=>labelJob(parts,plan,cabinet.carcass.machining?.bitDiameter??6),[parts,plan,cabinet.carcass.machining?.bitDiameter]);
 const estimate=useMemo(()=>calculateEstimate(quantities,prefs),[quantities,prefs]);
 const content=useRef<HTMLDivElement>(null);
 useEffect(()=>{content.current?.scrollTo({top:0});},[tab]);
 const dialog=useRef<HTMLDialogElement>(null),warned=useRef(false);
 const [feedback,setFeedback]=useState<{message:string;error:boolean}|null>(null);
 const costNotice=(message:string,error=false)=>setFeedback({message,error});
 const profitPercent=prefs.profitPercent??0,profitCents=estimate.profitCents,sellingTotal=estimate.totalCents;
 useEffect(()=>{dialog.current?.showModal();},[]);
 useEffect(()=>{try{localStorage.setItem(estimateKey(cabinet.id),JSON.stringify(prefs));}catch{if(!warned.current){warned.current=true;onNotice('Prices are held for this session because browser storage is unavailable.',true);}}},[prefs,cabinet.id]);

 function price(id:string,n:number|undefined){setPrefs(old=>{const prices={...old.prices};if(n===undefined)delete prices[id];else prices[id]=n;return {...old,prices};});}
 const input=(label:string,value:number|undefined,change:(n:number|undefined)=>void,hours=false)=><CostInput label={label} value={value} onChange={change} hours={hours} onNotice={costNotice}/>;
 function fields(title:string,lines:(CostLine&{unitPrice?:number;cents:number})[],total:number){return <Section title={title}>
  <div className="table table--density-compact machining-table cost-table"><table aria-label={`${title} costs`}>
   <colgroup><col/><col style={{width:'12%'}}/><col style={{width:'22%'}}/><col style={{width:'22%'}}/></colgroup>
   <thead><tr><th scope="col">Item</th><th scope="col" className="table-cell--numeric">Qty</th><th scope="col" className="table-cell--numeric">Unit cost</th><th scope="col" className="table-cell--numeric">Subtotal</th></tr></thead>
   <tbody>{lines.map(line=>{const name=title==='Stock'?line.label:line.id.includes('blum/')?((line.detail?.includes('cabinet profiles')||line.detail?.includes('BLUMOTION runners'))?'Drawer slides':line.detail?.includes('sides')?'Drawer sides':'Drawer fixing'):line.label.includes('hinge ')?'Hinge':line.label.includes('mounting plate')?'Mounting plate':line.label.includes('Cabineo')||line.label.includes('Ixconnect')?'Fastener':line.label.includes('Pull handle')||line.label==='Knob'?'Handle':line.label;const detail=title==='Stock'?line.detail?.split(' · ')[0]:[line.label,line.detail].filter(Boolean).join(' · ');return <tr key={line.id}><th scope="row">{name}{detail&&detail!==name&&<small className="cost-item-detail">{detail}{line.unit==='pair'?' · pair':line.unit==='set'?' · set':''}</small>}</th><td className="table-cell--numeric">{line.unit==='m²'?+line.quantity.toFixed(4):line.quantity}</td><td className="table-cell--numeric">{input(`${line.label} unit cost`,line.unitPrice,n=>price(line.id,n))}</td><td className="table-cell--numeric">{line.unitPrice===undefined?'—':formatRon(line.cents)}</td></tr>;})}</tbody>
   <tfoot><tr><th scope="row" colSpan={3}>{title} total</th><td className="table-cell--numeric"><strong>{formatRon(total)}</strong></td></tr></tfoot>
  </table></div>
 </Section>;}
 function save(){try{localStorage.setItem(priceBookKey,JSON.stringify({version:1,prices:prefs.prices,labourRate:prefs.labourRate,stockBasis:'sheet',profitPercent:prefs.profitPercent}));costNotice('Prices saved for new estimates on this device.');}catch{costNotice('Prices could not be saved on this device.',true);}}
 function download(){const url=URL.createObjectURL(new Blob([estimateCsv(estimate,prefs)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=(cabinet.name.replace(/[^a-z0-9.-]+/gi,'-')||'cabinet')+'-estimate-RON.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);costNotice('Estimate exported as CSV.');}
 return <dialog ref={dialog} className="lightbox-dialog cost-dialog" id="cost-estimate" aria-labelledby="cost-title" onCancel={e=>{e.preventDefault();onClose();}}>
  <div className="lightbox-dialog__window">
  <div className="lightbox-dialog__header cost-title"><h2 id="cost-title">Utilities</h2><IconButton icon="close" label="Close utilities" onClick={onClose}/></div>
  <UtilitiesTabs value={tab} onChange={setTab}/>
  <div className="lightbox-dialog__main cost-fields" ref={content}>
  <div role="tabpanel" id="utility-panel-costs" aria-labelledby="utility-tab-costs" hidden={tab!=='costs'}>
  {fields('Stock',estimate.stock,estimate.stockCents)}{fields('Hardware',estimate.hardware,estimate.hardwareCents)}
   <Section title="Labour"><div className="table table--density-compact machining-table cost-table"><table aria-label="Labour costs"><colgroup><col/><col style={{width:'22%'}}/><col style={{width:'22%'}}/><col style={{width:'22%'}}/></colgroup>
    <thead><tr><th scope="col">Work</th><th scope="col" className="table-cell--numeric">Hours</th><th scope="col" className="table-cell--numeric">Hourly rate</th><th scope="col" className="table-cell--numeric">Subtotal</th></tr></thead>
    <tbody><tr><th scope="row">Assembly</th><td className="table-cell--numeric">{input('Labour hours',prefs.labourHours,n=>setPrefs(old=>({...old,labourHours:n??0})),true)}</td><td className="table-cell--numeric">{input('Labour rate per hour',prefs.labourRate,n=>setPrefs(old=>({...old,labourRate:n})))}</td><td className="table-cell--numeric">{formatRon(estimate.labourCents)}</td></tr><tr><th scope="row" colSpan={2}>Profit <span>% of costs</span></th><td className="table-cell--numeric">{input('Profit percent of costs',profitPercent,n=>{if((n??0)>1000){throw Error('Profit must be between 0 and 1,000%.');}setPrefs(old=>({...old,profitPercent:n??0}));})}</td><td className="table-cell--numeric">{formatRon(profitCents)}</td></tr></tbody>

   </table></div></Section>
  <section className="inspector-section cost-breakdown" aria-label="Estimate summary"><div className="cost-summary-heading"><h3 className="medium-text">Estimate{estimate.missing>0&&<span className="unit-badge" role="status"> · partial</span>}</h3></div>
   <div className="table table--density-compact cost-table estimate-table"><table aria-label="Estimate summary"><thead><tr><th scope="col">Category</th><th className="table-cell--numeric" scope="col">Value</th></tr></thead><tbody>{([['Stock',estimate.stockCents],['Hardware',estimate.hardwareCents],['Labour',estimate.labourCents],['Profit',estimate.profitCents]] as const).map(([label,cents])=><tr key={label}><th scope="row">{label}</th><td className="table-cell--numeric">{formatRon(cents)}</td></tr>)}<tr><th scope="row">Offcuts value</th><td className="table-cell--numeric">{formatRon(estimate.offcutsCents)}</td></tr></tbody></table></div>
   <Checkbox className="offcut-deduction" checked={prefs.deductOffcuts??false} onChange={e=>setPrefs(old=>({...old,deductOffcuts:e.target.checked}))}>Deduct offcuts from costs</Checkbox><p className="field-note">Reusable rectangles at least 150 × 150 mm, valued at the sheet area rate. Deducted before profit.</p>


   {estimate.unplaced>0&&(prefs.stockBasis??'sheet')==='sheet'&&<p className="field-note">{estimate.unplaced} unplaced {estimate.unplaced===1?'part is':'parts are'} excluded from stock cost. <button type="button" className="fake-link" onClick={onReview}>Review in Cut</button></p>}
  </section>
  </div>
  <div role="tabpanel" id="utility-panel-labels" aria-labelledby="utility-tab-labels" hidden={tab!=='labels'}><PartLabelsPanel cabinet={cabinet} parts={labels.parts} map={labels.map} onNotice={costNotice}/></div>
  </div>
  {tab==='costs'&&<section className="inspector-section cost-total" aria-label="Estimate total">
   <div className="cost-grand-total"><span>Total</span><strong aria-live="polite" aria-atomic="true">{formatRon(sellingTotal)} <small>RON</small></strong></div>
   <div className="interior-actions"><Button onClick={save} title="Save unit prices, pricing basis, profit and hourly rate as defaults for new estimates on this device.">Save defaults</Button><Button onClick={download}>Export estimate</Button></div>
  </section>}
  </div>
  {feedback&&<Notice message={feedback.message} error={feedback.error} onDismiss={()=>setFeedback(null)}/>}
 </dialog>;
}
