import { useEffect, useState } from 'react';
import type { Cabinet } from '../domain/cabinet';
import { adjustableToFixed, fixedToAdjustable } from '../commands/adjustable';
import { findDivision } from '../commands/interiors';
import { Section, Button } from './components';
interface Props { committed: Cabinet; preview: Cabinet | null; error: string | null; selection: string; onPreview(c: Cabinet): boolean; onCommit(c: Cabinet): boolean; onCancel(): void; onNotice(message: string): void }
export function ShelfKindInspector(p: Props) {
  const [draft,setDraft] = useState<Cabinet | null>(null), [valid,setValid] = useState(true);
  useEffect(() => { setDraft(null); setValid(true); },[p.committed,p.selection]);
  useEffect(() => { if (draft && ((!p.preview && !p.error) || (p.preview && JSON.stringify(p.preview) !== JSON.stringify(draft)))) setDraft(null); },[p.preview,p.error]);
  const shelf = p.committed.contents.find(s => s.id === p.selection), fixed = findDivision(p.committed.compartments,p.selection);
  if (!shelf && fixed?.axis !== 'horizontal') return null;
  function review() { try { const next = shelf ? adjustableToFixed(p.committed,p.selection) : fixedToAdjustable(p.committed,p.selection); setDraft(next); setValid(p.onPreview(next)); } catch(error) { p.onNotice((error as Error).message); } }
  return <Section title="Shelf construction"><p className="field-note">{shelf ? 'Adjustable shelf · concept support levels' : 'Fixed structural division · conceptual joinery'}. Converting preserves the panel ID and its edge settings. Remove nested contents first; none are discarded. Adjustable placement snaps to the nearest concept level.</p>
    {!draft ? <Button onClick={review}>Preview {shelf ? 'fixed' : 'adjustable'} shelf</Button> : <div className="construction-review" role="status"><strong>{valid ? 'Shelf conversion preview' : 'Shelf conversion needs a correction'}</strong><div className="interior-actions"><Button className="primary-button" disabled={!valid} onClick={() => p.onCommit(draft)}>Apply shelf conversion</Button><Button onClick={() => { setDraft(null); p.onCancel(); }}>Cancel shelf conversion</Button></div></div>}
  </Section>;
}
