import test from 'node:test';
import assert from 'node:assert/strict';
import { createCabinet, defaultBinding, type Cabinet, type MaterialBinding } from '../src/domain/cabinet.ts';
import { stock } from '../src/catalogue/materials.ts';
import { changeMaterial, setBanding } from '../src/commands/materials.ts';
import { addDivision, duplicateDivision, removeDivision } from '../src/commands/interiors.ts';
import { changeConstruction } from '../src/commands/construction.ts';
import { CabinetStore } from '../src/commands/store.ts';
import { evaluate, type Panel } from '../src/geometry/evaluate.ts';
import { deserialize, deserializeWithInfo, serialize, AUTOSAVE_KEY, PREVIOUS_AUTOSAVE_KEYS } from '../src/persistence/files.ts';
const pin = (id: string) => ({ id, revision: '1' });
const binding = (id: string): MaterialBinding => defaultBinding(pin(id));
function furnished(rails = true) {
  let c = createCabinet(); c.envelope.origin = [35, -10, 20];
  c = addDivision(c, c.compartments.id, 'vertical', 282).cabinet;
  c = addDivision(c, evaluate(c).openings[0].id, 'horizontal', 342).cabinet;
  if (rails) c = changeConstruction(c, { ...c.carcass, top: { mode: 'rails', frontDepth: 100, rearDepth: 60 }, back: { mode: 'rails', upperHeight: 90, lowerHeight: 70 } });
  return c;
}
const shapes = (c: Cabinet) => evaluate(c).panels.map(({ id, size, center, orientation }) => ({ id, size, center, orientation }));
function noOverlap(a: { size: number[]; center: number[] }, b: { size: number[]; center: number[] }) {
  return a.size.some((n, i) => Math.min(a.center[i] + n / 2, b.center[i] + b.size[i] / 2) - Math.max(a.center[i] - n / 2, b.center[i] - b.size[i] / 2) < 1e-6);
}
function coreAndStripsFillPanel(p: Panel) {
  const pieces = [{ size: p.coreSize, center: p.coreCenter }, ...p.edges.filter(e => e.product)];
  const volume = (s: number[]) => s.reduce((a, b) => a * b, 1);
  assert.ok(Math.abs(pieces.reduce((sum, piece) => sum + volume(piece.size), 0) - volume(p.size)) < 1e-5);
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]; assert.ok(piece.size.every(n => n > 0));
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(piece.center[axis] - piece.size[axis] / 2 >= p.center[axis] - p.size[axis] / 2 - 1e-6);
      assert.ok(piece.center[axis] + piece.size[axis] / 2 <= p.center[axis] + p.size[axis] / 2 + 1e-6);
    }
    for (let j = i + 1; j < pieces.length; j++) assert.ok(noOverlap(piece, pieces[j]));
  }
}

test('carcass stock thickness updates rails and inherited interiors without rewriting construction or compartment intent', () => {
  const c = furnished(), next = changeMaterial(c, 'carcass', binding('generic-panel-22')), e = evaluate(next);
  assert.deepEqual(next.carcass, c.carcass); assert.deepEqual(next.compartments, c.compartments); assert.equal(next.materials.interior, null);
  assert.equal(e.opening.size[0], 556); assert.equal(e.opening.size[1], 676); assert.equal(e.opening.size[2], 538);
  assert.equal(e.panels.find(p => p.role === 'left')!.size[0], 22);
  assert.equal(e.panels.find(p => p.role === 'top-front-rail')!.size[1], 22);
  assert.equal(e.panels.find(p => p.role === 'back-upper-rail')!.size[2], 22);
  assert.equal(e.panels.find(p => p.role === 'shelf')!.size[1], 22);
  assert.deepEqual(e.divisions.map(d => [d.id, d.position]), evaluate(c).divisions.map(d => [d.id, d.position]));
});

test('interior override independently controls fixed shelf/divider thickness and inherit removes it explicitly', () => {
  const c = changeMaterial(furnished(), 'carcass', binding('generic-panel-22'));
  const next = changeMaterial(c, 'interior', binding('generic-panel-16')), e = evaluate(next);
  assert.equal(e.panels.find(p => p.role === 'shelf')!.size[1], 16); assert.equal(e.panels.find(p => p.role === 'divider')!.size[0], 16);
  assert.equal(e.panels.find(p => p.role === 'left')!.size[0], 22);
  assert.equal(stock(next, 'interior').thickness, 16);
  const inherited = changeMaterial(next, 'interior', null); assert.equal(inherited.materials.interior, null); assert.equal(stock(inherited, 'interior').thickness, 22);
  assert.throws(() => changeMaterial(next, 'carcass', null));
});

test('back stock affects full backs and is retained independently while rear rails use carcass stock', () => {
  const c = furnished(), changed = changeMaterial(c, 'back', binding('generic-back-12'));
  assert.equal(evaluate(changed).opening.size[2], 542);
  const full = changeConstruction(changed, { ...changed.carcass, back: { ...changed.carcass.back, mode: 'full' } });
  assert.equal(evaluate(full).opening.size[2], 548); assert.equal(evaluate(full).panels.find(p => p.role === 'back')!.size[2], 12);
  assert.equal(full.materials.back.stock.id, 'generic-back-12'); assert.deepEqual(full.compartments, c.compartments);
});

test('finish and grain are pinned intent and never alter construction geometry', () => {
  const c = furnished(), finish = { ...c.materials.carcass, finish: pin('oak-concept'), grain: 'u' as const };
  const next = changeMaterial(c, 'carcass', finish);
  assert.deepEqual(shapes(next), shapes(c)); assert.deepEqual(next.carcass, c.carcass); assert.deepEqual(next.compartments, c.compartments);
  const p = evaluate(next).panels.find(p => p.role === 'shelf')!;
  assert.deepEqual(p.finish, pin('oak-concept')); assert.equal(p.grain, 'u'); assert.equal(p.materialRevision, '1');
});

test('banding front edges respects panel orientation and preserves finished sizes while deriving the board core', () => {
  const c = furnished(), panels = evaluate(c).panels;
  for (const panel of panels.filter(p => ['left', 'bottom', 'shelf', 'divider'].includes(p.role))) {
    const front = panel.edges.find(e => e.label === 'Front')!; assert.ok(front);
    const next = setBanding(c, panel.id, front.key, pin('generic-edge-2')), e = evaluate(next), banded = e.panels.find(p => p.id === panel.id)!;
    assert.deepEqual(shapes(next), shapes(c)); assert.equal(banded.coreSize[2], panel.size[2] - 2);
    assert.equal(banded.edges.find(e => e.key === front.key)!.thickness, 2); coreAndStripsFillPanel(banded);
  }
});

test('four mixed edge bands partition the finished envelope without overlap in every panel orientation', () => {
  const c = furnished();
  for (const panel of evaluate(c).panels) {
    let next = c;
    for (const [i, edge] of panel.edges.entries()) next = setBanding(next, panel.id, edge.key, pin(i % 2 ? 'generic-edge-0.8' : 'generic-edge-2'));
    const banded = evaluate(next).panels.find(p => p.id === panel.id)!;
    assert.equal(banded.edges.filter(e => e.product).length, 4); coreAndStripsFillPanel(banded);
    assert.deepEqual(next.compartments, c.compartments); assert.deepEqual(next.carcass, c.carcass);
  }
});

test('banding settings on inactive full panels and rails survive construction switches and native saves', () => {
  let c = furnished(false); const fullTop = evaluate(c).panels.find(p => p.role === 'top')!;
  c = setBanding(c, fullTop.id, 'v-max', pin('generic-edge-1'));
  const rails = changeConstruction(c, { ...c.carcass, top: { ...c.carcass.top, mode: 'rails' } });
  assert.deepEqual(rails.banding, c.banding); assert.equal(evaluate(rails).panels.some(p => p.id === fullTop.id), false);
  const restored = changeConstruction(deserialize(serialize(rails)), c.carcass);
  assert.deepEqual(evaluate(restored).panels.find(p => p.id === fullTop.id), evaluate(c).panels.find(p => p.id === fullTop.id));
});

test('duplicate copies edge intent to new identity; leaf removal clears its bands and Undo restores them', () => {
  let c = furnished(), shelf = evaluate(c).panels.find(p => p.role === 'shelf')!;
  c = setBanding(c, shelf.id, 'v-max', pin('generic-edge-1'));
  const copy = duplicateDivision(c, shelf.id), store = new CabinetStore(copy.cabinet);
  assert.notEqual(copy.featureId, shelf.id); assert.deepEqual(copy.cabinet.banding[copy.featureId], c.banding[shelf.id]);
  store.commit(removeDivision(copy.cabinet, copy.featureId)); assert.equal(store.getSnapshot().committed.banding[copy.featureId], undefined);
  assert.deepEqual(store.getSnapshot().committed.banding[shelf.id], c.banding[shelf.id]);
  store.undo(); assert.deepEqual(store.getSnapshot().committed, copy.cabinet);
});

test('invalid thickness dependency preserves the old material binding and complete interior', () => {
  let c = createCabinet(); c = addDivision(c, c.compartments.id, 'horizontal', 69).cabinet;
  const store = new CabinetStore(c), candidate = changeMaterial(c, 'interior', binding('generic-panel-22'));
  assert.equal(store.commit(candidate), false); assert.match(store.getSnapshot().error!, /60 mm clear/);
  assert.deepEqual(store.getSnapshot().committed, c); assert.equal(store.getSnapshot().canUndo, false);
});

test('material and banding previews can be cancelled and applied as one undoable transaction', () => {
  const c = furnished(), shelf = evaluate(c).panels.find(p => p.role === 'shelf')!, store = new CabinetStore(c);
  let candidate = changeMaterial(c, 'interior', binding('generic-panel-16')); candidate = setBanding(candidate, shelf.id, 'v-max', pin('generic-edge-0.8'));
  store.preview(candidate); assert.deepEqual(store.getSnapshot().committed, c); store.cancel(); assert.equal(store.getSnapshot().canUndo, false);
  store.preview(candidate); store.commit(); store.undo(); assert.deepEqual(store.getSnapshot().committed, c);
  store.redo(); assert.deepEqual(store.getSnapshot().committed, candidate);
});

test('schema 17 preserves stock/finish/grain pins, inheritance, dormant settings and all core/band geometry', () => {
  let c = furnished(), panel = evaluate(c).panels.find(p => p.role === 'shelf')!;
  c = changeMaterial(c, 'interior', { ...binding('generic-panel-16'), finish: pin('white-concept'), grain: 'v' });
  c = setBanding(c, panel.id, 'v-max', pin('generic-edge-2'));
  c = setBanding(c, `${c.id}/panel/back`, 'u-min', pin('generic-edge-1'));
  const text = serialize(c); assert.equal(JSON.parse(text).schemaVersion, 17);
  const reopened = deserialize(text); assert.deepEqual(reopened, c); assert.deepEqual(evaluate(reopened), evaluate(c));
});

test('schema 3 migration retains exact top/back choices and nested intent and adds inherited defaults without changing finished geometry', () => {
  const expected = furnished(), { banding, ...withoutBanding } = expected;
  const old = { ...withoutBanding, installation: { type: 'unassigned' }, materials: { carcass: expected.materials.carcass.stock, back: expected.materials.back.stock } };
  const encoded = JSON.stringify({ format: 'cabinet-studio', schemaVersion: 3, evaluatorRevision: 'construction-3', cabinet: old });
  const result = deserializeWithInfo(encoded);
  assert.equal(result.migrated, true); assert.deepEqual(result.cabinet, expected); assert.deepEqual(shapes(result.cabinet), shapes(expected));
  assert.deepEqual(JSON.parse(encoded).cabinet, old); assert.ok(!PREVIOUS_AUTOSAVE_KEYS.includes(AUTOSAVE_KEY as any));
});

test('unknown material, finish and band revisions, orphan panel settings and malformed data never replace the current cabinet', () => {
  const c = furnished(), shelf = evaluate(c).panels.find(p => p.role === 'shelf')!, store = new CabinetStore(c);
  for (const candidate of [
    changeMaterial(c, 'carcass', { ...binding('generic-panel-18'), stock: { id: 'generic-panel-18', revision: '99' } }),
    changeMaterial(c, 'back', binding('generic-panel-18')),
    changeMaterial(c, 'carcass', { ...binding('generic-panel-18'), finish: pin('unknown-finish') }),
    setBanding(c, shelf.id, 'v-max', pin('unknown-band')),
    setBanding(c, 'unknown-panel', 'v-max', pin('generic-edge-1'))
  ]) { assert.equal(store.commit(candidate), false); assert.deepEqual(store.getSnapshot().committed, c); }
  const mutations = [
    (d: any) => d.cabinet.materials.interior = 'inherit',
    (d: any) => d.cabinet.materials.carcass.grain = 'diagonal',
    (d: any) => d.cabinet.materials.carcass.finish.revision = 'future',
    (d: any) => d.cabinet.banding[shelf.id] = { front: pin('generic-edge-1') },
    (d: any) => d.cabinet.banding[shelf.id] = { 'v-max': { id: 'generic-edge-1', revision: 'future' } },
    (d: any) => d.cabinet.compartments.featureId = '__proto__',
    (d: any) => d.schemaVersion = 18
  ];
  for (const mutate of mutations) { const doc = JSON.parse(serialize(c)); mutate(doc); assert.throws(() => deserialize(JSON.stringify(doc))); }
});

test('mixed material roles remain enclosed and non-overlapping for all 192 stock/construction combinations', () => {
  const base = furnished(false);
  for (const carcass of [16, 18, 19, 22]) for (const interior of [16, 18, 19, 22]) for (const back of [6, 9, 12]) for (const topMode of ['full', 'rails'] as const) for (const backMode of ['full', 'rails'] as const) {
    let c = changeMaterial(base, 'carcass', binding(`generic-panel-${carcass}`));
    c = changeMaterial(c, 'interior', binding(`generic-panel-${interior}`)); c = changeMaterial(c, 'back', binding(`generic-back-${back}`));
    c = changeConstruction(c, { ...c.carcass, top: { ...c.carcass.top, mode: topMode }, back: { ...c.carcass.back, mode: backMode } });
    const e = evaluate(c); assert.deepEqual(c.compartments, base.compartments);
    for (let i = 0; i < e.panels.length; i++) {
      const panel = e.panels[i]; coreAndStripsFillPanel(panel);
      for (let axis = 0; axis < 3; axis++) {
        assert.ok(panel.center[axis] - panel.size[axis] / 2 >= c.envelope.origin[axis] - 1e-6);
        assert.ok(panel.center[axis] + panel.size[axis] / 2 <= c.envelope.origin[axis] + [c.envelope.width, c.envelope.height, c.envelope.depth][axis] + 1e-6);
      }
      for (let j = i + 1; j < e.panels.length; j++) assert.ok(noOverlap(panel, e.panels[j]));
    }
  }
});
