import {SAFE_FEATURE_CLEARANCE} from './hole-collisions';
import type {Cabinet} from '../domain/cabinet';
import type {JoineryPanel,CabineoBore,CabineoJoint} from './cabineo';
import type {BackPocket} from './back-panel';
import {machiningReview} from './machining-review';
import {wallHangingCuts,usesBlumWallHanger} from './wall-hanging';
/** Move only side fixings; retain their count, identity, end margins and 10 mm web. */
export function placeSideBackFasteners(c:Cabinet,panels:JoineryPanel[],joints:CabineoJoint[],drilling:CabineoBore[],pockets:BackPocket[],nominal:CabineoBore[]){
 if(!nominal.length)return nominal;
 const back=panels.find(p=>p.role==='back')!;
 const minimum=back.center[1]-back.size[1]/2+50;
 const maximum=Math.min(back.center[1]+back.size[1]/2-50,...(usesBlumWallHanger(c)?wallHangingCuts(c).pockets:[]).map(p=>p.origin[1]-57.5));
 const placed:CabineoBore[]=[];
 for(const owner of new Set(nominal.map(b=>b.panelId))){
  const side=nominal.filter(b=>b.panelId===owner).sort((a,b)=>a.point[1]-b.point[1]);
  for(const [index,bore] of side.entries()){
   const previous=placed.filter(b=>b.panelId===owner).at(-1);
   const low=Math.max(minimum,previous?previous.point[1]+30:minimum),high=maximum-30*(side.length-index-1);
   const safe=(y:number)=>{
    const candidate={...bore,point:[bore.point[0],y,bore.point[2]] as CabineoBore['point'],diameter:bore.diameter+2*SAFE_FEATURE_CLEARANCE};
    return !machiningReview(panels,joints,[...drilling,...placed,candidate],pockets).some(i=>['machining-collision','machining-hole-collision'].includes(i.code)&&i.operationIds?.includes(bore.id));
   };
   let y:number|undefined;
   for(let delta=0;delta<=Math.ceil(maximum-minimum)&&y===undefined;delta++)for(const direction of delta?[1,-1]:[1]){
    const value=bore.point[1]+delta*direction;if(value>=low-1e-6&&value<=high+1e-6&&safe(value)){y=value;break;}
   }
   if(y===undefined)throw Error('No safe side Ixconnect position remains. Reduce back connectors per side or move the adjoining shelf, divider or fitting.');
   placed.push({...bore,point:[bore.point[0],y,bore.point[2]]});
  }
 }
 return placed;
}
