import test from 'node:test';
import assert from 'node:assert/strict';
import { createCabinet, resize, type Cabinet } from '../src/domain/cabinet.ts';
import { addDivision, duplicateDivision, findDivision, moveDivision, removeDivision } from '../src/commands/interiors.ts';
import { evaluate, type EvaluatedCabinet } from '../src/geometry/evaluate.ts';
import { CabinetStore } from '../src/commands/store.ts';
import { deserialize, deserializeWithInfo, serialize, AUTOSAVE_KEY, LEGACY_AUTOSAVE_KEY } from '../src/persistence/files.ts';

function noOverlaps(e: EvaluatedCabinet) {
  for (let i = 0; i < e.panels.length; i++) for (let j = i + 1; j < e.panels.length; j++) {
    const a = e.panels[i], b = e.panels[j];
    const overlap = a.size.map((size, axis) => Math.min(a.center[axis] + size / 2, b.center[axis] + b.size[axis] / 2) - Math.max(a.center[axis] - size / 2, b.center[axis] - b.size[axis] / 2));
    assert.ok(overlap.some(v => v < 1e-6), `${a.label} intersects ${b.label}`);
  }
}
function nested() {
  let c = createCabinet();
  const a = addDivision(c, c.compartments.id, 'vertical', 282); c = a.cabinet;
  const left = evaluate(c).openings[0];
  const b = addDivision(c, left.id, 'horizontal', 342); c = b.cabinet;
  return { c, divider: a.featureId, shelf: b.featureId };
}

test('horizontal and vertical divisions allocate panel thickness and stable child openings without overlap', () => {
  for (const width of [300, 600, 1200]) for (const height of [300, 720, 1800]) for (const axis of ['horizontal', 'vertical'] as const) {
    let c = createCabinet(); c.envelope = { width, height, depth: 560, origin: [25, 50, -10] };
    const root = evaluate(c).opening, n = axis === 'horizontal' ? 1 : 0;
    c = addDivision(c, root.id, axis, root.size[n] / 2).cabinet;
    const e = evaluate(c), panel = e.panels[5];
    assert.equal(e.openings.length, 2); assert.equal(panel.size[n], 18);
    assert.equal(e.openings[0].size[n] + e.openings[1].size[n] + panel.size[n], root.size[n]);
    assert.equal(e.openings[0].origin[n], root.origin[n]);
    assert.equal(e.openings[1].origin[n], root.origin[n] + e.openings[0].size[n] + 18);
    noOverlaps(e);
  }
});

test('moving a parent divider resizes its child shelf and changes openings together, preserving identities', () => {
  const { c, divider, shelf } = nested(), before = evaluate(c), after = evaluate(moveDivision(c, divider, 320));
  assert.equal(before.panels.find(p => p.id === shelf)!.size[0], 273);
  assert.equal(after.panels.find(p => p.id === shelf)!.size[0], 311);
  assert.deepEqual(after.panels.map(p => p.id), before.panels.map(p => p.id));
  assert.deepEqual(after.openings.map(o => o.id), before.openings.map(o => o.id));
  assert.equal(after.openings[2].size[0], 235); noOverlaps(after);
});

test('cabinet dimensions regenerate dependent interior panels without changing stored positions', () => {
  const { c, divider } = nested();
  const larger = resize(resize(c, 'height', 900), 'depth', 650), e = evaluate(larger);
  assert.equal(findDivision(larger.compartments, divider)!.position, 282);
  assert.equal(e.panels.find(p => p.id === divider)!.size[1], 864);
  assert.equal(e.panels.find(p => p.role === 'shelf')!.size[2], 644); noOverlaps(e);
});

test('invalid dependent moves and cabinet resizes retain the complete previous interior and identify the issue', () => {
  const { c, divider, shelf } = nested(), store = new CabinetStore(c);
  store.preview(moveDivision(c, divider, 300));
  assert.equal(store.commit(moveDivision(c, divider, 10)), false);
  assert.equal(store.getSnapshot().preview, null); assert.equal(store.getSnapshot().issueFeatureId, divider);
  assert.deepEqual(store.getSnapshot().committed, c);
  assert.equal(store.commit(resize(c, 'height', 380)), false);
  assert.equal(store.getSnapshot().issueFeatureId, shelf); assert.deepEqual(store.getSnapshot().committed, c);
  assert.equal(store.getSnapshot().canUndo, false);
});

test('a shelf move preview commits one undo step and Escape-style cancellation preserves it', () => {
  const { c, shelf } = nested(), store = new CabinetStore(c);
  for (const position of [350, 360, 380, 400]) store.preview(moveDivision(c, shelf, position));
  assert.deepEqual(store.getSnapshot().committed, c); store.commit();
  assert.equal(findDivision(store.getSnapshot().committed.compartments, shelf)!.position, 400);
  store.undo(); assert.deepEqual(store.getSnapshot().committed, c); assert.equal(store.getSnapshot().canUndo, false);
  store.redo(); const saved = store.getSnapshot().committed;
  store.preview(moveDivision(saved, shelf, 450)); store.cancel(); assert.deepEqual(store.getSnapshot().committed, saved);
});

test('numeric and constrained movement intent produce identical interior geometry', () => {
  const { c, shelf } = nested(), numeric = new CabinetStore(c), drag = new CabinetStore(c);
  numeric.commit(moveDivision(c, shelf, 410));
  for (const position of [360, 385, 410]) drag.preview(moveDivision(c, shelf, position));
  drag.commit(); assert.deepEqual(evaluate(numeric.getSnapshot().committed), evaluate(drag.getSnapshot().committed));
});

test('removing nested parents is rejected; leaf removal restores its original opening and undo restores all identities', () => {
  const { c, shelf, divider } = nested(); assert.throws(() => removeDivision(c, divider), /child openings/);
  const originalNode = findDivision(c.compartments, shelf)!, store = new CabinetStore(c);
  store.commit(removeDivision(c, shelf));
  assert.ok(evaluate(store.getSnapshot().committed).openings.some(o => o.id === originalNode.id));
  store.undo(); assert.deepEqual(store.getSnapshot().committed, c);
  const noShelf = removeDivision(c, shelf), empty = removeDivision(noShelf, divider);
  assert.equal(evaluate(empty).panels.length, 5); assert.equal(empty.compartments.id, c.compartments.id);
});

test('new divisions can be added to a child opening with distinct identities and invalid additions are rejected', () => {
  const c = createCabinet(), a = addDivision(c, c.compartments.id, 'horizontal', 342);
  const target = evaluate(a.cabinet).openings[1], b = addDivision(a.cabinet, target.id, 'horizontal', 166.5);
  assert.notEqual(a.featureId, b.featureId); assert.equal(evaluate(b.cabinet).openings.length, 3); noOverlaps(evaluate(b.cabinet));
  const small = resize(resize(c, 'width', 120), 'height', 120), store = new CabinetStore(small);
  assert.equal(store.commit(addDivision(small, small.compartments.id, 'horizontal', 42).cabinet), false);
  assert.deepEqual(store.getSnapshot().committed, small);
});

test('version 8 round trip preserves nested intent, product pins and all evaluated geometry', () => {
  const { c } = nested(), encoded = serialize(c), doc = JSON.parse(encoded);
  assert.equal(doc.schemaVersion, 8); assert.equal(doc.evaluatorRevision, 'fronts-8');
  assert.deepEqual(deserialize(encoded), c); assert.deepEqual(evaluate(deserialize(encoded)), evaluate(c));
});

test('Stage 1 migrations operate on copies, preserve every panel and identity, and retain a separate autosave key', () => {
  const c = createCabinet(), { banding, ...withoutBanding } = c;
  const legacy = JSON.stringify({ format: 'cabinet-studio', schemaVersion: 1, evaluatorRevision: 'carcass-1', cabinet: { ...withoutBanding, installation: { type: 'unassigned' }, materials: { carcass: c.materials.carcass.stock, back: c.materials.back.stock }, carcass: { construction: 'butt-full-top-inset-back', policyRevision: 'concept-1' } } });
  const result = deserializeWithInfo(legacy);
  assert.equal(result.migrated, true); assert.deepEqual(result.cabinet, c);
  assert.deepEqual(evaluate(result.cabinet).panels, evaluate(c).panels);
  result.cabinet.name = 'Changed copy'; assert.equal(JSON.parse(legacy).cabinet.name, c.name);
  assert.notEqual(AUTOSAVE_KEY, LEGACY_AUTOSAVE_KEY);
});

test('malformed trees, duplicate IDs, unknown policies and future formats are rejected before replacing the cabinet', () => {
  const { c } = nested();
  const mutations = [
    (d: any) => d.cabinet.compartments.children.pop(),
    (d: any) => d.cabinet.compartments.children[1].id = d.cabinet.compartments.children[0].id,
    (d: any) => d.cabinet.compartments.featureId = d.cabinet.id + '/panel/back',
    (d: any) => d.cabinet.compartments.policyRevision = 'adjustable-unknown',
    (d: any) => d.cabinet.compartments.axis = 'diagonal',
    (d: any) => d.cabinet.compartments.position = 9000,
    (d: any) => d.schemaVersion = 9,
    (d: any) => { d.schemaVersion = 1; d.evaluatorRevision = 'carcass-1'; }
  ];
  for (const mutate of mutations) { const doc = JSON.parse(serialize(c)); mutate(doc); assert.throws(() => deserialize(JSON.stringify(doc))); }
});


test('duplication targets the largest child opening while preserving all prior features and leaves', () => {
  const { c, shelf } = nested(), moved = moveDivision(c, shelf, 400), before = evaluate(moved);
  const copy = duplicateDivision(moved, shelf), after = evaluate(copy.cabinet);
  assert.equal(after.divisions.length, before.divisions.length + 1);
  assert.ok(before.divisions.every(d => after.divisions.some(n => n.id === d.id && n.position === d.position)));
  const parent = findDivision(copy.cabinet.compartments, shelf)!;
  assert.equal(parent.children[1].kind, 'opening');
  assert.equal(parent.children[0].kind, 'split');
  assert.equal(findDivision(copy.cabinet.compartments, copy.featureId)!.position, 195.5);
  assert.equal(new Set([...after.panels.map(p => p.id), ...after.openings.map(o => o.id)]).size, after.panels.length + after.openings.length);
  noOverlaps(after);
});
