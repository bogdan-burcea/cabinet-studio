import {validStock,type StockSheet} from './nesting';
export function sheetSelection(current:string[],id:string,additive:boolean,validIds:readonly string[],defaultId?:string){
 if(!additive||!validIds.includes(id))return [id];
 const initial=current.length?current:defaultId?[defaultId]:[];
 const sheets=initial.filter(value=>validIds.includes(value));
 return sheets.includes(id)?sheets.filter(value=>value!==id):[...sheets,id];
}
/** Validate the whole shared edit before emitting any settings updates. */
export function sharedStockEdits(groups:readonly {key:string;options:StockSheet}[],patch:Partial<StockSheet>,allowance:number){
 const edits=[...new Map(groups.map(group=>[group.key,{...group.options,...patch}])).entries()];
 if(edits.some(([,stock])=>!validStock({...stock,gap:stock.gap+allowance})))throw Error('Check the edge margins and part gap for every selected stock type.');
 return edits;
}
