import type {Cabinet} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {evaluate} from '../geometry/evaluate';
import {drawerOpeningIssue} from '../rules/door-motion';
/** Reject newly obstructed configurations. Existing imported problems stay
 * visible while unrelated edits remain possible; never silently alter a file. */
export function drawerOpeningEditIssue(candidate:Cabinet,previous:Cabinet,model:EvaluatedCabinet=evaluate(candidate)){
 const issue=drawerOpeningIssue(model);if(!issue||candidate.id!==previous.id)return null;
 const insetChanged=candidate.fronts.some(d=>d.placement==='inset'&&previous.fronts.find(p=>p.id===d.id)?.placement!=='inset');
 if(insetChanged)return issue;
 const before=evaluate(previous);
 // Matching the first error alone can hide a second, newly introduced clash.
 // Only edits that leave all motion geometry unchanged may preserve an old issue.
 const geometry=(e:EvaluatedCabinet)=>JSON.stringify([
  e.panels.map(p=>[p.id,p.center,p.size]),
  e.fronts.doors.map(d=>[d.id,d.center,d.size,d.pivot,d.handing,d.placement]),
  e.fronts.handles.map(p=>[p.id,p.ownerId,p.center,p.size]),
  e.doorHardware.hinges.map(h=>[h.id,h.supportId,h.article,h.plate,h.cup,h.maxAngle,h.mountingZone]),
  e.drawers.drawers.map(d=>[d.id,d.parts.map(p=>[p.id,p.center,p.size,p.moving])])
 ]);
 return geometry(model)===geometry(before)?null:issue;
}
