import test from 'node:test';
import assert from 'node:assert/strict';
import { createCabinet, defaultBinding, defaultMounting, resize, type Cabinet } from '../src/domain/cabinet.ts';
import { changeMounting } from '../src/commands/mounting.ts';
import { changeInstallation } from '../src/commands/installation.ts';
import { addDivision } from '../src/commands/interiors.ts';
import { changeMaterial, setBanding } from '../src/commands/materials.ts';
import { CabinetStore } from '../src/commands/store.ts';
import { evaluate } from '../src/geometry/evaluate.ts';
import { deserialize, deserializeWithInfo, serialize, PREVIOUS_AUTOSAVE_KEYS, AUTOSAVE_KEY } from '../src/persistence/files.ts';
function furnished(): Cabinet {
  let c = createCabinet(); c.envelope.origin = [25, 40, -35];
  c.carcass.top = { ...c.carcass.top, mode: 'rails' }; c.carcass.back = { ...c.carcass.back, mode: 'rails' };
  c = addDivision(c, c.compartments.id, 'horizontal', 340).cabinet;
  c = addDivision(c, evaluate(c).openings[0].id, 'vertical', 280).cabinet;
  c = changeMaterial(c, 'interior', { ...defaultBinding({ id: 'generic-panel-16', revision: '1' }), finish: { id: 'oak-concept', revision: '1' }, grain: 'u' });
  c = changeInstallation(c, { ...c.installation, type: 'feet-concept', feet: { ...c.installation.feet, height: 120 }, plinth: { ...c.installation.plinth, enabled: true, leftReturn: true, rightReturn: true } });
  c = changeMaterial(c, 'plinth', defaultBinding({ id: 'generic-panel-16', revision: '1' }));
  for (const id of [evaluate(c).panels.find(p => p.role === 'shelf')!.id, `${c.id}/panel/plinth-front`]) c = setBanding(c, id, 'v-max', { id: 'generic-edge-2', revision: '1' });
  return c;
}
function disjoint(a: {size: number[]; center: number[]}, b: {size: number[]; center: number[]}) {
  return a.size.some((n, axis) => Math.min(a.center[axis] + n / 2, b.center[axis] + b.size[axis] / 2) - Math.max(a.center[axis] - n / 2, b.center[axis] - b.size[axis] / 2) < 1e-6);
}
test('wall restraint preserves every existing body, interior, material, band, foot and plinth placement', () => {
  const c = furnished(), before = evaluate(c), next = changeMounting(c, { ...defaultMounting(), mode: 'restraint-concept' }), e = evaluate(next);
  assert.deepEqual(e.panels, before.panels); assert.deepEqual(e.installation, before.installation); assert.deepEqual(e.openings, before.openings); assert.deepEqual(e.divisions, before.divisions);
  assert.deepEqual(next.envelope, c.envelope); assert.deepEqual(next.carcass, c.carcass); assert.deepEqual(next.compartments, c.compartments); assert.deepEqual(next.banding, c.banding); assert.deepEqual(next.materials, c.materials);
  assert.equal(e.mounting.parts.length, 3); assert.equal(e.mounting.mountingHeight, 780); assert.equal(e.mounting.wallZ, -65); assert.equal(e.installation.installedHeight, 840);
  assert.deepEqual(next.hardware, []); assert.ok(e.issues.some(i => i.code === 'provisional-mounting' && i.severity === 'notice'));
});
test('suspension retains dormant feet/plinth and all body intent while deriving a floor below the unchanged origin', () => {
  const c = furnished(), next = changeMounting(c, { ...defaultMounting(), mode: 'suspended-concept', floorClearance: 450 }), e = evaluate(next);
  assert.equal(next.installation.type, 'unassigned'); assert.deepEqual(next.installation.feet, c.installation.feet); assert.deepEqual(next.installation.plinth, c.installation.plinth);
  assert.deepEqual(next.banding, c.banding); assert.deepEqual(next.materials, c.materials); assert.deepEqual(next.envelope, c.envelope);
  assert.deepEqual(e.panels, evaluate(c).panels.filter(p => !p.installationPart)); assert.deepEqual(e.openings, evaluate(c).openings);
  assert.equal(e.installation.feet.length, 0); assert.equal(e.installation.plinthHeight, null); assert.equal(e.installation.floorY, -410); assert.equal(e.installation.installedHeight, 1170); assert.equal(e.mounting.mountingHeight, 1110);
  const disabled = changeMounting(next, { ...next.installation.mounting, mode: 'none' });
  const restored = changeInstallation(disabled, { ...disabled.installation, type: 'feet-concept' });
  assert.deepEqual(evaluate(restored).panels, evaluate(c).panels); assert.deepEqual(evaluate(restored).installation, evaluate(c).installation);
});
test('mounting envelopes meet at the wall/rail and stay behind body panels with stable identities across 48 combinations', () => {
  const original = furnished(), ids: string[][] = [];
  for (const width of [400, 600, 1000]) for (const top of ['full', 'rails'] as const) for (const back of ['full', 'rails'] as const) for (const wallGap of [15, 30, 60, 100]) {
    const c = structuredClone(original); c.envelope.width = width;
    // Use an empty opening to exercise the body range independently of stored interior positions.
    c.compartments = { id: `${c.id}/opening`, kind: 'opening', children: [] }; c.banding = {};
    c.carcass.top.mode = top; c.carcass.back.mode = back;
    const mounted = changeMounting(c, { ...defaultMounting(), mode: 'restraint-concept', wallGap }), e = evaluate(mounted), parts = e.mounting.parts;
    ids.push(parts.map(p => p.id));
    for (const part of parts) {
      assert.ok(part.center[2] + part.size[2] / 2 <= c.envelope.origin[2] + 1e-6);
      assert.ok(part.center[2] - part.size[2] / 2 >= e.mounting.wallZ! - 1e-6);
      assert.ok(part.center[0] - part.size[0] / 2 >= c.envelope.origin[0] - 1e-6);
      assert.ok(part.center[1] + part.size[1] / 2 <= c.envelope.origin[1] + c.envelope.height + 1e-6);
      for (const panel of e.panels) assert.ok(disjoint(part, panel));
      for (const foot of e.installation.feet) for (const shape of foot.parts) assert.ok(disjoint(part, shape));
    }
    for (let i=0;i<parts.length;i++) for(let j=i+1;j<parts.length;j++) assert.ok(disjoint(parts[i],parts[j]));
    const rail = parts[0]; assert.equal(rail.center[2] - rail.size[2]/2, e.mounting.wallZ);
    for (const bracket of parts.slice(1)) assert.ok(Math.abs(bracket.center[2] - bracket.size[2]/2 - (rail.center[2] + rail.size[2]/2)) < 1e-6);
  }
  for (const current of ids) assert.deepEqual(current, ids[0]);
});
test('invalid support combinations, wall gaps, offsets and body resizes reject the complete transaction', () => {
  const c = furnished(), store = new CabinetStore(c), m = { ...defaultMounting(), mode: 'restraint-concept' as const };
  for (const patch of [{ wallGap: 14.9 }, { wallGap: 101 }, { wallGap: NaN }, { topOffset: 24.9 }, { topOffset: 60.05 }, { sideInset: 290 }, { floorClearance: 2001 }]) {
    assert.equal(store.commit(changeMounting(c, { ...m, ...patch })), false); assert.equal(store.getSnapshot().issueFeatureId, `${c.id}/installation/mounting`); assert.deepEqual(store.getSnapshot().committed, c);
  }
  const mounted = changeMounting(c, m); store.commit(mounted);
  // Empty the opening so mounting fit, rather than the original contents, owns the rejection.
  const simple = { ...mounted, compartments: { id: `${c.id}/opening`, kind: 'opening' as const, children: [] as [] }, banding: {} };
  simple.carcass = { ...simple.carcass, back: { ...simple.carcass.back, mode: 'full' } };
  const small = resize(simple, 'height', 120); small.installation = { ...small.installation, mounting: { ...m, topOffset: 100 } };
  assert.equal(store.commit(small), false); assert.equal(store.getSnapshot().issueFeatureId, `${c.id}/installation/mounting`); assert.deepEqual(store.getSnapshot().committed, mounted);
  const unsupported = changeInstallation(c, { ...c.installation, type: 'unassigned', mounting: m }); assert.throws(() => evaluate(unsupported), /requires direct-floor/);
  const suspended = changeMounting(c, { ...m, mode: 'suspended-concept' });
  assert.throws(() => evaluate(changeInstallation(suspended, { ...suspended.installation, type: 'feet-concept' })), /requires unassigned/);
});
test('direct-floor restraint uses floor-relative height and disabled mounting keeps settings without geometry', () => {
  const c = createCabinet(); c.installation.type = 'floor';
  const m = { ...defaultMounting(), mode: 'restraint-concept' as const, topOffset: 80, wallGap: 45 };
  const mounted = changeMounting(c, m), e = evaluate(mounted); assert.equal(e.mounting.mountingHeight, 640); assert.equal(e.installation.installedHeight, 720);
  const off = changeMounting(mounted, { ...m, mode: 'none' }), saved = deserialize(serialize(off));
  assert.equal(evaluate(saved).mounting.parts.length, 0); assert.equal(evaluate(saved).mounting.wallZ, null); assert.equal(saved.installation.mounting.wallGap, 45);
  assert.deepEqual(evaluate(changeMounting(saved, m)), e);
});
test('mounting previews, cancellation, apply and Undo/Redo restore support transitions in one step', () => {
  const c = furnished(), store = new CabinetStore(c), next = changeMounting(c, { ...defaultMounting(), mode: 'suspended-concept' });
  store.preview(next); store.cancel(); assert.deepEqual(store.getSnapshot().committed, c); assert.equal(store.getSnapshot().canUndo, false);
  store.preview(next); store.commit(); store.undo(); assert.deepEqual(store.getSnapshot().committed, c); assert.equal(store.getSnapshot().canUndo, false);
  store.redo(); assert.deepEqual(evaluate(store.getSnapshot().committed), evaluate(next));
});
test('schema 21 round trips mounting modes including retained foot/plinth/material/edge settings and pinned revisions', () => {
  const c = furnished();
  for (const mode of ['none', 'restraint-concept', 'suspended-concept'] as const) {
    const next = changeMounting(c, { ...defaultMounting(), mode });
    const serialized = serialize(next), result = deserializeWithInfo(serialized);
    assert.equal(JSON.parse(serialized).schemaVersion, 38); assert.equal(JSON.parse(serialized).evaluatorRevision, 'notch-mouth-38'); assert.equal(result.migrated, false);
    assert.deepEqual(result.cabinet, next); assert.deepEqual(evaluate(result.cabinet), evaluate(next));
  }
});
test('schema 5 migration copies all feet, plinth, construction, interiors, materials and banding without changing geometry', () => {
  const expected = furnished(), old: any = structuredClone(expected); delete old.installation.mounting;
  const text = JSON.stringify({ format: 'cabinet-studio', schemaVersion: 5, evaluatorRevision: 'installation-5', cabinet: old });
  const result = deserializeWithInfo(text); assert.equal(result.migrated, true); assert.deepEqual(result.cabinet, expected);
  assert.deepEqual(evaluate(result.cabinet).panels, evaluate(expected).panels); assert.deepEqual(evaluate(result.cabinet).installation, evaluate(expected).installation);
  assert.equal(JSON.parse(text).cabinet.installation.mounting, undefined); assert.ok(PREVIOUS_AUTOSAVE_KEYS.includes('cabinet-studio.autosave.v5')); assert.equal(AUTOSAVE_KEY, 'cabinet-studio.autosave.v38');
});
test('unknown mounting revisions, malformed data, invented hardware and reserved part identities fail without replacing current state', () => {
  const c = furnished(), store = new CabinetStore(c);
  const mutations = [
    (d: any) => d.cabinet.installation.mounting.mode = 'verified-wall',
    (d: any) => d.cabinet.installation.mounting.geometry.id = 'unverified-product',
    (d: any) => d.cabinet.installation.mounting.geometry.revision = '2',
    (d: any) => d.cabinet.installation.mounting.policyRevision = 'mounting-2',
    (d: any) => d.cabinet.installation.mounting.wallGap = '30',
    (d: any) => delete d.cabinet.installation.mounting,
    (d: any) => d.cabinet.installation.mounting.extra = true,
    (d: any) => d.cabinet.compartments.featureId = `${c.id}/installation/mounting/rail`,
    (d: any) => d.cabinet.compartments.id = `${c.id}/installation/mounting`,
    (d: any) => d.cabinet.hardware.push({ id: 'hanger', revision: '1' }),
    (d: any) => d.schemaVersion++
  ];
  for (const mutate of mutations) { const doc = JSON.parse(serialize(c)); mutate(doc); assert.throws(() => store.commit(deserialize(JSON.stringify(doc)))); assert.deepEqual(store.getSnapshot().committed, c); }
});
