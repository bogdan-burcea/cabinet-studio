import test from 'node:test';
import assert from 'node:assert/strict';
import { createCabinet, defaultBinding, resize, type Cabinet, type Installation } from '../src/domain/cabinet.ts';
import { addDivision } from '../src/commands/interiors.ts';
import { changeConstruction } from '../src/commands/construction.ts';
import { changeMaterial, setBanding } from '../src/commands/materials.ts';
import { changeInstallation } from '../src/commands/installation.ts';
import { CabinetStore } from '../src/commands/store.ts';
import { evaluate } from '../src/geometry/evaluate.ts';
import { deserialize, deserializeWithInfo, serialize, AUTOSAVE_KEY, PREVIOUS_AUTOSAVE_KEYS } from '../src/persistence/files.ts';
const pin = (id: string) => ({ id, revision: '1' });
function furnished(): Cabinet {
  let c = createCabinet(); c.envelope.origin = [20, 45, -30];
  c = changeConstruction(c, { ...c.carcass, top: { mode: 'rails', frontDepth: 100, rearDepth: 60 }, back: { mode: 'rails', upperHeight: 90, lowerHeight: 70 } });
  c = addDivision(c, c.compartments.id, 'vertical', 282).cabinet;
  c = addDivision(c, evaluate(c).openings[0].id, 'horizontal', 342).cabinet;
  c = changeMaterial(c, 'interior', { ...defaultBinding(pin('generic-panel-16')), finish: pin('oak-concept'), grain: 'u' });
  return setBanding(c, evaluate(c).panels.find(p => p.role === 'shelf')!.id, 'v-max', pin('generic-edge-2'));
}
function feet(c: Cabinet, plinth = false): Installation {
  return { ...c.installation, type: 'feet-concept', plinth: { ...c.installation.plinth, enabled: plinth, leftReturn: plinth, rightReturn: plinth } };
}
function disjoint(a: { size: number[]; center: number[] }, b: { size: number[]; center: number[] }) {
  return a.size.some((n, axis) => Math.min(a.center[axis] + n / 2, b.center[axis] + b.size[axis] / 2) - Math.max(a.center[axis] - n / 2, b.center[axis] - b.size[axis] / 2) < 1e-6);
}

test('feet leave the complete existing body, interiors, material bindings and banding unchanged', () => {
  const c = furnished(), before = evaluate(c), next = changeInstallation(c, feet(c)), e = evaluate(next);
  assert.deepEqual(next.envelope, c.envelope); assert.deepEqual(next.carcass, c.carcass); assert.deepEqual(next.compartments, c.compartments);
  assert.deepEqual(next.materials, c.materials); assert.deepEqual(next.banding, c.banding); assert.deepEqual(e.panels, before.panels);
  assert.deepEqual(e.openings, before.openings); assert.deepEqual(e.divisions, before.divisions);
  assert.equal(e.installation.feet.length, 4); assert.equal(e.installation.floorY, -55); assert.equal(e.installation.installedHeight, 820);
  assert.deepEqual(next.hardware, []); assert.ok(e.issues.some(i => i.code === 'provisional-support' && i.severity === 'notice'));
});

test('unassigned/direct-floor/feet modes distinguish body and installed height without moving the body origin', () => {
  const c = furnished(); assert.equal(evaluate(c).installation.installedHeight, null);
  const footLayout = feet(c, true); footLayout.feet.height = 150;
  const supported = changeInstallation(c, footLayout); assert.equal(evaluate(supported).installation.installedHeight, 870);
  const floor = changeInstallation(supported, { ...supported.installation, type: 'floor' });
  assert.equal(evaluate(floor).installation.installedHeight, 720); assert.equal(evaluate(floor).installation.floorY, 45);
  assert.equal(evaluate(floor).installation.feet.length, 0); assert.equal(evaluate(floor).installation.panels.length, 0);
  assert.equal(floor.installation.feet.height, 150); assert.equal(floor.installation.plinth.enabled, true);
  assert.deepEqual(evaluate(changeInstallation(floor, footLayout)), evaluate(supported));
});

test('foot primitives sit below the body, contact the floor and preserve semantic IDs through height/setback edits', () => {
  const c = furnished(), initial = changeInstallation(c, feet(c)), e = evaluate(initial);
  const moved = changeInstallation(initial, { ...initial.installation, feet: { ...initial.installation.feet, height: 160, sideInset: 80, frontInset: 130 } });
  const after = evaluate(moved);
  assert.deepEqual(after.installation.feet.map(f => f.id), e.installation.feet.map(f => f.id));
  for (const foot of after.installation.feet) for (const part of foot.parts) {
    assert.ok(part.center[1] + part.size[1] / 2 <= c.envelope.origin[1] + 1e-6);
    assert.ok(part.center[1] - part.size[1] / 2 >= after.installation.floorY - 1e-6);
    if (part.kind === 'base') assert.equal(part.center[1] - part.size[1] / 2, after.installation.floorY);
    if (part.kind === 'plate') assert.equal(part.center[1] + part.size[1] / 2, c.envelope.origin[1]);
  }
});

test('front plinth and side returns are separate canonical panels with real material/banding and preserved body geometry', () => {
  const c = furnished(), supported = changeInstallation(c, feet(c, true));
  let next = changeMaterial(supported, 'plinth', { ...defaultBinding(pin('generic-panel-19')), finish: pin('white-concept'), grain: 'v' });
  next = setBanding(next, `${c.id}/panel/plinth-front`, 'v-max', pin('generic-edge-1'));
  const e = evaluate(next), front = e.panels.find(p => p.role === 'plinth-front')!;
  assert.equal(e.installation.panels.length, 3); assert.equal(e.installation.plinthHeight, 95);
  assert.deepEqual(front.size, [600, 95, 19]); assert.deepEqual(front.coreSize, [600, 94, 19]);
  assert.equal(front.materialId, 'generic-panel-19'); assert.deepEqual(front.finish, pin('white-concept')); assert.equal(front.grain, 'v');
  assert.deepEqual(next.materials, c.materials); assert.deepEqual(e.panels.filter(p => !p.installationPart), evaluate(c).panels);
  const inherited = changeMaterial(next, 'plinth', null); assert.equal(evaluate(inherited).panels.find(p => p.role === 'plinth-front')!.size[2], 18);
});

test('plinth geometry and foot envelopes are disjoint across stock, height and return combinations', () => {
  const original = furnished();
  for (const stock of [16, 18, 19, 22]) for (const height of [70, 100, 200]) for (const leftReturn of [false, true]) for (const rightReturn of [false, true]) {
    const layout = feet(original, true); layout.feet.height = height; layout.plinth.leftReturn = leftReturn; layout.plinth.rightReturn = rightReturn;
    let c = changeInstallation(original, layout); c = changeMaterial(c, 'plinth', defaultBinding(pin(`generic-panel-${stock}`)));
    const e = evaluate(c), parts = [...e.panels, ...e.installation.feet.flatMap(f => f.parts)];
    assert.equal(e.installation.panels.length, 1 + Number(leftReturn) + Number(rightReturn));
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) assert.ok(disjoint(parts[i], parts[j]), `Overlap at ${stock}/${height}/${leftReturn}/${rightReturn}`);
  }
});

test('plinth top/floor gaps derive height and never change the installed/body height', () => {
  const c = furnished(), layout = feet(c, true); layout.plinth.topGap = 10; layout.plinth.bottomGap = 7;
  const e = evaluate(changeInstallation(c, layout)); assert.equal(e.installation.plinthHeight, 83); assert.equal(e.installation.installedHeight, 820);
  const front = e.panels.find(p => p.role === 'plinth-front')!;
  assert.equal(front.center[1] - front.size[1] / 2, e.installation.floorY + 7);
  assert.equal(front.center[1] + front.size[1] / 2, c.envelope.origin[1] - 10);
});

test('invalid foot positions, heights and dependent body resizes retain the prior complete cabinet', () => {
  const c = furnished(), store = new CabinetStore(c);
  const candidates = [
    { ...feet(c), feet: { ...c.installation.feet, height: 4.9 } },
    { ...feet(c), feet: { ...c.installation.feet, sideInset: 290 } },
    { ...feet(c), feet: { ...c.installation.feet, frontInset: 480 } },
    { ...feet(c), feet: { ...c.installation.feet, height: NaN } },
    { ...feet(c), feet: { ...c.installation.feet, height: 100.05 } }
  ];
  for (const candidate of candidates) { assert.equal(store.commit(changeInstallation(c, candidate)), false); assert.deepEqual(store.getSnapshot().committed, c); }
  const installed = changeInstallation(c, feet(c)); store.commit(installed);
  assert.equal(store.commit(resize(installed, 'width', 160)), false); assert.deepEqual(store.getSnapshot().committed, installed);
});

test('plinth collisions identify the owning feature and can be corrected without silently moving feet or changing stock', () => {
  const c = furnished(), store = new CabinetStore(c), layout = feet(c, true); layout.plinth.frontSetback = 80;
  assert.equal(store.commit(changeInstallation(c, layout)), false); assert.equal(store.getSnapshot().issueFeatureId, `${c.id}/installation/plinth`);
  assert.match(store.getSnapshot().error!, /foot envelope/); assert.deepEqual(store.getSnapshot().committed, c);
  layout.feet.frontInset = 140; assert.equal(store.commit(changeInstallation(c, layout)), true);
  const fitted = store.getSnapshot().committed;
  const sideConflict = { ...fitted.installation, feet: { ...fitted.installation.feet, sideInset: 40 } };
  assert.equal(store.commit(changeInstallation(fitted, sideConflict)), false); assert.deepEqual(store.getSnapshot().committed, fitted);
});

test('a material change that collides with feet is rejected by the shared transaction path', () => {
  const c = furnished(), layout = feet(c, true); layout.feet.frontInset = 113;
  const installed = changeInstallation(c, layout), store = new CabinetStore(installed);
  assert.equal(store.commit(changeMaterial(installed, 'plinth', defaultBinding(pin('generic-panel-22')))), false);
  assert.equal(store.getSnapshot().issueFeatureId, `${c.id}/installation/plinth`); assert.deepEqual(store.getSnapshot().committed, installed);
});

test('installation previews cancel and apply as one Undo/Redo step including every original material and edge setting', () => {
  const c = furnished(), store = new CabinetStore(c), next = changeInstallation(c, feet(c, true));
  store.preview(next); store.cancel(); assert.equal(store.getSnapshot().canUndo, false); assert.deepEqual(store.getSnapshot().committed, c);
  store.preview(next); store.commit(); store.undo(); assert.deepEqual(store.getSnapshot().committed, c); assert.equal(store.getSnapshot().canUndo, false);
  store.redo(); assert.deepEqual(evaluate(store.getSnapshot().committed), evaluate(next));
});

test('switching support modes or disabling returns retains dormant plinth material and banding for later restoration', () => {
  const c = furnished(); let next = changeInstallation(c, feet(c, true));
  next = changeMaterial(next, 'plinth', defaultBinding(pin('generic-panel-16')));
  next = setBanding(next, `${c.id}/panel/plinth-left`, 'v-max', pin('generic-edge-2'));
  const floor = changeInstallation(next, { ...next.installation, type: 'floor' });
  assert.equal(evaluate(floor).panels.some(p => p.installationPart), false); assert.deepEqual(floor.banding, next.banding);
  const restored = changeInstallation(deserialize(serialize(floor)), next.installation);
  assert.deepEqual(evaluate(restored), evaluate(next));
});

test('schema 21 round trip pins support geometry, plinth binding and every existing cabinet feature', () => {
  const c = furnished(); let next = changeInstallation(c, feet(c, true));
  next = setBanding(next, `${c.id}/panel/plinth-front`, 'u-max', pin('generic-edge-0.8'));
  const json = serialize(next); assert.equal(JSON.parse(json).schemaVersion, 38); assert.equal(JSON.parse(json).evaluatorRevision, 'notch-mouth-38');
  assert.deepEqual(deserialize(json), next); assert.deepEqual(evaluate(deserialize(json)), evaluate(next));
});

test('schema 4 migration preserves construction, all interiors/materials/banding and every existing panel while leaving support unassigned', () => {
  const expected = furnished(), old = { ...expected, installation: { type: 'unassigned' } };
  const text = JSON.stringify({ format: 'cabinet-studio', schemaVersion: 4, evaluatorRevision: 'materials-4', cabinet: old });
  const result = deserializeWithInfo(text);
  assert.equal(result.migrated, true); assert.deepEqual(result.cabinet, expected); assert.deepEqual(evaluate(result.cabinet).panels, evaluate(expected).panels);
  assert.deepEqual(JSON.parse(text).cabinet, old); assert.ok(PREVIOUS_AUTOSAVE_KEYS.includes('cabinet-studio.autosave.v4'));
  assert.ok(!PREVIOUS_AUTOSAVE_KEYS.includes(AUTOSAVE_KEY as any));
});

test('unknown installation revisions, actual hardware packs, invalid bindings and colliding IDs never replace current state', () => {
  const c = furnished(), store = new CabinetStore(c);
  const mutations = [
    (d: any) => d.cabinet.installation.type = 'wall',
    (d: any) => d.cabinet.installation.policyRevision = 'support-99',
    (d: any) => d.cabinet.installation.feet.geometry.revision = '99',
    (d: any) => d.cabinet.installation.feet.geometry.id = 'bought-foot-unverified',
    (d: any) => d.cabinet.installation.feet.height = '100',
    (d: any) => d.cabinet.installation.plinth.material = { stock: pin('generic-back-6'), finish: pin('unspecified'), grain: 'none' },
    (d: any) => d.cabinet.compartments.featureId = `${c.id}/installation/foot/front-left`,
    (d: any) => d.cabinet.installation.plinth.leftReturn = 'true',
    (d: any) => d.cabinet.hardware.push(pin('unverified-foot')),
    (d: any) => d.schemaVersion++
  ];
  for (const mutate of mutations) { const doc = JSON.parse(serialize(c)); mutate(doc); assert.throws(() => store.commit(deserialize(JSON.stringify(doc)))); assert.deepEqual(store.getSnapshot().committed, c); }
});
