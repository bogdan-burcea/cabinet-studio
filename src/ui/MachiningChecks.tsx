import type {Issue} from '../rules/validate';
import {Section,Button} from './components';
import {Icon} from '../design-system/Icon';
export function affectedItems(issue:Issue):string[]{return [issue.featureId,...issue.relatedIds??[]];}
export function MachiningChecks({issues,onResolve}:{issues:Issue[];onResolve():void}){
 if(!issues.length)return null;
 const collisions=issues.filter(i=>['machining-collision','machining-hinge-plate','machining-hole-collision'].includes(i.code)).length;
 const title=collisions?'Check connection placement':'Check machining setup';
 const summary=issues.length===1?issues[0].message:collisions?`${collisions} connection ${collisions===1?'conflict needs':'conflicts need'} attention. Adjust the fitting layout before machining.`:issues[0].message;
 return <Section title="Machining checks" className="machining-checks-notice"><div className="machining-review" aria-label={title}>
<div className="machining-review-main"><p>{summary}</p>
 {issues.length>1&&<details className="machining-details"><summary>View {issues.length} {issues.length===1?'detail':'details'}</summary><ul>{issues.map((i,n)=><li key={n}>{i.message}</li>)}</ul></details>}
 </div></div><Button className="full-width-button primary-button" onClick={onResolve}>Resolve</Button></Section>;
}
