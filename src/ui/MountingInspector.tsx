import { useEffect, useState } from 'react';
import type { Cabinet, Mounting } from '../domain/cabinet';
import type { EvaluatedCabinet } from '../geometry/evaluate';
import { changeMounting } from '../commands/mounting';
import { mountingLimits } from '../rules/mounting';
import { Button, Section } from './components';
import { DimensionField } from './DimensionField';
interface Props {
  committed: Cabinet; preview: Cabinet | null; evaluated: EvaluatedCabinet; error: string | null;
  onPreview(c: Cabinet): boolean; onCommit(c: Cabinet): boolean; onCancel(): void;
}
export function MountingInspector(p: Props) {
  const [draft, setDraft] = useState<Mounting>(p.committed.installation.mounting), [valid, setValid] = useState(true);
  const pending = JSON.stringify(draft) !== JSON.stringify(p.committed.installation.mounting);
  const reset = () => { setDraft(p.committed.installation.mounting); setValid(true); };
  useEffect(reset, [p.committed]);
  useEffect(() => { if (pending && ((!p.preview && !p.error) || (p.preview && JSON.stringify(p.preview.installation.mounting) !== JSON.stringify(draft)))) reset(); }, [p.preview, p.error]);
  function update(next: Mounting) {
    setDraft(next);
    if (JSON.stringify(next) === JSON.stringify(p.committed.installation.mounting)) { setValid(true); p.onCancel(); return true; }
    const ok = p.onPreview(changeMounting(p.committed, next)); setValid(ok); return ok;
  }
  function cancel() { reset(); p.onCancel(); }
  const field = (key: 'wallGap' | 'topOffset' | 'sideInset' | 'floorClearance', label: string) => <DimensionField key={key} retainInvalid label={label} value={draft[key]} cancelValue={p.committed.installation.mounting[key]} limits={mountingLimits[key]} onPreview={v => update({ ...draft, [key]: v })} onCommit={v => update({ ...draft, [key]: v })} onCancel={cancel}/>;
  return <div onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); cancel(); } }}><Section title="Wall mounting" aside={<span className="unit-badge">CONCEPT LAYOUT</span>}>
    <label className="construction-choice">Layout<select aria-label="Wall mounting layout" value={draft.mode} onChange={e => update({ ...draft, mode: e.target.value as Mounting['mode'] })}><option value="none">None / unassigned</option><option value="restraint-concept">Wall restraint · concept</option><option value="suspended-concept">Suspended · concept</option></select></label>
    {draft.mode === 'restraint-concept' && <p className="field-note">Requires direct-floor or concept-foot support. The rear envelopes mark a possible restraint position; they do not carry the cabinet.</p>}
    {draft.mode === 'suspended-concept' && <><p className="field-note">Applying suspension releases floor support to Unassigned. Foot/plinth dimensions, materials and bands are retained for reuse. The body stays at its existing origin; the floor reference moves below it.</p>{field('floorClearance', 'Body above floor')}</>}
    {draft.mode !== 'none' && <>
      {field('wallGap', 'Wall gap')}{field('topOffset', 'Mounting centre from top')}
      <details className="advanced-material"><summary>Mounting side setbacks</summary>{field('sideInset', 'Mounting side setback')}</details>
      <p className="field-note">Wall gap is measured behind the body rear face. Two bracket envelopes meet a rail at the wall reference. Use Rear or Side to inspect them. No back cutout or cabinet preparation is inferred.</p>
      {(!pending || valid) && <div className="installation-readout"><div className="data-row"><span>Mounting centre above floor</span><strong>{p.evaluated.mounting.mountingHeight === null ? 'Unassigned' : `${p.evaluated.mounting.mountingHeight} mm`}</strong></div><div className="data-row"><span>Body top above floor</span><strong>{p.evaluated.installation.installedHeight === null ? 'Unassigned' : `${p.evaluated.installation.installedHeight} mm`}</strong></div></div>}
    </>}
    {pending && <div className="construction-review" role="status"><strong>{valid ? 'Wall-mounting preview' : 'Wall mounting needs a correction'}</strong><p>{valid ? 'Review the layout and floor reference. Construction, interiors and material/edge intent are preserved.' : 'Correct the support or envelope conflict, or cancel. The committed cabinet remains unchanged.'}</p><div className="interior-actions"><Button className="primary-button" disabled={!valid} onClick={() => p.onCommit(changeMounting(p.committed, draft))}>Apply wall mounting</Button><Button onClick={cancel}>Cancel mounting preview</Button></div></div>}
    <p className="field-note">Provisional spatial study only. No verified hanger/rail pack, wall substrate, anchors, fasteners, drilling or load/stability rating is selected. This layout is not an installable assembly.</p>
  </Section></div>;
}
