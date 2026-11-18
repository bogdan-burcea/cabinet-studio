import test from 'node:test';
import assert from 'node:assert/strict';
import { createCabinet, resize } from '../src/domain/cabinet.ts';
import { evaluate } from '../src/geometry/evaluate.ts';
import { CabinetStore } from '../src/commands/store.ts';
import { serialize, deserialize } from '../src/persistence/files.ts';
import { dimensionLimits } from '../src/rules/validate.ts';

test('canonical panels enclose an opening without overlapping at representative and boundary dimensions', () => {
  for (const width of [120, 600, 2400]) for (const height of [120, 720, 3000]) for (const depth of [100, 560, 1200]) {
    const c = createCabinet(); c.envelope = { width, height, depth, origin: [10, 20, 30] };
    const result = evaluate(c);
    assert.deepEqual(result.opening.size, [width - 36, height - 36, depth - 6]);
    assert.deepEqual(result.opening.origin, [28, 38, 36]);
    assert.equal(new Set(result.panels.map(p => p.id)).size, 5);
    for (const a of result.panels) {
      assert.ok(a.size.every(n => n > 0));
      for (let axis = 0; axis < 3; axis++) {
        assert.ok(a.center[axis] - a.size[axis] / 2 >= c.envelope.origin[axis]);
        assert.ok(a.center[axis] + a.size[axis] / 2 <= c.envelope.origin[axis] + [width, height, depth][axis]);
      }
      for (const b of result.panels.filter(p => p.id !== a.id)) {
        const overlap = a.size.map((size, axis) => Math.min(a.center[axis] + size / 2, b.center[axis] + b.size[axis] / 2) - Math.max(a.center[axis] - size / 2, b.center[axis] - b.size[axis] / 2));
        assert.ok(overlap.some(n => n <= 0), `${a.role} intersects ${b.role}`);
      }
    }
  }
});

test('preview updates do not mutate intent and a drag commits exactly one history step', () => {
  const original = createCabinet(), store = new CabinetStore(original);
  for (const n of [610, 620, 660, 690, 700]) store.preview(resize(original, 'width', n));
  assert.equal(store.getSnapshot().committed.envelope.width, 600);
  assert.equal(store.getSnapshot().preview!.envelope.width, 700);
  assert.equal(store.getSnapshot().canUndo, false);
  store.commit(); assert.equal(store.getSnapshot().committed.envelope.width, 700);
  store.undo(); assert.deepEqual(store.getSnapshot().committed, original);
  assert.equal(store.getSnapshot().canUndo, false);
  store.redo(); assert.equal(store.getSnapshot().committed.envelope.width, 700);
});

test('numeric and drag edits share evaluation and retain stable panel identities', () => {
  const original = createCabinet(), numeric = new CabinetStore(original), drag = new CabinetStore(original);
  numeric.commit(resize(original, 'depth', 487.5));
  drag.preview(resize(original, 'depth', 480)); drag.preview(resize(original, 'depth', 487.5)); drag.commit();
  assert.deepEqual(evaluate(numeric.getSnapshot().committed), evaluate(drag.getSnapshot().committed));
  assert.deepEqual(evaluate(original).panels.map(p => p.id), evaluate(numeric.getSnapshot().committed).panels.map(p => p.id));
});

test('invalid edits cannot commit a prior ghost and cancel leaves history untouched', () => {
  const original = createCabinet(), store = new CabinetStore(original);
  store.preview(resize(original, 'width', 700));
  assert.equal(store.preview(resize(original, 'width', 20)), false);
  assert.equal(store.commit(), false);
  assert.deepEqual(store.getSnapshot().committed, original);
  assert.ok(store.getSnapshot().error);
  store.cancel(); assert.equal(store.getSnapshot().error, null);
  assert.equal(store.getSnapshot().canUndo, false);
  for (const axis of ['width', 'height', 'depth'] as const) {
    for (const value of [NaN, Infinity, dimensionLimits[axis].min - .1, dimensionLimits[axis].max + .1, 200.123]) {
      assert.equal(store.commit(resize(original, axis, value)), false);
      assert.deepEqual(store.getSnapshot().committed, original);
    }
  }
});

test('branching edit clears redo, while no-op commits preserve it', () => {
  const original = createCabinet(), store = new CabinetStore(original);
  store.commit(resize(original, 'height', 800)); store.undo();
  store.commit(original); assert.equal(store.getSnapshot().canRedo, true);
  store.commit(resize(original, 'height', 900)); assert.equal(store.getSnapshot().canRedo, false);
});

test('portable round trip preserves intent, pinned revisions, identities and evaluated geometry', () => {
  const c = resize(createCabinet(), 'height', 1850.5); c.name = 'Studio cabinet';
  const reopened = deserialize(serialize(c));
  assert.deepEqual(reopened, c); assert.deepEqual(evaluate(reopened), evaluate(c));
  reopened.envelope.width = 800; assert.equal(c.envelope.width, 600);
});

test('unsupported versions, product revisions, layouts and malformed data fail without changing the current cabinet', () => {
  const c = createCabinet(), store = new CabinetStore(c);
  const variants = [
    (d: any) => d.schemaVersion = 99,
    (d: any) => d.evaluatorRevision = 'carcass-99',
    (d: any) => d.cabinet.materials.carcass.stock.revision = 'future',
    (d: any) => d.cabinet.materials.carcass.stock.id = 'generic-back-6',
    (d: any) => d.cabinet.hardware.push({ id: 'unknown', revision: '1' }),
    (d: any) => d.cabinet.fronts.push({ id: 'door' }),
    (d: any) => d.cabinet.envelope.width = '600',
    (d: any) => d.cabinet.envelope.origin = [null, 0, 0],
    (d: any) => d.cabinet.compartments.children.push({}),
    (d: any) => d.cabinet.carcass.joinery = 'unknown'
  ];
  for (const mutate of variants) {
    const doc = JSON.parse(serialize(c)); mutate(doc);
    assert.throws(() => { store.commit(deserialize(JSON.stringify(doc))); });
    assert.deepEqual(store.getSnapshot().committed, c); assert.equal(store.getSnapshot().canUndo, false);
  }
  assert.throws(() => deserialize('{truncated'));
});

test('loading a different cabinet is one undoable transaction', () => {
  const original = createCabinet(), store = new CabinetStore(original), next = resize(createCabinet(), 'width', 850);
  store.commit(deserialize(serialize(next))); assert.deepEqual(store.getSnapshot().committed, next);
  store.undo(); assert.deepEqual(store.getSnapshot().committed, original);
  store.redo(); assert.deepEqual(store.getSnapshot().committed, next);
});
