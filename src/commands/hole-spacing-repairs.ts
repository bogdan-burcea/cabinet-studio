import type {Cabinet} from '../domain/cabinet';
import {evaluate} from '../geometry/evaluate';
import {cnc} from '../rules/cnc';
import {shelfPattern} from '../rules/shelf-pattern';
import {holesOverlap,intentionalHoleUnion,SAFE_FEATURE_CLEARANCE} from '../rules/hole-collisions';
import {linkedShelfIds} from './adjustable';
import {setCnc} from './cnc';
import {moveDivision} from './interiors';
import type {EditRepair} from './edit-repairs';
/** Find the nearest whole-mm placement, keep a 10 mm web between repaired bores,
 * and reject candidates that add machining problems or invalidate connected parts. */
export function holeSpacingRepairs(c:Cabinet,selectedIssues=evaluate(c).issues):EditRepair[]{
 const before=evaluate(c),all=[...before.drilling,...before.backFasteners,...before.cabineo.flatMap(j=>j.bores)],byId=new Map(all.map(b=>[b.id,b]));
 const hits=selectedIssues.filter(i=>i.code==='machining-hole-collision'),operations=new Set(hits.flatMap(i=>i.operationIds??[]));if(!hits.length)return [];
 const shelves=linkedShelfIds(c,[...new Set(all.filter(b=>operations.has(b.id)&&b.kind==='shelf-support').map(b=>b.group))]);
 const signature=(i:typeof before.issues[number])=>JSON.stringify([i.code,i.featureId,i.operationIds,i.relatedIds,i.message]),existing=new Set(before.issues.filter(i=>i.code.startsWith('machining-')).map(signature)),bad=new Set(hits.map(signature));
 const options:EditRepair[]=[];
 function offer(candidate:Cabinet,label:string){try{
  const m=evaluate(candidate);if(m.issues.some(i=>i.code.startsWith('machining-')&&(!existing.has(signature(i))||bad.has(signature(i)))))return false;
  const bores=[...m.drilling,...m.backFasteners,...m.cabineo.flatMap(j=>j.bores)];
  for(const a of bores.filter(b=>shelves.length?b.kind==='shelf-support'&&shelves.includes(b.group):operations.has(b.id)))for(const b of bores)if(a.id!==b.id&&a.panelId===b.panelId&&!intentionalHoleUnion(a,b)&&holesOverlap({...a,diameter:a.diameter+2*SAFE_FEATURE_CLEARANCE},b))return false;
  options.push({label,cabinet:candidate});return true;
 }catch{return false;}}
 if(shelves.length){
  const affected=all.filter(b=>operations.has(b.id)&&b.kind==='shelf-support'),rows=cnc(c).shelfRowInsets??{front:37,rear:37};
  const front=affected.some(b=>{const p=before.panels.find(p=>p.id===b.panelId)!;return b.point[2]>p.center[2];}),rear=affected.some(b=>{const p=before.panels.find(p=>p.id===b.panelId)!;return b.point[2]<=p.center[2];});
  for(const direction of [-1,1])for(let delta=1;delta<=100;delta++){
   const insets={front:rows.front-(front?direction*delta:0),rear:rows.rear+(rear?direction*delta:0)};if(Object.values(insets).some(n=>n<3||n>600))break;
   if(offer(setCnc(c,{shelfRowInsets:insets}),`Move adjustment rows ${delta} mm ${direction>0?'toward the front':'toward the back'} for safe hole spacing`))break;
  }
  for(const direction of [-1,1])for(let delta=1;delta<=100;delta++){
   const next={...c,contents:c.contents.map(s=>{if(!shelves.includes(s.id)||!s.drilling)return s;const opening=before.openings.find(o=>o.id===s.openingId)!;return {...s,level:s.level-s.drilling.firstLevel,drilling:{...s.drilling,firstLevel:0,anchor:'height' as const,center:Math.round((shelfPattern(c,s,opening).center+direction*delta)*10)/10}};})};
   if(offer(next,`Move affected shelves and hole sets ${delta} mm ${direction>0?'up':'down'} for safe hole spacing`))break;
  }
 }
 if(!options.length){
  const joints=before.cabineo.filter(j=>j.bores.some(b=>operations.has(b.id))),ids=new Set(joints.map(j=>j.hostId));
  for(const id of ids){const d=before.divisions.find(d=>d.id===id);if(!d)continue;for(const sign of [-1,1])for(let delta=1;delta<=100;delta++){const p=d.position+sign*delta;if(p<d.min||p>d.max)break;if(offer(moveDivision(c,id,p),`Move ${d.label} ${delta} mm ${d.axis==='horizontal'?(sign>0?'up':'down'):(sign>0?'right':'left')} for safe hole spacing`))break;}}
 }
 return options;
}
