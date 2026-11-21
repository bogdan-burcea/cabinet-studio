import {validPrice,validHours,type CostPreferences} from './estimate';
export const priceBookKey='cabinet-studio.cost-prices.v1';
export const estimateKey=(id:string)=>'cabinet-studio.cost-estimate.v1/'+id;
export function decodeCostPreferences(text:string|null,fallback:CostPreferences={version:1,prices:{},labourHours:0}):CostPreferences{
 try{
  const data=JSON.parse(text??'null');if(data?.version!==1)return {...fallback,prices:{...fallback.prices}};
  const prices=Object.fromEntries(Object.entries(data.prices??{}).filter(([id,value])=>(id.startsWith('stock/')||id.startsWith('hardware/'))&&id.length<=1024&&validPrice(value))) as Record<string,number>;
  return {version:1,prices,labourHours:validHours(data.labourHours)?data.labourHours:fallback.labourHours,
   ...(typeof data.deductOffcuts==='boolean'?{deductOffcuts:data.deductOffcuts}:{}),
   ...(data.stockBasis==='sheet'||data.stockBasis==='area'?{stockBasis:data.stockBasis}:{}),
   ...(validPrice(data.profitPercent)&&data.profitPercent<=1000?{profitPercent:data.profitPercent}:{}),
   ...(validPrice(data.labourRate)?{labourRate:data.labourRate}:{})};
 }catch{return {...fallback,prices:{...fallback.prices}};}
}
