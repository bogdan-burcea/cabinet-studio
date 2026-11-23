import type {Cabinet} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {evaluate} from '../geometry/evaluate';
import {drawerOpeningIssue,openingGeometryKey} from '../rules/door-motion';
/** Reject newly obstructed configurations. Existing imported problems stay
 * visible while unrelated edits remain possible; never silently alter a file. */
export function drawerOpeningEditIssue(candidate:Cabinet,previous:Cabinet,model:EvaluatedCabinet=evaluate(candidate)){
 if(candidate.id!==previous.id)return null;
 const before=evaluate(previous);
 if(openingGeometryKey(model)===openingGeometryKey(before))return null;
 return drawerOpeningIssue(model);
}
