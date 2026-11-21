import type {Cabinet} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {stockOffcuts,type planSheets} from '../cnc/layout';
import {billOfMaterials} from '../docs/project';
import {drawerPack} from '../catalogue/drawers';
export type CostLine={id:string;label:string;detail?:string;quantity:number;unit:string;sheetArea?:number;offcutArea?:number;paired?:boolean};
export type StockBasis='sheet'|'area';
export type CostPreferences={version:1;prices:Record<string,number>;labourHours:number;labourRate?:number;profitPercent?:number;deductOffcuts?:boolean;stockBasis?:StockBasis};
export const validPrice=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1_000_000&&Math.abs(n*1e6-Math.round(n*1e6))<1e-4;
export const validHours=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100_000&&Math.abs(n*100-Math.round(n*100))<1e-5;
export function parseCostInput(raw:string,hours=false):number|undefined{
 if(!raw.trim())return undefined;
 const normalized=raw.trim().replace(',','.');
 if(!/^(?:\d+(?:\.\d{0,6})?|\.\d{1,6})$/.test(normalized))throw Error('Enter a non-negative amount with up to six decimal places.');
 const n=Number(normalized);if(!(hours?validHours:validPrice)(n))throw Error(hours?'Hours must be between 0 and 100,000.':'Unit cost must be between 0 and 1,000,000 RON.');
 return n;
}
export function costQuantities(c:Cabinet,model:EvaluatedCabinet,plan:ReturnType<typeof planSheets>,basis:StockBasis='sheet'){
 const stock=new Map<string,CostLine>();
 if(basis==='area')for(const group of plan.groups){
  const part=group.entries[0],id=`stock/area/${group.key}`;
  // Workshop uses cut-panel rectangles, excluding sheet waste, not machined voids.
  const quantity=group.entries.reduce((sum,p)=>sum+p.width*p.height/1e6,0);
  stock.set(id,{id,label:`${part.thickness} mm panel`,detail:part.material,quantity,unit:'m²'});
 }else for(const sheet of plan.sheets){
  const id=`stock/${sheet.key}/${sheet.stock.width}x${sheet.stock.height}`;
  const existing=stock.get(id);if(existing){existing.quantity++;existing.offcutArea=(existing.offcutArea??0)+stockOffcuts(sheet,150,c.carcass.machining?.bitDiameter??6).reduce((n,r)=>n+r.width*r.height/1e6,0);}
  else stock.set(id,{id,label:`${sheet.thickness} mm sheet`,detail:`${sheet.stock.width} × ${sheet.stock.height} mm · ${sheet.material}`,quantity:1,unit:'sheet',sheetArea:sheet.stock.width*sheet.stock.height/1e6,offcutArea:stockOffcuts(sheet,150,c.carcass.machining?.bitDiameter??6).reduce((n,r)=>n+r.width*r.height/1e6,0)});
 }
 const bill=billOfMaterials(c,model,plan),hardware=new Map<string,CostLine>();
 const add=(id:string,label:string,quantity:number,unit='item',detail?:string,paired=false)=>{
  if(quantity<=0)return;const key=`hardware/${id}`;const old=hardware.get(key);if(old)old.quantity+=quantity;else hardware.set(key,{id:key,label,quantity,unit,detail,...paired?{paired:true}:{}});
 };
 for(const line of bill.hardware)add(line.id,line.label,line.count);
 // A matched pair/set is a single purchase unit, never two individual rails/sides.
 for(const d of model.drawers.drawers){
  const pack=drawerPack(d.intent.pack);
  for(const component of pack.components){const unit=component.unit.includes('pair')?'pair':component.unit.includes('set')?'set':'item';add(`blum/${component.article}/${unit}`,component.article,component.quantity,unit,component.description,component.unit.includes('left/right'));}
  if(d.intent.handle?.kind==='knob')add('Knob','Knob',1);
  if(d.intent.handle?.kind==='pull'){const label=`Pull handle · ${d.intent.handle.pitch} mm`;add(label,label,1);}
 }
 return {stock:[...stock.values()],hardware:[...hardware.values()],unplaced:plan.unplaced.length};
}
export function calculateEstimate(quantities:ReturnType<typeof costQuantities>,prefs:CostPreferences){
 if(prefs.profitPercent!==undefined&&(!validPrice(prefs.profitPercent)||prefs.profitPercent>1000))throw Error('Profit must be between 0 and 1,000%.');
 if(!validHours(prefs.labourHours)||prefs.labourRate!==undefined&&!validPrice(prefs.labourRate)||Object.values(prefs.prices).some(p=>!validPrice(p)))throw Error('Invalid estimate amounts.');
 const price=(line:CostLine)=>({...line,unitPrice:prefs.prices[line.id],cents:Math.round((prefs.prices[line.id]??0)*100*line.quantity)});
 const stock=quantities.stock.map(price),hardware=quantities.hardware.map(price);
 const stockCents=stock.reduce((n,r)=>n+r.cents,0),hardwareCents=hardware.reduce((n,r)=>n+r.cents,0);
 const labourCents=Math.round(Math.round((prefs.labourRate??0)*100)*Math.round(prefs.labourHours*100)/100);
 const offcutsCents=stock.reduce((n,r)=>n+Math.round((r.unitPrice??0)*100*(r.offcutArea??0)/(r.sheetArea??1)),0);
 const deductionCents=prefs.deductOffcuts?Math.min(stockCents,offcutsCents):0;
 const costsCents=stockCents+hardwareCents+labourCents-deductionCents,profitCents=Math.round(costsCents*(prefs.profitPercent??0)/100);
 return {stock,hardware,stockCents,hardwareCents,labourCents,offcutsCents,deductionCents,costsCents,profitCents,totalCents:costsCents+profitCents,
  missing:stock.concat(hardware).filter(r=>r.unitPrice===undefined).length+(prefs.labourHours>0&&prefs.labourRate===undefined?1:0),unplaced:quantities.unplaced};
}
export const formatRon=(cents:number)=>new Intl.NumberFormat('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
export function estimateCsv(estimate:ReturnType<typeof calculateEstimate>,prefs:CostPreferences){
 const rows:(string|number)[][]=[['Category','Item','Unit','Quantity','Unit cost (RON)','Subtotal (RON)']];
 for(const [category,lines,total] of [['Stock',estimate.stock,estimate.stockCents],['Hardware',estimate.hardware,estimate.hardwareCents]] as const){
  for(const r of lines)rows.push([category,r.label+(r.detail?` · ${r.detail}`:''),r.unit,+r.quantity.toFixed(6),r.unitPrice===undefined?'':+r.unitPrice.toFixed(6),(r.cents/100).toFixed(2)]);
  rows.push([category+' total','','','','',(total/100).toFixed(2)]);
 }
 rows.push(['Labour','Assembly','hour',prefs.labourHours,prefs.labourRate?.toFixed(2)??'',(estimate.labourCents/100).toFixed(2)],['Offcuts value','','','','',(estimate.offcutsCents/100).toFixed(2)],['Offcuts deduction','','','','',(-estimate.deductionCents/100).toFixed(2)],['Costs total','','','','',(estimate.costsCents/100).toFixed(2)],['Profit','% of costs','%',prefs.profitPercent??0,'',(estimate.profitCents/100).toFixed(2)],['Total (RON)','','','','',(estimate.totalCents/100).toFixed(2)]);

 if(estimate.missing||estimate.unplaced)rows.push(['Incomplete estimate',`${estimate.missing} missing prices; ${estimate.unplaced} unplaced parts`]);
 const quote=(v:string|number)=>'"'+String(v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
 return '\ufeff'+rows.map(row=>row.map(quote).join(',')).join('\r\n');
}
