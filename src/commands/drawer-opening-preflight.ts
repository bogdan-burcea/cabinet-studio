import {innerDrawerOpeningRepairs} from './clearance-repairs';
import type {Cabinet} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {evaluate} from '../geometry/evaluate';
import {drawerOpeningIssue,openingGeometryKey} from '../rules/door-motion';
/** Reject newly obstructed configurations. Existing imported problems stay
 * visible while unrelated edits remain possible; never silently alter a file. */
export function drawerOpeningEditIssue(candidate:Cabinet,previous:Cabinet,model?:EvaluatedCabinet){
 if(candidate.id!==previous.id||!candidate.drawers?.some(d=>d.internal)||!candidate.fronts.length)return null;
 model??=evaluate(candidate);
 const before=evaluate(previous);
 if(openingGeometryKey(model)===openingGeometryKey(before))return null;
 const issue=drawerOpeningIssue(model);
 // No hardware is an incomplete setup, not a failed 110°-hinge simulation.
 // Keep the door editable and visible with a persistent choose-hinges notice.
 return issue?.code==='machining-hinge-selection'?null:issue;
}

/** Complete newly created pantry fronts in the same transaction. Hardware is
 * selected only for unconfigured doors; all construction and chosen hinges stay
 * intact, and imports / unrelated edits are never silently rewritten. */
export function fitNewPantryHinges(candidate:Cabinet,previous:Cabinet):Cabinet{
 if(candidate.id!==previous.id||!candidate.drawers?.some(d=>d.internal))return candidate;
 const newDoor=candidate.fronts.some(d=>!previous.fronts.some(old=>old.id===d.id));
 const newInner=candidate.drawers.some(d=>d.internal&&!previous.drawers?.some(old=>old.id===d.id&&old.internal));
 const missing=new Set(candidate.fronts.filter(d=>!d.hinge).map(d=>d.id));
 if(!missing.size||!newDoor&&!newInner)return candidate;
 const before=evaluate(candidate),collision=(issue:EvaluatedCabinet['issues'][number])=>['machining-collision','machining-hole-collision','machining-hinge-plate'].includes(issue.code);
 const existing=new Set(before.issues.filter(collision).map(i=>JSON.stringify(i)));
 for(const option of innerDrawerOpeningRepairs(candidate)){
  const fitted={...candidate,fronts:candidate.fronts.map(d=>missing.has(d.id)?{...d,hinge:option.cabinet.fronts.find(f=>f.id===d.id)?.hinge}:d)};
  try{
   const model=evaluate(fitted);
   if(!drawerOpeningIssue(model)&&!model.issues.filter(collision).some(i=>!existing.has(JSON.stringify(i))))return fitted;
  }catch{/* Do not trade an opening problem for a drilling or mounting problem. */}
 }
 return candidate;
}
