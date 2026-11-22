import {validPrice,validHours,type CostPreferences,type CostLine} from './estimate';
export const priceBookKey='cabinet-studio.cost-prices.v1';
export const estimateKey=(id:string)=>'cabinet-studio.cost-estimate.v1/'+id;
export function decodeCostPreferences(text:string|null,fallback:CostPreferences={version:1,prices:{},labourHours:0}):CostPreferences{
 try{
  const data=JSON.parse(text??'null');if(data?.version!==1)return {...fallback,prices:{...fallback.prices}};
  const prices=Object.fromEntries(Object.entries(data.prices??{}).filter(([id,value])=>(id.startsWith('stock/')||id.startsWith('hardware/'))&&id.length<=1024&&validPrice(value))) as Record<string,number>;
  const meta=data.catalogue;const catalogue=meta&&typeof meta==='object'?{tags:Object.fromEntries(Object.entries(meta.tags??{}).filter(([id,v])=>id.length<=1024&&typeof v==='string'&&v.length<=60)) as Record<string,string>,stock:Object.fromEntries(Object.entries(meta.stock??{}).filter(([id,v]:[string,any])=>/^stock\/reference\/\d+(?:\.\d+)?$/.test(id)&&v&&[v.width,v.height].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=100&&n<=10000))) as Record<string,{width:number;height:number}>}:{tags:{},stock:{}};
  for(const [id,amount] of Object.entries(prices)){const m=id.match(/^stock\/catalogue\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);if(!m)continue;const ref=`stock/reference/${m[1]}`;if(prices[ref]===undefined){prices[ref]=amount;catalogue.stock[ref]={width:+m[2],height:+m[3]};}}
  return {version:1,prices,...Object.keys(catalogue.tags).length||Object.keys(catalogue.stock).length?{catalogue}:{},labourHours:validHours(data.labourHours)?data.labourHours:fallback.labourHours,
   ...(typeof data.deductOffcuts==='boolean'?{deductOffcuts:data.deductOffcuts}:{}),
   ...(data.stockBasis==='sheet'||data.stockBasis==='area'?{stockBasis:data.stockBasis}:{}),
   ...(validPrice(data.profitPercent)&&data.profitPercent<=1000?{profitPercent:data.profitPercent}:{}),
   ...(validPrice(data.labourRate)?{labourRate:data.labourRate}:{})};
 }catch{return {...fallback,prices:{...fallback.prices}};}
}

/** Retire the catalogue without losing the current estimate's entered amounts.
 * Materialize a legacy reference price once; later sheet sizes use manual prices. */
export function manualCostPreferences(lines:CostLine[],prefs:CostPreferences):CostPreferences{
 const {catalogue,...plain}=prefs,prices={...prefs.prices};
 for(const line of lines){
  if(prices[line.id]!==undefined||line.unit!=='sheet')continue;
  const t=line.label.match(/^(\d+(?:\.\d+)?) mm/),size=line.id.match(/\/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);if(!t||!size)continue;
  const ref=`stock/reference/${t[1]}`,sheet=catalogue?.stock[ref]??{width:2440,height:1220},amount=prices[ref],exact=prices[`stock/catalogue/${t[1]}/${size[1]}x${size[2]}`];
  const value=amount===undefined?exact:amount*(line.sheetArea??+size[1]*+size[2]/1e6)/(sheet.width*sheet.height/1e6);
  if(value!==undefined&&validPrice(+value.toFixed(6)))prices[line.id]=+value.toFixed(6);
 }
 for(const id of Object.keys(prices))if(id.startsWith('stock/reference/')||id.startsWith('stock/catalogue/'))delete prices[id];
 return {...plain,prices};
}
