import type {FlatPart} from './parts';

export interface StockSheet { width: number; height: number; margin: number; gap: number; rotate: boolean }
export const defaultSheet: StockSheet = {width: 2440, height: 1220, margin: 10, gap: 8, rotate: true};

export type NestPart = Pick<FlatPart, 'id' | 'label' | 'width' | 'height' | 'grain'>;
export type Rect = {x: number; y: number; width: number; height: number};
export type Placement<P extends NestPart = FlatPart> = Rect & {part: P; rotated: boolean};
export type NestedSheet<P extends NestPart = FlatPart> = {placements: Placement<P>[]; utilization: number};
const epsilon = 1e-7;
const right = (r: Rect) => r.x + r.width;
const bottom = (r: Rect) => r.y + r.height;
const area = (r: Pick<Rect, 'width' | 'height'>) => r.width * r.height;
const contains = (a: Rect, b: Rect) => a.x <= b.x + epsilon && a.y <= b.y + epsilon &&
  right(a) + epsilon >= right(b) && bottom(a) + epsilon >= bottom(b);

export function validStock(stock: StockSheet) {
  return [stock.width, stock.height].every(n => Number.isFinite(n) && n >= 100 && n <= 10000) &&
    [stock.margin, stock.gap].every(n => Number.isFinite(n) && n >= 0) && stock.margin<=500 && stock.gap<=510 &&
    stock.width > stock.margin * 2 && stock.height > stock.margin * 2 && typeof stock.rotate === 'boolean';
}

// The maximum-free-rectangle split follows the Cabinet Workshop nesting approach.
function occupy(free: Rect[], used: Rect) {
  const remaining = free.flatMap(r => {
    if (used.x >= right(r) - epsilon || right(used) <= r.x + epsilon ||
        used.y >= bottom(r) - epsilon || bottom(used) <= r.y + epsilon) return [r];
    return [
      {...r, width: used.x - r.x},
      {...r, x: right(used), width: right(r) - right(used)},
      {...r, height: used.y - r.y},
      {...r, y: bottom(used), height: bottom(r) - bottom(used)},
    ].filter(box => box.width > epsilon && box.height > epsilon);
  });
  return remaining.filter((r, i) => !remaining.some((other, j) =>
    i !== j && contains(other, r) && (j < i || !contains(r, other))));
}

function findPlacement<P extends NestPart>(free: Rect[], part: P, stock: StockSheet, strategy: 'area' | 'short' | 'long', forcedTurns?:boolean[]) {
  // Stock grain runs along its width. Grain along the part's V axis needs a quarter turn.
  const turns = forcedTurns??(part.grain === 'v' ? [true] : part.grain === 'u' || !stock.rotate || part.width === part.height ? [false] : [false, true]);
  let choice: Placement<P> | undefined;
  let best = Infinity, tie = Infinity;
  for (const rotated of turns) {
    const width = rotated ? part.height : part.width, height = rotated ? part.width : part.height;
    for (const r of free) {
      const spareX = r.width - width - stock.gap, spareY = r.height - height - stock.gap;
      if (spareX < -epsilon || spareY < -epsilon) continue;
      const short = Math.min(spareX, spareY), long = Math.max(spareX, spareY);
      const score = strategy === 'area' ? area(r) - (width + stock.gap) * (height + stock.gap)
        : strategy === 'short' ? short : long;
      const secondary = strategy === 'long' ? short : long;
      if (score > best || (score === best && secondary >= tie)) continue;
      choice = {part, rotated, x: r.x, y: r.y, width, height};
      best = score;
      tie = secondary;
    }
  }
  return choice;
}

function pack<P extends NestPart>(parts: P[], stock: StockSheet, strategy: 'area' | 'short' | 'long') {
  const sheets: {free: Rect[]; placements: Placement<P>[]}[] = [];
  const unplaced: P[] = [];
  const empty = [{x: stock.margin, y: stock.margin, width: stock.width - 2 * stock.margin + stock.gap, height: stock.height - 2 * stock.margin + stock.gap}];
  for (const part of parts) {
    let sheet: typeof sheets[number] | undefined;
    let placed: Placement<P> | undefined;
    for (const candidate of sheets) {
      placed = findPlacement(candidate.free, part, stock, strategy);
      if (placed) { sheet = candidate; break; }
    }
    if (!sheet || !placed) {
      placed = findPlacement(empty, part, stock, strategy);
      if (!placed) { unplaced.push(part); continue; }
      sheet = {free: empty, placements: []};
      sheets.push(sheet);
    }
    sheet.placements.push(placed);
    sheet.free = occupy(sheet.free, {...placed, width: placed.width + stock.gap, height: placed.height + stock.gap});
  }
  return {
    unplaced,
    sheets: sheets.map(({placements}): NestedSheet<P> => ({
      placements, utilization: placements.reduce((sum, p) => sum + area(p), 0) / area(stock),
    })).sort((a,b)=>b.utilization-a.utilization),
    largestFree:Math.max(0,...sheets.flatMap(sheet=>sheet.free.map(r=>Math.max(0,r.width-stock.gap)*Math.max(0,r.height-stock.gap))))
  };
}

export function nestStock<P extends NestPart>(parts: readonly P[], stock: StockSheet) {
  if (!validStock(stock)) throw Error('Sheet margins must leave usable stock.');
  const long = (p:P)=>Math.max(p.width,p.height), short=(p:P)=>Math.min(p.width,p.height);
  const byLong = (a:P,b:P)=>long(b)-long(a)||area(b)-area(a)||a.id.localeCompare(b.id);
  const strategies=['short','area','long'] as const;
  const keys=[long,area,short,(p:P)=>p.width,(p:P)=>p.height,(p:P)=>long(p)+short(p)];
  const orders=keys.map(key=>[...parts].sort((a,b)=>key(b)-key(a)||byLong(a,b)));
  const tried=new Set<string>();
  let best=pack(orders[0],stock,'short');
  function consider(order:P[]){
    const key=JSON.stringify(order.map(p=>p.id));
    if(tried.has(key))return;
    tried.add(key);
    for(const strategy of strategies){
      const trial=pack(order,stock,strategy);
      if(trial.unplaced.length!==best.unplaced.length){
        if(trial.unplaced.length<best.unplaced.length)best=trial;
        continue;
      }
      if(trial.sheets.length!==best.sheets.length){
        if(trial.sheets.length<best.sheets.length)best=trial;
        continue;
      }
      const fill=trial.sheets.reduce((score,sheet,index)=>score+sheet.utilization*(trial.sheets.length-index),0);
      const previous=best.sheets.reduce((score,sheet,index)=>score+sheet.utilization*(best.sheets.length-index),0);
      if(fill>previous+epsilon||(Math.abs(fill-previous)<=epsilon&&trial.largestFree>best.largestFree+epsilon))best=trial;
    }
  }
  orders.forEach(consider);
  // A bounded search also tries leading with a different blank on small jobs.
  if(parts.length<=24)for(const part of orders[0]){
    consider([part,...orders[1].filter(p=>p!==part)]);
  }
  if(parts.length<=18){
    for(const first of orders[0])for(const second of orders[1]){
      if(first===second)continue;
      consider([first,second,...orders[1].filter(p=>p!==first&&p!==second)]);
    }
  }
  return {unplaced:best.unplaced,sheets:best.sheets};
}

export function reusableOffcuts(sheet:NestedSheet,stock:StockSheet,minimum:number,cutter:number):Rect[]{
  const clearance=Math.max(stock.gap,cutter);
  let free:Rect[]=[{x:stock.margin,y:stock.margin,width:stock.width-2*stock.margin,height:stock.height-2*stock.margin}];
  const reserve=(r:Rect)=>occupy(free,{x:r.x-clearance,y:r.y-clearance,width:r.width+2*clearance,height:r.height+2*clearance});
  for(const part of sheet.placements)free=reserve(part);
  const cuts:Rect[]=[];
  while(free.length){
    // Round inward so the stated stock size never exceeds the clear rectangle.
    const next=free.map(r=>({...r,width:Math.floor(r.width+epsilon),height:Math.floor(r.height+epsilon)}))
      .filter(r=>r.width>=minimum&&r.height>=minimum)
      .sort((a,b)=>area(b)-area(a)||a.y-b.y||a.x-b.x)[0];
    if(!next)break;
    cuts.push(next);
    free=reserve(next);
  }
  return cuts;
}

export type NestOverride={sheet?:number;rotated?:boolean};
/** Explicit sheet/turn choices are constraints; other blanks are repacked around them. */
export function nestAssignedStock<P extends NestPart>(parts:readonly P[],stock:StockSheet,overrides:Record<string,NestOverride>){
 if(!parts.some(p=>overrides[p.id]))return nestStock(parts,stock);
 const order=[...parts].sort((a,b)=>area(b)-area(a)||a.id.localeCompare(b.id));
 const empty=()=>[{x:stock.margin,y:stock.margin,width:stock.width-2*stock.margin+stock.gap,height:stock.height-2*stock.margin+stock.gap}];
 let best:ReturnType<typeof nestStock<P>>|undefined;
 for(const strategy of ['short','area','long'] as const){
  const sheets:{free:Rect[];placements:Placement<P>[]}[]=[],unplaced:P[]=[];let invalid=false;
  const get=(i:number)=>{while(sheets.length<=i)sheets.push({free:empty(),placements:[]});return sheets[i];};
  const place=(part:P,index:number)=>{
   const override=overrides[part.id],sheet=get(index);
   const turns=override?.rotated===undefined?undefined:[override.rotated];
   if(turns&&part.grain!=='none'&&turns[0]!== (part.grain==='v'))return false;
   const fitted=findPlacement(sheet.free,part,stock,strategy,turns);if(!fitted)return false;
   sheet.placements.push(fitted);sheet.free=occupy(sheet.free,{...fitted,width:fitted.width+stock.gap,height:fitted.height+stock.gap});return true;
  };
  for(const part of order.filter(p=>overrides[p.id]?.sheet!==undefined))if(!place(part,overrides[part.id].sheet!)){invalid=true;break;}
  if(invalid)continue;
  for(const part of order.filter(p=>overrides[p.id]?.sheet===undefined)){
   let done=false;for(let i=0;i<sheets.length;i++)if(place(part,i)){done=true;break;}
   if(!done&&!place(part,sheets.length))unplaced.push(part);
  }
  while(sheets.length&&sheets.at(-1)!.placements.length===0)sheets.pop();
  const result={sheets:sheets.map(s=>({placements:s.placements,utilization:s.placements.reduce((n,p)=>n+area(p),0)/area(stock)})),unplaced};
  if(!best||result.unplaced.length<best.unplaced.length||result.unplaced.length===best.unplaced.length&&result.sheets.length<best.sheets.length)best=result;
 }
 if(!best)throw Error('These parts cannot fit together on the selected sheet with the requested rotations. Try another sheet or a larger stock size.');
 return best;
}
