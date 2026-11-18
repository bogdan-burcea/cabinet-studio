import { useEffect, useState } from 'react';
import type { Cabinet, Carcass } from '../domain/cabinet';
import { changeConstruction } from '../commands/construction';
import type { EvaluatedCabinet } from '../geometry/evaluate';
import { MIN_RAIL_GAP, RAIL_LIMITS } from '../rules/construction';
import { Button, Section } from './components';
import { DimensionField } from './DimensionField';
interface Props {
  committed: Cabinet; preview: Cabinet | null; evaluated: EvaluatedCabinet; error: string | null;
  onPreview(c: Cabinet): boolean; onCommit(c: Cabinet): boolean; onCancel(): void;
}
export function ConstructionInspector(p: Props) {
  const [draft, setDraft] = useState<Carcass>(p.committed.carcass), [valid, setValid] = useState(true);
  const pending = JSON.stringify(draft) !== JSON.stringify(p.committed.carcass);
  const reset = () => { setDraft(p.committed.carcass); setValid(true); };
  useEffect(reset, [p.committed]);
  // Escape/Undo and another feature's preview release this form's draft ownership.
  useEffect(() => {
    if (pending && ((!p.preview && !p.error) || (p.preview && JSON.stringify(p.preview.carcass) !== JSON.stringify(draft)))) reset();
  }, [p.preview, p.error]);
  function update(next: Carcass) {
    setDraft(next);
    if (JSON.stringify(next) === JSON.stringify(p.committed.carcass)) { setValid(true); p.onCancel(); return true; }
    const ok = p.onPreview(changeConstruction(p.committed, next)); setValid(ok); return ok;
  }
  function cancel() { reset(); p.onCancel(); }
  const topSize = (key: 'frontDepth' | 'rearDepth', value: number) => update({ ...draft, top: { ...draft.top, [key]: value } });
  const backSize = (key: 'upperHeight' | 'lowerHeight', value: number) => update({ ...draft, back: { ...draft.back, [key]: value } });
  return <div onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); cancel(); } }}>
    <Section title="Carcass construction" aside={<span className="unit-badge">PREVIEW → APPLY</span>}>
      <label className="construction-choice">Top<select aria-label="Top construction" value={draft.top.mode} onChange={e => update({ ...draft, top: { ...draft.top, mode: e.target.value as 'full' | 'rails' } })}><option value="full">Full top</option><option value="rails">Front & rear rails</option></select></label>
      {draft.top.mode === 'rails' && <div className="rail-fields">
        {(['frontDepth', 'rearDepth'] as const).map(key => <DimensionField key={key} retainInvalid label={key === 'frontDepth' ? 'Front rail depth' : 'Rear rail depth'} value={draft.top[key]} cancelValue={p.committed.carcass.top[key]} limits={RAIL_LIMITS}
          onPreview={value => topSize(key, value)} onCommit={value => topSize(key, value)} onCancel={cancel}/>)}
        {(!pending || valid) && <p className="field-note">Clear top gap: {Number(p.evaluated.construction.topGap.toFixed(1))} mm.</p>}
      </div>}
      <label className="construction-choice">Back<select aria-label="Back construction" value={draft.back.mode} onChange={e => update({ ...draft, back: { ...draft.back, mode: e.target.value as 'full' | 'rails' } })}><option value="full">Full inset back</option><option value="rails">Upper & lower rear rails</option></select></label>
      {draft.back.mode === 'rails' && <div className="rail-fields">
        {(['upperHeight', 'lowerHeight'] as const).map(key => <DimensionField key={key} retainInvalid label={key === 'upperHeight' ? 'Upper rail height' : 'Lower rail height'} value={draft.back[key]} cancelValue={p.committed.carcass.back[key]} limits={RAIL_LIMITS}
          onPreview={value => backSize(key, value)} onCommit={value => backSize(key, value)} onCancel={cancel}/>)}
        {(!pending || valid) && <p className="field-note">Clear rear gap: {Number(p.evaluated.construction.backGap.toFixed(1))} mm.</p>}
      </div>}
      {pending && <div className="construction-review" role="status"><strong>{valid ? 'Construction preview' : 'Preview needs a correction'}</strong>
        {valid ? <p>{p.evaluated.panels.length} panels · usable depth {Number(p.evaluated.opening.size[2].toFixed(1))} mm. All {p.evaluated.divisions.length} interior divisions and their positions are preserved. Depths adjust to clear the back construction.</p> : <p>Adjust the rail sizes before applying. The saved cabinet is unchanged.</p>}
        <div className="interior-actions"><Button className="primary-button" disabled={!valid} onClick={() => p.onCommit(changeConstruction(p.committed, draft))}>Apply construction</Button><Button onClick={cancel}>Cancel preview</Button></div>
      </div>}
      <p className="field-note">Rails use carcass stock; the full back uses back-panel stock. At least {MIN_RAIL_GAP} mm between each rail pair is a modelling policy. The top zone stays reserved for either option.</p>
      <p className="field-note">Rear rails reserve their full thickness behind every shelf and divider. Joinery, racking resistance and wall mounting are unverified.</p>
    </Section>
  </div>;
}
