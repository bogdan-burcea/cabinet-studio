import test from 'node:test';
import assert from 'node:assert/strict';
import { createCabinet, resize, type Cabinet, type Carcass } from '../src/domain/cabinet.ts';
import { addDivision } from '../src/commands/interiors.ts';
import { changeConstruction } from '../src/commands/construction.ts';
import { CabinetStore } from '../src/commands/store.ts';
import { evaluate, type EvaluatedCabinet } from '../src/geometry/evaluate.ts';
import { deserialize, deserializeWithInfo, serialize, AUTOSAVE_KEY, PREVIOUS_AUTOSAVE_KEYS } from '../src/persistence/files.ts';

function furnished(width = 600, height = 720, depth = 560): Cabinet {
  let c = createCabinet(); c.envelope = { width, height, depth, origin: [25, 50, -10] };
  c = addDivision(c, c.compartments.id, 'vertical', (width - 36) / 2).cabinet;
  c = addDivision(c, evaluate(c).openings[0].id, 'horizontal', (height - 36) / 2).cabinet;
  return c;
}
function modes(c: Cabinet, top: 'full' | 'rails', back: 'full' | 'rails'): Carcass {
  return { ...c.carcass, top: { ...c.carcass.top, mode: top }, back: { ...c.carcass.back, mode: back } };
}
function noOverlapsAndEnclosed(c: Cabinet, e: EvaluatedCabinet) {
  const bounds = [c.envelope.width, c.envelope.height, c.envelope.depth];
  for (const a of e.panels) {
    assert.ok(a.size.every(n => n > 0));
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(a.center[axis] - a.size[axis] / 2 >= c.envelope.origin[axis] - 1e-6);
      assert.ok(a.center[axis] + a.size[axis] / 2 <= c.envelope.origin[axis] + bounds[axis] + 1e-6);
    }
    for (const b of e.panels.filter(p => p.id !== a.id)) {
      const overlap = a.size.map((size, axis) => Math.min(a.center[axis] + size / 2, b.center[axis] + b.size[axis] / 2) - Math.max(a.center[axis] - size / 2, b.center[axis] - b.size[axis] / 2));
      assert.ok(overlap.some(n => n <= 1e-6), `${a.label} intersects ${b.label}`);
    }
  }
}

test('all four top/back combinations retain furnished geometry without overlap across 72 configurations', () => {
  for (const width of [300, 600, 1200]) for (const height of [360, 720, 1800]) for (const depth of [250, 560]) {
    const original = furnished(width, height, depth), before = evaluate(original);
    for (const top of ['full', 'rails'] as const) for (const back of ['full', 'rails'] as const) {
      const c = changeConstruction(original, modes(original, top, back)), e = evaluate(c);
      assert.deepEqual(c.compartments, original.compartments); assert.deepEqual(c.materials, original.materials); assert.deepEqual(c.hardware, original.hardware);
      assert.equal(e.panels.length, 7 + Number(top === 'rails') + Number(back === 'rails'));
      assert.deepEqual(e.openings.map(o => o.id), before.openings.map(o => o.id));
      assert.deepEqual(e.divisions.map(d => [d.id, d.position, d.before, d.after]), before.divisions.map(d => [d.id, d.position, d.before, d.after]));
      assert.equal(e.opening.size[2], depth - (back === 'rails' ? 18 : 6));
      noOverlapsAndEnclosed(c, e);
    }
  }
});

test('independent top rails replace only the full top and leave interior geometry unchanged', () => {
  const c = furnished(), next = changeConstruction(c, { ...c.carcass, top: { mode: 'rails', frontDepth: 100, rearDepth: 60 } });
  const before = evaluate(c), e = evaluate(next);
  assert.equal(e.panels.some(p => p.role === 'top'), false);
  assert.deepEqual(e.panels.find(p => p.role === 'top-front-rail')!.size, [564, 18, 100]);
  assert.deepEqual(e.panels.find(p => p.role === 'top-rear-rail')!.size, [564, 18, 60]);
  assert.equal(e.panels.find(p => p.role === 'top-front-rail')!.center[2], -10 + 560 - 50);
  assert.equal(e.construction.topGap, 400);
  assert.deepEqual(e.panels.filter(p => p.role === 'shelf' || p.role === 'divider'), before.panels.filter(p => p.role === 'shelf' || p.role === 'divider'));
  assert.deepEqual(e.openings, before.openings);
});

test('rear rails use carcass stock and resize every existing interior depth while preserving local positions', () => {
  const c = furnished(), next = changeConstruction(c, { ...c.carcass, back: { mode: 'rails', upperHeight: 110, lowerHeight: 70 } });
  const before = evaluate(c), e = evaluate(next);
  assert.equal(e.panels.some(p => p.role === 'back'), false);
  assert.deepEqual(e.panels.find(p => p.role === 'back-upper-rail')!.size, [564, 110, 18]);
  assert.deepEqual(e.panels.find(p => p.role === 'back-lower-rail')!.size, [564, 70, 18]);
  assert.equal(e.panels.find(p => p.role === 'back-lower-rail')!.center[1], 50 + 18 + 35);
  assert.equal(e.construction.backGap, 504);
  for (const d of e.divisions) {
    const original = before.divisions.find(p => p.id === d.id)!;
    assert.equal(d.origin[2], original.origin[2] + 12); assert.equal(d.size[2], original.size[2] - 12);
    assert.deepEqual(d.origin.slice(0, 2), original.origin.slice(0, 2)); assert.equal(d.position, original.position);
  }
  for (const rail of e.panels.filter(p => p.constructionPart === 'back')) assert.equal(rail.materialId, c.materials.carcass.stock.id);
  assert.deepEqual(next.compartments, c.compartments); noOverlapsAndEnclosed(next, e);
});

test('construction previews commit once, cancel cleanly and undo/redo restore the exact original interior', () => {
  const c = furnished(), store = new CabinetStore(c);
  const candidate = changeConstruction(c, modes(c, 'rails', 'rails'));
  store.preview(candidate); assert.deepEqual(store.getSnapshot().committed, c); assert.equal(store.getSnapshot().canUndo, false);
  store.cancel(); assert.deepEqual(store.getSnapshot().committed, c);
  store.preview(candidate); store.commit(); assert.deepEqual(store.getSnapshot().committed, candidate);
  store.undo(); assert.deepEqual(store.getSnapshot().committed, c); assert.equal(store.getSnapshot().canUndo, false);
  store.redo(); assert.deepEqual(evaluate(store.getSnapshot().committed), evaluate(candidate));
});

test('invalid rail dimensions, overlaps and dependent depth/height edits preserve the prior cabinet', () => {
  const c = furnished(), store = new CabinetStore(c), candidate = changeConstruction(c, modes(c, 'rails', 'rails'));
  store.preview(candidate);
  for (const bad of [NaN, Infinity, 19.9, 600.1, 80.05]) {
    assert.equal(store.commit(changeConstruction(c, { ...candidate.carcass, top: { ...candidate.carcass.top, frontDepth: bad } })), false);
    assert.deepEqual(store.getSnapshot().committed, c); assert.equal(store.getSnapshot().preview, null);
  }
  const overlap = changeConstruction(c, { ...candidate.carcass, top: { mode: 'rails', frontDepth: 300, rearDepth: 300 } });
  assert.equal(store.commit(overlap), false); assert.equal(store.getSnapshot().issueFeatureId, `${c.id}/construction/top`);
  const rearOverlap = changeConstruction(c, { ...candidate.carcass, back: { mode: 'rails', upperHeight: 400, lowerHeight: 400 } });
  assert.equal(store.commit(rearOverlap), false); assert.equal(store.getSnapshot().issueFeatureId, `${c.id}/construction/back`);
  store.commit(candidate); const last = store.getSnapshot().committed;
  assert.equal(store.commit(resize(last, 'depth', 170)), false);
  assert.deepEqual(store.getSnapshot().committed, last);
});

test('rail gap boundary is valid and inactive rail dimensions do not block the original small full-panel cabinet', () => {
  let c = createCabinet(); c = resize(resize(c, 'height', 216), 'depth', 180);
  const candidate = changeConstruction(c, modes(c, 'rails', 'rails'));
  assert.equal(evaluate(candidate).construction.topGap, 20); assert.equal(evaluate(candidate).construction.backGap, 20);
  noOverlapsAndEnclosed(candidate, evaluate(candidate));
  const small = resize(resize(createCabinet(), 'height', 120), 'depth', 100), store = new CabinetStore(small);
  assert.doesNotThrow(() => evaluate(small)); assert.equal(store.commit(changeConstruction(small, modes(small, 'rails', 'rails'))), false);
  const fitted = changeConstruction(small, { ...small.carcass, top: { mode: 'rails', frontDepth: 40, rearDepth: 40 }, back: { mode: 'rails', upperHeight: 30, lowerHeight: 30 } });
  noOverlapsAndEnclosed(fitted, evaluate(fitted));
});

test('returning to full panels retains dormant rail settings and restores interior depths and stable panel IDs', () => {
  const c = furnished(), initial = evaluate(c), railConfig = modes(c, 'rails', 'rails');
  railConfig.top.frontDepth = 95; railConfig.back.upperHeight = 125;
  const rails = changeConstruction(c, railConfig), restored = changeConstruction(rails, modes(rails, 'full', 'full'));
  assert.equal(restored.carcass.top.frontDepth, 95); assert.equal(restored.carcass.back.upperHeight, 125);
  assert.deepEqual(restored.compartments, c.compartments);
  assert.deepEqual(evaluate(restored).panels, initial.panels); assert.deepEqual(evaluate(restored).openings, initial.openings);
});

test('native schema 21 round trips every construction choice including dormant dimensions and interior identities', () => {
  const c = furnished();
  for (const top of ['full', 'rails'] as const) for (const back of ['full', 'rails'] as const) {
    const config = modes(c, top, back); config.top.frontDepth = 90; config.back.lowerHeight = 95;
    const next = changeConstruction(c, config), json = serialize(next), doc = JSON.parse(json);
    assert.equal(doc.schemaVersion, 48); assert.equal(doc.evaluatorRevision, 'rail-count-fit-48');
    assert.deepEqual(deserialize(json), next); assert.deepEqual(evaluate(deserialize(json)), evaluate(next));
  }
});

test('Stage 1 and Stage 2 migrations add full-panel defaults as copies without changing existing geometry or tree intent', () => {
  for (const version of [1, 2]) {
    const expected = version === 1 ? createCabinet() : furnished();
    const { banding, ...withoutBanding } = expected;
    const old = { ...withoutBanding, installation: { type: 'unassigned' }, materials: { carcass: expected.materials.carcass.stock, back: expected.materials.back.stock }, carcass: { construction: 'butt-full-top-inset-back', policyRevision: 'concept-1' } };
    const encoded = JSON.stringify({ format: 'cabinet-studio', schemaVersion: version, evaluatorRevision: version === 1 ? 'carcass-1' : 'interiors-2', cabinet: old });
    const result = deserializeWithInfo(encoded);
    assert.equal(result.migrated, true); assert.deepEqual(result.cabinet, expected);
    assert.deepEqual(evaluate(result.cabinet).panels, evaluate(expected).panels);
    assert.deepEqual(JSON.parse(encoded).cabinet, old);
  }
  assert.equal(PREVIOUS_AUTOSAVE_KEYS.includes(AUTOSAVE_KEY as any), false);
  assert.ok(PREVIOUS_AUTOSAVE_KEYS.includes('cabinet-studio.autosave.v2'));
});

test('unknown construction modes, policy revisions, malformed parameters and rail-ID collisions fail without replacement', () => {
  const c = furnished(), store = new CabinetStore(c);
  const mutations = [
    (d: any) => d.cabinet.carcass.top.mode = 'none',
    (d: any) => d.cabinet.carcass.back.mode = 'grooved',
    (d: any) => d.cabinet.carcass.policyRevision = 'construction-99',
    (d: any) => d.cabinet.carcass.top.frontDepth = '80',
    (d: any) => d.cabinet.carcass.back.lowerHeight = null,
    (d: any) => d.cabinet.carcass.top.extra = 1,
    (d: any) => delete d.cabinet.carcass.back,
    (d: any) => d.cabinet.compartments.featureId = `${c.id}/panel/top-rear-rail`,
    (d: any) => d.evaluatorRevision = 'construction-99',
    (d: any) => d.schemaVersion++
  ];
  for (const mutate of mutations) {
    const doc = JSON.parse(serialize(c)); mutate(doc);
    assert.throws(() => store.commit(deserialize(JSON.stringify(doc)))); assert.deepEqual(store.getSnapshot().committed, c);
  }
});
