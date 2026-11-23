import { useEffect, useState } from 'react';
import type { Cabinet, Installation } from '../domain/cabinet';
import { changeInstallation } from '../commands/installation';
import type { EvaluatedCabinet } from '../geometry/evaluate';
import { supportLimits } from '../rules/installation';
import {Checkbox, Button, Section } from './components';
import { DimensionField } from './DimensionField';
interface Props {
  committed: Cabinet; preview: Cabinet | null; evaluated: EvaluatedCabinet; error: string | null;
  onPreview(c: Cabinet): boolean; onCommit(c: Cabinet): boolean; onCancel(): void;
  plinthVisible: boolean; onPlinthVisibility(value: boolean): void;
}
export function InstallationInspector(p: Props) {
  const [draft, setDraft] = useState<Installation>(p.committed.installation), [valid, setValid] = useState(true);
  const pending = JSON.stringify(draft) !== JSON.stringify(p.committed.installation);
  const active = draft.type === 'feet-concept';
  const reset = () => { setDraft(p.committed.installation); setValid(true); };
  useEffect(reset, [p.committed]);
  useEffect(() => { if (pending && ((!p.preview && !p.error) || (p.preview && JSON.stringify(p.preview.installation) !== JSON.stringify(draft)))) reset(); }, [p.preview, p.error]);
  function update(next: Installation) { setDraft(next); if (JSON.stringify(next) === JSON.stringify(p.committed.installation)) { setValid(true); p.onCancel(); return true; } const ok = p.onPreview(changeInstallation(p.committed, next)); setValid(ok); return ok; }
  function cancel() { reset(); p.onCancel(); }
  const foot = (key: 'height' | 'sideInset' | 'frontInset' | 'rearInset', value: number) => update({ ...draft, feet: { ...draft.feet, [key]: value } });
  const plinth = (key: 'frontSetback' | 'topGap' | 'bottomGap', value: number) => update({ ...draft, plinth: { ...draft.plinth, [key]: value } });
  return <div onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); cancel(); } }}><Section title="Feet & plinth" aside={<span className="unit-badge">CONCEPT LAYOUT</span>}>
    <label className="construction-choice">Support<select aria-label="Support mode" value={draft.type} onChange={e => update({ ...draft, type: e.target.value as Installation['type'] })}><option value="unassigned">Unassigned</option><option value="floor">Direct floor · concept</option><option value="feet-concept">Four feet · concept</option></select></label>
    {active && <>
      <div className="rail-fields"><DimensionField retainInvalid label="Foot height" value={draft.feet.height} cancelValue={p.committed.installation.feet.height} limits={supportLimits.height} onPreview={v => foot('height', v)} onCommit={v => foot('height', v)} onCancel={cancel}/></div>
      <details className="advanced-material"><summary>Foot centre setbacks</summary><p className="field-note">Measured to each foot centre from the body edges. Both side setbacks are equal; front and rear rows are independent.</p>
        {(['sideInset', 'frontInset', 'rearInset'] as const).map(key => <DimensionField key={key} retainInvalid label={key === 'sideInset' ? 'Side setback' : key === 'frontInset' ? 'Front setback' : 'Rear setback'} value={draft.feet[key]} cancelValue={p.committed.installation.feet[key]} limits={supportLimits.inset} onPreview={v => foot(key, v)} onCommit={v => foot(key, v)} onCancel={cancel}/>)}</details>
    </>}
    <Checkbox className="material-inheritance" aria-label="Enable front plinth" disabled={!active} checked={draft.plinth.enabled} onChange={e => update({ ...draft, plinth: { ...draft.plinth, enabled: e.target.checked } })}>Front plinth</Checkbox>
    {!active && <p className="field-note">Plinth and foot settings are retained; geometry is shown only with concept feet.</p>}
    {active && draft.plinth.enabled && <>
      <div className="rail-fields"><DimensionField retainInvalid label="Plinth setback" value={draft.plinth.frontSetback} cancelValue={p.committed.installation.plinth.frontSetback} limits={supportLimits.setback} onPreview={v => plinth('frontSetback', v)} onCommit={v => plinth('frontSetback', v)} onCancel={cancel}/></div>
      <div className="plinth-returns">{(['leftReturn', 'rightReturn'] as const).map(key => <Checkbox className="material-inheritance" key={key} checked={draft.plinth[key]} onChange={e => update({ ...draft, plinth: { ...draft.plinth, [key]: e.target.checked } })}>{key === 'leftReturn' ? 'Left return' : 'Right return'}</Checkbox>)}</div>
      <details className="advanced-material"><summary>Plinth gaps</summary>{(['topGap', 'bottomGap'] as const).map(key => <DimensionField key={key} retainInvalid label={key === 'topGap' ? 'Top gap' : 'Floor gap'} value={draft.plinth[key]} cancelValue={p.committed.installation.plinth[key]} limits={supportLimits.gap} onPreview={v => plinth(key, v)} onCommit={v => plinth(key, v)} onCancel={cancel}/>)}</details>
      <label className="switch-row installation-visibility"><span>Show plinth in view</span><input type="checkbox" role="switch" checked={p.plinthVisible} onChange={e => p.onPlinthVisibility(e.target.checked)}/></label><p className="field-note">Hide it to inspect the feet; construction and saved data stay unchanged. Plinth material/banding is editable by selecting its panel.</p>
    </>}
    {(!pending || valid) && <div className="installation-readout"><div className="data-row"><span>Body height</span><strong>{(p.preview ?? p.committed).envelope.height} mm</strong></div><div className="data-row"><span>Installed height</span><strong>{p.evaluated.installation.installedHeight === null ? 'Unassigned' : `${p.evaluated.installation.installedHeight} mm`}</strong></div>{p.evaluated.installation.plinthHeight !== null && <div className="data-row"><span>Plinth height</span><strong>{p.evaluated.installation.plinthHeight} mm</strong></div>}</div>}
    {pending && <div className="construction-review" role="status"><strong>{valid ? 'Installation preview' : 'Installation needs a correction'}</strong><p>{valid ? 'Body, construction, interiors, material bindings and existing edge settings are preserved. Apply this layout as one Undo step.' : 'Resolve the highlighted fit/clearance issue or cancel. The previous cabinet is unchanged.'}</p><div className="interior-actions"><Button className="primary-button" disabled={!valid} onClick={() => p.onCommit(changeInstallation(p.committed, draft))}>Apply feet & plinth</Button><Button onClick={cancel}>Cancel installation preview</Button></div></div>}
    <p className="field-note">Provisional geometry only. No verified foot/clip fitting, fixings, drilling, cabinet stability or load rating is selected. Four feet are an illustrative layout; the plinth is a cover, not structural support.</p>
  </Section></div>;
}
