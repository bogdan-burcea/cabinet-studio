import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {addDrawerStack} from '../src/commands/drawers';
import {addSimpleDoors,editSimpleDoors} from '../src/commands/simple-doors';
import {antaroPin,chooseDrawerPack} from '../src/catalogue/drawers';
import {defaultHinge,blumClip110} from '../src/catalogue/hinges';
import {drawerOpeningEditIssue,fitNewPantryHinges} from '../src/commands/drawer-opening-preflight';
import {drawerOpeningIssue,safeInnerDrawerExtensions} from '../src/rules/door-motion';
import {evaluate} from '../src/geometry/evaluate';
import {CabinetStore} from '../src/commands/store';
import {serialize,deserialize} from '../src/persistence/files';
import {innerDrawerOpeningRepairs} from '../src/commands/clearance-repairs';
import {resizeEnvelope} from '../src/commands/dimensions';
for(const family of ['antaro','merivobox'] as const)for(const layout of ['single','pair'] as const){
 test(`${family} ${layout}: doors can be added before hinge selection, with an actionable incomplete-setup notice`,()=>{
  const base=resizeEnvelope(createCabinet(),{width:400,height:720,depth:560}),before=addDrawerStack(base,base.compartments.id,3,chooseDrawerPack(antaroPin,{family}),false,true).cabinet;
  const next=addSimpleDoors(before,layout).cabinet,model=evaluate(next),issue=drawerOpeningIssue(model)!;
  assert.ok(next.fronts.every(d=>!d.hinge));assert.equal(model.doorHardware.hinges.length,0);
  assert.equal(issue.code,'machining-hinge-selection');assert.ok(next.fronts.some(d=>d.id===issue.featureId));assert.match(issue.message,/Hinges → Hinge system/);assert.doesNotMatch(issue.message,/blocked by|selected doors and hinges/);
  assert.equal(drawerOpeningEditIssue(next,before),null);
  const store=new CabinetStore(before);assert.ok(store.commit(next));assert.deepEqual(deserialize(serialize(next)),next);store.undo();assert.deepEqual(store.getSnapshot().committed,before);store.redo();assert.deepEqual(store.getSnapshot().committed,next);
  assert.equal(safeInnerDrawerExtensions(model,{},Object.fromEntries(next.drawers!.map(d=>[d.id,100]))).blocked,true,'Incomplete hardware must never remove the real closed-door obstruction');
  const options=innerDrawerOpeningRepairs(next);assert.ok(options.length,'Offer an evaluated wide-angle fitting when one fits');
  for(const option of options){assert.ok(option.cabinet.fronts.every(d=>d.hinge));assert.equal(drawerOpeningIssue(evaluate(option.cabinet)),null);assert.deepEqual(option.cabinet.drawers,next.drawers);}
 });
}
test('selecting a genuinely obstructing hinge is still rejected before motion and offers a checked solution',()=>{
 const base=resizeEnvelope(createCabinet(),{width:400,height:720,depth:560}),inner=addDrawerStack(base,base.compartments.id,3,antaroPin,false,true).cabinet;
 const draft=addSimpleDoors(inner,'single').cabinet,bad={...draft,fronts:draft.fronts.map(d=>({...d,hinge:defaultHinge(blumClip110.id)}))};
 const issue=drawerOpeningEditIssue(bad,draft);assert.equal(issue?.code,'machining-drawer-opening');assert.match(issue!.message,/155° soft-close hinge/);
 const fixes=innerDrawerOpeningRepairs(bad);assert.ok(fixes.length);assert.ok(fixes.every(f=>drawerOpeningEditIssue(f.cabinet,draft)===null&&drawerOpeningIssue(evaluate(f.cabinet))===null));
 const current=fixes[0].cabinet,cleared={...current,fronts:current.fronts.map(({hinge,...d})=>d)};
 assert.equal(drawerOpeningEditIssue(cleared,current),null);assert.equal(drawerOpeningIssue(evaluate(cleared))?.code,'machining-hinge-selection');
});

for(const family of ['antaro','merivobox'] as const)for(const layout of ['single','pair'] as const)for(const placement of ['inset','overlay'] as const){
 test(`${family} ${layout} ${placement}: new pantry doors receive a complete suitable hinge automatically`,()=>{
  const base=resizeEnvelope(createCabinet(),{width:400,height:720,depth:560}),before=addDrawerStack(base,base.compartments.id,3,chooseDrawerPack(antaroPin,{family}),false,true).cabinet;
  const added=addSimpleDoors(before,layout).cabinet,requested=editSimpleDoors(added,added.fronts.map(d=>d.id),{placement});
  const fitted=fitNewPantryHinges(requested,before),model=evaluate(fitted);
  assert.ok(fitted.fronts.every(d=>d.hinge));assert.ok(model.doorHardware.hinges.every(h=>h.softClose));assert.equal(drawerOpeningIssue(model),null);
  const withoutHinges=(fronts:typeof fitted.fronts)=>fronts.map(({hinge,...front})=>front);
  assert.deepEqual(withoutHinges(fitted.fronts),withoutHinges(requested.fronts));assert.deepEqual(fitted.drawers,requested.drawers);assert.deepEqual(fitted.envelope,requested.envelope);
  const store=new CabinetStore(before);assert.ok(store.commit(fitted));store.undo();assert.deepEqual(store.getSnapshot().committed,before);store.redo();assert.deepEqual(store.getSnapshot().committed,fitted);
 });
}
test('automatic fitting works in either creation order and preserves explicit hinge choices / imports / unrelated edits',()=>{
 const base=createCabinet(),doors=addSimpleDoors(base,'single').cabinet,drawers=addDrawerStack(doors,doors.compartments.id,3,antaroPin,false,true).cabinet;
 const fitted=fitNewPantryHinges(drawers,doors);assert.ok(fitted.fronts[0].hinge);assert.equal(drawerOpeningIssue(evaluate(fitted)),null);
 const configured={...drawers,fronts:drawers.fronts.map(d=>({...d,hinge:defaultHinge(blumClip110.id)}))};
 assert.equal(fitNewPantryHinges(configured,doors),configured,'Never replace a hinge already chosen by the user');
 assert.equal(fitNewPantryHinges({...drawers,name:'Renamed'},drawers).fronts[0].hinge,undefined,'Unrelated edits do not configure old documents');
 const imported={...drawers,id:'another-file'};assert.equal(fitNewPantryHinges(imported,base),imported);
});
