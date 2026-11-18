import test from 'node:test';
import assert from 'node:assert/strict';
import { createCabinet, defaultBinding } from '../src/domain/cabinet.ts';
import { presets } from '../src/catalogue/presets.ts';
import { applyPreset } from '../src/commands/presets.ts';
import { addDivision } from '../src/commands/interiors.ts';
import { addAdjustable } from '../src/commands/adjustable.ts';
import { setBanding, changeMaterial } from '../src/commands/materials.ts';
import { evaluate } from '../src/geometry/evaluate.ts';
import { CabinetStore } from '../src/commands/store.ts';
import { serialize, deserialize } from '../src/persistence/files.ts';
function furnished(){let c=createCabinet();c=addDivision(c,c.compartments.id,'horizontal',342).cabinet;c=addAdjustable(c,evaluate(c).openings[0].id).cabinet;c=setBanding(c,c.contents[0].id,'v-max',{id:'generic-edge-2',revision:'1'});c=changeMaterial(c,'interior',defaultBinding({id:'generic-panel-16',revision:'1'}));c.installation.feet.height=140;c.installation.plinth.enabled=true;return c;}
test('all four presets configure the same furnished model while preserving custom content, identities, materials and dormant installation',()=>{
 const c=furnished();for(const preset of presets){const next=applyPreset(c,preset.id),e=evaluate(next);assert.deepEqual(next.envelope,c.envelope);assert.equal(next.id,c.id);assert.deepEqual(next.compartments,c.compartments);assert.deepEqual(next.contents,c.contents);assert.deepEqual(next.materials,c.materials);assert.deepEqual(next.banding,c.banding);assert.deepEqual(next.hardware,c.hardware);assert.deepEqual(next.installation.feet,c.installation.feet);assert.deepEqual(next.installation.plinth,c.installation.plinth);assert.equal(e.adjustable.shelves.length,1);assert.equal(e.divisions.length,1);assert.deepEqual(deserialize(serialize(next)),next);}
});
test('suggested preset sizes are explicit and invalid dependent edits preserve the complete cabinet',()=>{
 const c=furnished(),store=new CabinetStore(c);const tall=applyPreset(c,'tall',true);assert.equal(tall.envelope.height,2100);assert.equal(tall.installation.mounting.mode,'restraint-concept');assert.equal(evaluate(tall).installation.installedHeight,2240);
 assert.deepEqual(applyPreset(c,'tall').envelope,c.envelope);
 const high=createCabinet();high.envelope.height=2100;const added=addAdjustable(high,high.compartments.id);high.contents=added.cabinet.contents;high.contents[0].level=40;const state=new CabinetStore(applyPreset({...high,envelope:{...high.envelope,height:2100}},'tall'));
 assert.equal(state.commit(applyPreset(state.getSnapshot().committed,'wall',true)),false);assert.equal(state.getSnapshot().committed.envelope.height,2100);
});
test('presets use preview/cancel/apply as one undo step and preserve all prior construction/installation settings on Undo',()=>{
 const c=furnished(),store=new CabinetStore(c),next=applyPreset(c,'wall');store.preview(next);store.cancel();assert.deepEqual(store.getSnapshot().committed,c);assert.equal(store.getSnapshot().canUndo,false);store.preview(next);store.commit();store.undo();assert.deepEqual(store.getSnapshot().committed,c);assert.equal(store.getSnapshot().canUndo,false);store.redo();assert.deepEqual(store.getSnapshot().committed,next);
});
