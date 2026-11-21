import {useEffect,useState} from 'react';
import type {Cabinet} from '../domain/cabinet';
import type {FlatPart} from '../cnc/parts';
import {defaultLabelStock,labelGrid,type LabelStock} from '../docs/pdf';
import type {LabelMap} from '../docs/label-job';
import {Button,Section} from './components';
const key='cabinet-studio.label-stock.v1';
export function PartLabelsPanel({cabinet,parts,map,onNotice}:{cabinet:Cabinet;parts:FlatPart[];map:LabelMap;onNotice(s:string,error?:boolean):void}){
 const [stock,setStock]=useState<LabelStock>(()=>{try{const s=JSON.parse(localStorage.getItem(key)??'null');if(s){const a4={...s,pageWidth:210,pageHeight:297};labelGrid(a4);return a4;}}catch{}return {...defaultLabelStock,width:64,height:34,margin:6.5,top:12.5,gapX:2.5,gapY:0,start:0};});
 const [app,setApp]=useState(()=>location.href.split('#')[0]),[busy,setBusy]=useState(false);
 let grid;let error='';try{grid=labelGrid(stock);}catch(e){error=(e as Error).message;}
 useEffect(()=>{if(!error)try{localStorage.setItem(key,JSON.stringify(stock));}catch{}},[stock,error]);
 function field(label:string,name:keyof LabelStock,value:number){return <label key={name}>{label}<span className="textbox"><input className="textbox__control" type="number" min="0" step={name==='start'?1:.5} aria-label={label} value={value} onChange={e=>setStock(s=>({...s,[name]:Number(e.target.value)}))}/></span></label>;}
 async function generate(calibration=false){setBusy(true);try{const {partLabels}=await import('../docs/pdf');partLabels(cabinet,parts,stock,app,calibration,map).save(calibration?'label-calibration.pdf':'part-labels.pdf');onNotice(calibration?'Calibration sheet exported. Print at 100%.':'Part labels exported. Print at 100%.');}catch(e){onNotice((e as Error).message,true);}finally{setBusy(false);}}
 return <div className="label-settings">
 <Section title="Label stock"><p className="field-note">A4 · 210 × 297 mm</p><div className="label-fields">
 {field('Label width','width',stock.width)}{field('Label height','height',stock.height)}
 {field('Left margin','margin',stock.margin)}{field('Top margin','top',stock.top??stock.margin)}
 {field('Horizontal gap','gapX',stock.gapX??stock.gap)}{field('Vertical gap','gapY',stock.gapY??stock.gap)}
 {field('Skip used labels','start',stock.start??0)}
 </div>{error?<p className="field__description field__description--attention" role="alert">{error}</p>:<p className="field-note">{grid!.columns} columns × {grid!.rows} rows · Label pages: {Math.ceil((parts.length+(stock.start??0))/(grid!.columns*grid!.rows))}</p>}</Section>
 <Section title="Parts"><p className="field-note">All {map.assembly.length} cut parts and {parts.length-map.assembly.length} reusable offcuts are included, followed by numbered sheet maps.</p></Section>
 <Section title="QR links">
 <label className="label-app-address">App address<span className="textbox"><input className="textbox__control" type="url" value={app} onChange={e=>setApp(e.target.value)}/></span></label><p className="field-note">Use an address your phone can reach. Open the matching cabinet file to select the linked part. Print in black and white at 100%.</p></Section>
 <div className="label-actions"><Button disabled={busy||!!error} onClick={()=>void generate(true)}>Calibration sheet</Button><Button disabled={busy||!!error||!parts.length} onClick={()=>void generate()}>{busy?'Exporting…':'Export labels'}</Button></div>
 </div>;
}
