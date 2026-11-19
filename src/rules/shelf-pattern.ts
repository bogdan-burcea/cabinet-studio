import type {Cabinet,AdjustableShelf} from '../domain/cabinet';
import type {Opening} from './interiors';
import {stock} from '../catalogue/materials';
import {conceptShelfSupport as profile} from '../catalogue/shelves';
export function shelfHoleBounds(c:Cabinet,opening:Opening){return {min:profile.minClear-profile.padSize[1]/2,max:opening.size[1]-profile.minClear-stock(c,'interior').thickness-profile.padSize[1]/2};}
export function shelfPattern(c:Cabinet,shelf:AdjustableShelf,opening:Opening){
 const d=shelf.drilling;if(!d)throw Error('Select a shelf with an adjustment hole set.');
 const {min,max}=shelfHoleBounds(c,opening),count=d.count;
 const legacy=profile.firstLevel+(d.firstLevel+(count-1)/2)*profile.pitch-profile.padSize[1]/2;
 const center=d.anchor==='centre'?opening.size[1]/2:d.anchor==='height'?d.center!:legacy;
 if(d.revision!=='shelf-holes-1'||!Number.isInteger(count)||count<1||!Number.isInteger(d.firstLevel)||d.firstLevel<0||d.anchor!==undefined&&!['centre','height'].includes(d.anchor)||!Number.isFinite(center)||d.anchor==='height'&&Math.abs(center*10-Math.round(center*10))>1e-6)throw Error('Use a valid adjustment-hole count, centre height and opposing-row layout.');
 const half=(count-1)*profile.pitch/2;
 if(center-half<min-1e-6||center+half>max+1e-6)throw Error('The adjustment holes must stay inside the opening with shelf clearance. Move the hole set or reduce its count.');
 const ys=Array.from({length:count},(_,i)=>center+(i-(count-1)/2)*profile.pitch);
 return {center,ys,undersides:ys.map(y=>y+profile.padSize[1]/2),minCenter:min+half,maxCenter:max-half};
}
export function shelfHoleMaximum(c:Cabinet,opening:Opening,shelf?:AdjustableShelf){
 if(!shelf?.drilling?.anchor)return Math.max(0,Math.floor((opening.size[1]-profile.minClear-stock(c,'interior').thickness-profile.firstLevel+1e-6)/profile.pitch)+1);
 const {min,max}=shelfHoleBounds(c,opening),center=shelf.drilling.anchor==='centre'?opening.size[1]/2:shelf.drilling.center!;
 return Math.max(0,Math.floor((2*Math.min(center-min,max-center)+1e-6)/profile.pitch)+1);
}
