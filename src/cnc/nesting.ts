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

function findPlacement<P extends NestPart>(free: Rect[], part: P, stock: StockSheet, strategy: 'area' | 'short' | 'long', forcedTurns?:boolean[],rank?:number[]) {
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
  if(rank){rank[0]=best;rank[1]=tie;}
  return choice;
}

function pack<P extends NestPart>(parts: P[], stock: StockSheet, strategy: 'area' | 'short' | 'long',overrides:Record<string,NestOverride>={},dynamic=false) {
  const sheets: {free: Rect[]; placements: Placement<P>[]}[] = [];
  const unplaced: P[] = [];
  const empty = [{x: stock.margin, y: stock.margin, width: stock.width - 2 * stock.margin + stock.gap, height: stock.height - 2 * stock.margin + stock.gap}];
  const pending=[...parts];
  while(pending.length){
    let part=pending[0];
    let sheet: typeof sheets[number] | undefined;
    let placed: Placement<P> | undefined;
    const find=(free:Rect[],p:P,rank?:number[])=>{
      const turn=overrides[p.id]?.rotated;
      if(turn!==undefined&&p.grain!=='none'&&turn!==(p.grain==='v'))return undefined;
      return findPlacement(free,p,stock,strategy,turn===undefined?undefined:[turn],rank);
    };
    for(const candidate of sheets){
      if(dynamic){
        let bestRank=Infinity,tie=Infinity;
        for(const p of pending){const rank:number[]=[];const fit=find(candidate.free,p,rank);if(fit&&(rank[0]<bestRank||rank[0]===bestRank&&(rank[1]<tie||rank[1]===tie&&area(p)>area(part)))){part=p;placed=fit;bestRank=rank[0];tie=rank[1];}}
      }else placed=find(candidate.free,part);
      if(placed){sheet=candidate;break;}
    }
    if (!sheet || !placed) {
      placed = find(empty, part);
      if (!placed) { unplaced.push(part);pending.splice(pending.indexOf(part),1); continue; }
      sheet = {free: empty, placements: []};
      sheets.push(sheet);
    }
    pending.splice(pending.indexOf(part),1);
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

export function nestStock<P extends NestPart>(parts: readonly P[], stock: StockSheet,overrides:Record<string,NestOverride>={}) {
  if (!validStock(stock)) throw Error('Sheet margins must leave usable stock.');
  const long = (p:P)=>Math.max(p.width,p.height), short=(p:P)=>Math.min(p.width,p.height);
  const byLong = (a:P,b:P)=>long(b)-long(a)||area(b)-area(a)||a.id.localeCompare(b.id);
  const strategies=['short','area','long'] as const;
  const keys=[long,area,short,(p:P)=>p.width,(p:P)=>p.height,(p:P)=>long(p)+short(p)];
  const orders=keys.map(key=>[...parts].sort((a,b)=>key(b)-key(a)||byLong(a,b)));
  const tried=new Set<string>();
  let best=pack(orders[0],stock,'short',overrides);
  function consider(order:P[],dynamic=false){
    const key=JSON.stringify([dynamic,order.map(p=>p.id)]);
    if(tried.has(key))return;
    tried.add(key);
    for(const strategy of strategies){
      const trial=pack(order,stock,strategy,overrides,dynamic);
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
  orders.forEach(order=>consider(order));
  // Fill exact-size free rectangles before committing to the next large blank.
  orders.slice(0,3).forEach(order=>consider(order,true));
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

export type NestOverride={rotated?:boolean};
/** Quarter-turn choices constrain rotation only; sheet assignment stays automatic. */
export function nestAssignedStock<P extends NestPart>(parts:readonly P[],stock:StockSheet,overrides:Record<string,NestOverride>){
 const result=nestStock(parts,stock,overrides);
 if(result.unplaced.some(p=>overrides[p.id]?.rotated!==undefined))throw Error('A requested rotation cannot fit the stock size or grain. Use the other rotation or a compatible sheet size.');
 return result;
}
