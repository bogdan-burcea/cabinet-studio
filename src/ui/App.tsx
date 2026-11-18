import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createCabinet, resize, type Axis, type Cabinet } from '../domain/cabinet';
import { CabinetStore } from '../commands/store';
import { evaluate } from '../geometry/evaluate';
import { AUTOSAVE_KEY, LEGACY_AUTOSAVE_KEY, deserializeWithInfo, downloadCabinet, serialize } from '../persistence/files';
import type { ThemeName } from '../design-system/themes';
import { Icon } from '../design-system/Icon';
import { Viewport } from '../viewport/Viewport';
import { Button, IconButton, Section } from './components';
import { DimensionField } from './DimensionField';
import { InteriorInspector } from './InteriorInspector';
import { Structure } from './Structure';
import { moveDivision } from '../commands/interiors';
function initial(): { cabinet: Cabinet; message: string } {
  try { const saved = localStorage.getItem(AUTOSAVE_KEY) ?? localStorage.getItem(LEGACY_AUTOSAVE_KEY); const restored = saved ? deserializeWithInfo(saved) : null; return { cabinet: restored?.cabinet ?? createCabinet(), message: restored?.migrated ? 'Upgraded a copy of your Stage 1 autosave. Geometry is unchanged; the original browser copy is preserved.' : saved ? 'Restored your browser-local cabinet.' : '' }; }
  catch { return { cabinet: createCabinet(), message: 'The previous autosave could not be read. It has been preserved; save a backup before replacing it.' }; }
}
const startup = initial(), store = new CabinetStore(startup.cabinet);
export function App() {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const cabinet = snapshot.preview ?? snapshot.committed;
  const evaluated = useMemo(() => evaluate(cabinet), [cabinet]);
  const [selection, setSelection] = useState(cabinet.id), [theme, setTheme] = useState<ThemeName>('graphite'), [cutaway, setCutaway] = useState(false);
  const [notice, setNotice] = useState(startup.message), [saveStatus, setSaveStatus] = useState('Browser-local'), [help, setHelp] = useState(false);
  const [nameDraft, setNameDraft] = useState(cabinet.name), [protectAutosave, setProtectAutosave] = useState(startup.message.includes('could not'));
  const file = useRef<HTMLInputElement>(null), dimensions = useRef<Partial<Record<Axis, HTMLInputElement | null>>>({}), dragBase = useRef<Cabinet | null>(null), dialog = useRef<HTMLDialogElement>(null), nameCanceled = useRef(false), positionInput = useRef<HTMLInputElement | null>(null);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { setNameDraft(snapshot.committed.name); }, [snapshot.committed]);
  useEffect(() => { setSelection(cabinet.id); }, [cabinet.id]);
  useEffect(() => {
    if (protectAutosave) { setSaveStatus('Recovery copy preserved'); return; }
    try { localStorage.setItem(AUTOSAVE_KEY, serialize(snapshot.committed)); setSaveStatus('Saved in this browser'); }
    catch { setSaveStatus('Autosave unavailable'); setNotice('Browser storage is unavailable or full. Use Save cabinet to keep a JSON backup.'); }
  }, [snapshot.committed, protectAutosave]);
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { store.cancel(); dragBase.current = null; }
      const tag = (event.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if ((event.metaKey || event.ctrlKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
        event.preventDefault(); event.shiftKey || event.key.toLowerCase() === 'y' ? store.redo() : store.undo();
      }
    }; window.addEventListener('keydown', keyDown); return () => window.removeEventListener('keydown', keyDown);
  }, []);
  useEffect(() => { if (help) dialog.current?.showModal(); else dialog.current?.close(); }, [help]);
  const selectedPanel = evaluated.panels.find(p => p.id === selection), selectedOpening = evaluated.openings.find(o => o.id === selection);
  useEffect(() => { if (selection !== cabinet.id && !evaluated.panels.some(p => p.id === selection) && !evaluated.openings.some(o => o.id === selection)) setSelection(cabinet.id); }, [snapshot.committed, selection]);
  const title = selectedPanel?.label ?? (selectedOpening ? selectedOpening.label : 'Cabinet body');
  const commitDimension = (axis: Axis, value: number) => store.commit(resize(store.getSnapshot().committed, axis, value));
  const previewDimension = (axis: Axis, value: number) => { store.preview(resize(store.getSnapshot().committed, axis, value)); };
  const save = () => { downloadCabinet(store.getSnapshot().committed); setNotice('Cabinet JSON backup saved. Keep it outside this browser to protect your work.'); };
  async function load(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]; event.target.value = ''; if (!selected) return;
    try {
      if (selected.size > 2_000_000) throw new Error('This file is too large for a single cabinet (limit 2 MB).');
      const revision = store.getSnapshot().revision;
      const loaded = deserializeWithInfo(await selected.text()), next = loaded.cabinet;
      if (store.getSnapshot().revision !== revision) throw new Error('The cabinet changed while reading the file. Open it again to apply it. Your current cabinet is unchanged.');
      store.commit(next); setSelection(next.id); setNotice(`Opened “${next.name}”. Undo returns to your previous cabinet.${loaded.migrated ? ' A copy was upgraded from Stage 1 with no geometry change; the original file is unchanged.' : ''}`);
    } catch (error) { setNotice((error as Error).message); }
  }
  return <div className="app-shell">
    <header className="app-header"><div className="brand"><span className="brand-symbol"><Icon name="cabinet" size={23}/></span><span>cabinet<span className="brand-light">studio</span></span><span className="local-badge">LOCAL</span></div>
      <div className="header-center">A little space. A lot of possibility.</div>
      <div className="header-actions"><IconButton icon={theme === 'graphite' ? 'sun' : 'moon'} label={`Switch to ${theme === 'graphite' ? 'Linen' : 'Graphite'} theme`} onClick={() => setTheme(theme === 'graphite' ? 'linen' : 'graphite')}/><IconButton icon="help" label="Editing guide" onClick={() => setHelp(true)}/><span className="avatar" title="Local workspace">B</span></div>
    </header>
    <div className="document-bar"><div className="document-title"><Icon name="cube"/><span>{snapshot.committed.name}</span><span className="document-stage">Stage 02 / Shelves & dividers</span></div>
      <div className="document-actions"><div className="history-actions"><IconButton icon="undo" label="Undo (⌘Z)" disabled={!snapshot.canUndo} onClick={store.undo}/><IconButton icon="redo" label="Redo (⇧⌘Z)" disabled={!snapshot.canRedo} onClick={store.redo}/></div><Button icon="open" onClick={() => file.current?.click()}>Open</Button><Button icon="save" className="primary-button" onClick={save}>Save cabinet</Button><input ref={file} type="file" accept=".json,application/json" hidden onChange={load}/></div>
    </div>
    <main className="workspace">
      <Structure cabinet={cabinet} evaluated={evaluated} selection={selection} onSelect={setSelection}/>
      <div className="canvas-area"><Viewport cabinet={cabinet} evaluated={evaluated} selection={selection} theme={theme} preview={!!snapshot.preview} cutaway={cutaway}
        onSelect={setSelection} onEditDivision={() => { positionInput.current?.focus(); positionInput.current?.select(); }} onPreviewDivision={(id, value) => { if (dragBase.current) store.preview(moveDivision(dragBase.current, id, value)); }} onEdit={axis => { dimensions.current[axis]?.focus(); dimensions.current[axis]?.select(); }}
        onDragStart={() => { store.cancel(); dragBase.current = store.getSnapshot().committed; }}
        onPreview={(axis, value) => { if (dragBase.current) store.preview(resize(dragBase.current, axis, value)); }}
        onCommit={() => { const s = store.getSnapshot(); if (s.preview && !s.error) store.commit(); dragBase.current = null; }}
        onCancel={() => { store.cancel(); dragBase.current = null; }}/>
        {(snapshot.error || notice) && <div className={`notice ${snapshot.error ? 'error-notice' : ''}`} role={snapshot.error ? 'alert' : 'status'}><Icon name={snapshot.error ? 'help' : 'check'} size={18}/><span>{snapshot.error || notice}</span>{snapshot.error && snapshot.issueFeatureId && (snapshot.issueFeatureId === cabinet.id || evaluated.panels.some(panel => panel.id === snapshot.issueFeatureId)) && <Button onClick={() => setSelection(snapshot.issueFeatureId!)}>Inspect issue</Button>}<IconButton icon="close" label="Dismiss message" onClick={() => { store.cancel(); setNotice(''); }}/></div>}
      </div>
      <aside className="inspector" aria-label="Contextual inspector"><label className="compact-selection">Selected element<select value={selection} onChange={event => setSelection(event.target.value)}><option value={cabinet.id}>Cabinet body</option>{evaluated.panels.map(panel => <option key={panel.id} value={panel.id}>{panel.label}</option>)}{evaluated.openings.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label><div className="inspector-title"><span className="eyebrow">INSPECTOR</span><h2>{title}</h2><p>{selectedPanel ? 'A generated part of your cabinet.' : selectedOpening ? 'The space inside your cabinet.' : 'Define the space you’re building.'}</p></div>
        <InteriorInspector cabinet={cabinet} committed={snapshot.committed} evaluated={evaluated} selection={selection} onSelect={setSelection} onPreview={store.preview} onCommit={store.commit} onCancel={store.cancel} onNotice={setNotice} positionRef={el => { positionInput.current = el; }}/>
        <Section title="Dimensions" aside={<span className="unit-badge">mm</span>}>
          {(['width', 'height', 'depth'] as const).map(axis => <DimensionField key={axis} axis={axis} label={axis[0].toUpperCase() + axis.slice(1)} value={cabinet.envelope[axis]} cancelValue={snapshot.committed.envelope[axis]} onPreview={value => previewDimension(axis, value)} onCommit={value => commitDimension(axis, value)} onCancel={store.cancel} register={el => { dimensions.current[axis] = el; }}/>) }
          <p className="field-note">Body depth excludes fronts and handles.<br/>Installation height is not assigned.</p>
        </Section>
        {selectedPanel ? <Section title="Selected panel"><div className="data-row"><span>Finished size</span><strong>{selectedPanel.size.join(' × ')} mm</strong></div><div className="data-row"><span>Material</span><strong>{selectedPanel.role === 'back' ? 'Generic back · 6 mm' : 'Generic panel · 18 mm'}</strong></div><p className="field-note">Finished geometry only. Joinery and preparation are not assigned.</p></Section> : <Section title="Construction"><div className="data-row"><span>Body</span><strong>18 mm panel</strong></div><div className="data-row"><span>Back</span><strong>6 mm inset panel</strong></div><div className="data-row"><span>Top</span><strong>Full panel</strong></div><div className="material-preview"><span className="material-swatch"/><div>Neutral finish<small>Display appearance only</small></div></div></Section>}
        <Section title="View"><label className="switch-row"><span><Icon name="eye" size={17}/> Transparent back</span><input type="checkbox" role="switch" checked={cutaway} onChange={e => setCutaway(e.target.checked)}/></label><p className="field-note">Look inside without changing construction.</p></Section>
        <Section title="Cabinet"><label className="name-field">Name<input aria-label="Cabinet name" value={nameDraft} maxLength={100} onChange={e => setNameDraft(e.target.value)} onBlur={() => { if (nameCanceled.current) { nameCanceled.current = false; return; } store.commit({ ...snapshot.committed, name: nameDraft.trim() || 'Untitled cabinet' }); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { nameCanceled.current = true; setNameDraft(snapshot.committed.name); e.currentTarget.blur(); } }}/></label></Section>
        <div className="concept-note"><span className="status-dot"/><div><strong>Conceptual construction</strong><p>Dimensions are evaluated. Hardware, joints and load capacity are not verified.</p></div></div>
      </aside>
    </main>
    <footer className="status-bar"><span><span className="status-dot"/>{snapshot.preview ? 'Preview · release to apply' : saveStatus}</span><span>{evaluated.panels.length} panels <span className="footer-separator">/</span> {evaluated.openings.length} openings <span className="footer-separator">/</span> {cabinet.envelope.width} × {cabinet.envelope.height} × {cabinet.envelope.depth} mm</span><span>{theme === 'graphite' ? 'Graphite' : 'Linen'} theme <span className="footer-separator">·</span> v0.2.0</span></footer>
    <dialog ref={dialog} onClose={() => setHelp(false)} onCancel={() => setHelp(false)}><div className="dialog-heading"><h2>A few ways to make it yours.</h2><IconButton icon="close" label="Close guide" onClick={() => setHelp(false)}/></div><p>Select a panel in the 3D view or Structure list. Click a dimension label to edit its field, or drag a gold handle along its axis. Every drag commits one Undo step; Escape cancels.</p><p>Select an opening to add a fixed shelf or divider. Divide child openings to build nested interiors. Select an interior panel to move its centre numerically, centre it, duplicate it into the largest child opening, or remove it. The move handle snaps to a 5 mm application grid and the centre; no shelf-support hole pattern is implied. Child divisions must be removed before their parent.</p><p>Orbit by dragging empty space. Scroll to zoom and right-drag to pan. Focus the canvas and use arrow keys to orbit, +/− to zoom, and F to fit. The view buttons also reset the camera.</p><p>Width is the overall body width. Height and depth describe the body; fronts, handles, feet and installation are not included. Current ranges are modelling policies, not structural ratings.</p><p>Your cabinet autosaves only in this browser at this local address. Save cabinet creates a portable JSON backup. Open validates the complete file; unsupported versions preserve your current cabinet. Loading can be undone.</p>{protectAutosave && <Button className="primary-button" onClick={() => { const raw = localStorage.getItem(AUTOSAVE_KEY) ?? localStorage.getItem(LEGACY_AUTOSAVE_KEY); if (raw) { const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'cabinet-recovery-original.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } setProtectAutosave(false); }}>Back up recovery data & resume autosave</Button>}<Button className="primary-button" onClick={() => setHelp(false)}>Back to building<Icon name="arrow"/></Button></dialog>
  </div>;
}
