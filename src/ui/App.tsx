import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createCabinet, resize, type Axis, type Cabinet } from '../domain/cabinet';
import { CabinetStore } from '../commands/store';
import { evaluate } from '../geometry/evaluate';
import { AUTOSAVE_KEY, deserialize, downloadCabinet, serialize } from '../persistence/files';
import type { ThemeName } from '../design-system/themes';
import { Icon } from '../design-system/Icon';
import { Viewport } from '../viewport/Viewport';
import { Button, IconButton, Section } from './components';
import { DimensionField } from './DimensionField';
function initial(): { cabinet: Cabinet; message: string } {
  try { const saved = localStorage.getItem(AUTOSAVE_KEY); return { cabinet: saved ? deserialize(saved) : createCabinet(), message: saved ? 'Restored your browser-local cabinet.' : '' }; }
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
  const file = useRef<HTMLInputElement>(null), dimensions = useRef<Partial<Record<Axis, HTMLInputElement | null>>>({}), dragBase = useRef<Cabinet | null>(null), dialog = useRef<HTMLDialogElement>(null), nameCanceled = useRef(false);
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
  const selectedPanel = evaluated.panels.find(p => p.id === selection), openingSelected = selection === cabinet.compartments.id;
  const title = selectedPanel?.label ?? (openingSelected ? 'Interior opening' : 'Cabinet body');
  const commitDimension = (axis: Axis, value: number) => store.commit(resize(store.getSnapshot().committed, axis, value));
  const previewDimension = (axis: Axis, value: number) => { store.preview(resize(store.getSnapshot().committed, axis, value)); };
  const save = () => { downloadCabinet(store.getSnapshot().committed); setNotice('Cabinet JSON backup saved. Keep it outside this browser to protect your work.'); };
  async function load(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]; event.target.value = ''; if (!selected) return;
    try {
      if (selected.size > 2_000_000) throw new Error('This file is too large for a single cabinet (limit 2 MB).');
      const revision = store.getSnapshot().revision;
      const next = deserialize(await selected.text());
      if (store.getSnapshot().revision !== revision) throw new Error('The cabinet changed while reading the file. Open it again to apply it. Your current cabinet is unchanged.');
      store.commit(next); setSelection(next.id); setNotice(`Opened “${next.name}”. Undo returns to your previous cabinet.`);
    } catch (error) { setNotice((error as Error).message); }
  }
  return <div className="app-shell">
    <header className="app-header"><div className="brand"><span className="brand-symbol"><Icon name="cabinet" size={23}/></span><span>cabinet<span className="brand-light">studio</span></span><span className="local-badge">LOCAL</span></div>
      <div className="header-center">A little space. A lot of possibility.</div>
      <div className="header-actions"><IconButton icon={theme === 'graphite' ? 'sun' : 'moon'} label={`Switch to ${theme === 'graphite' ? 'Linen' : 'Graphite'} theme`} onClick={() => setTheme(theme === 'graphite' ? 'linen' : 'graphite')}/><IconButton icon="help" label="Editing guide" onClick={() => setHelp(true)}/><span className="avatar" title="Local workspace">B</span></div>
    </header>
    <div className="document-bar"><div className="document-title"><Icon name="cube"/><span>{snapshot.committed.name}</span><span className="document-stage">Stage 01 / Basic cabinet</span></div>
      <div className="document-actions"><div className="history-actions"><IconButton icon="undo" label="Undo (⌘Z)" disabled={!snapshot.canUndo} onClick={store.undo}/><IconButton icon="redo" label="Redo (⇧⌘Z)" disabled={!snapshot.canRedo} onClick={store.redo}/></div><Button icon="open" onClick={() => file.current?.click()}>Open</Button><Button icon="save" className="primary-button" onClick={save}>Save cabinet</Button><input ref={file} type="file" accept=".json,application/json" hidden onChange={load}/></div>
    </div>
    <main className="workspace">
      <aside className="elements-panel" aria-label="Cabinet elements"><div className="panel-heading"><h2>Structure</h2><span className="count-badge">01</span></div>
        <button className={`tree-root ${selection === cabinet.id ? 'selected' : ''}`} onClick={() => setSelection(cabinet.id)} aria-pressed={selection === cabinet.id}><Icon name="cube"/><span>Cabinet body<small>Rectangular carcass</small></span><Icon name="chevron" size={13}/></button>
        <div className="tree-children"><span className="tree-caption">PANELS <span>5</span></span>{evaluated.panels.map((panel, i) => <button className={`tree-item ${selection === panel.id ? 'selected' : ''}`} key={panel.id} onClick={() => setSelection(panel.id)} aria-pressed={selection === panel.id}><Icon name="panel" size={16}/><span>{panel.label}</span><small>{String(i + 1).padStart(2, '0')}</small></button>)}</div>
        <button className={`tree-item opening-item ${openingSelected ? 'selected' : ''}`} onClick={() => setSelection(cabinet.compartments.id)} aria-pressed={openingSelected}><Icon name="cube" size={16}/><span>Interior opening</span><small>01</small></button>
        <div className="structure-foot"><div className="little-cabinet"><Icon name="cabinet" size={32}/></div><span className="eyebrow">ONE CABINET. MANY POSSIBILITIES.</span><p>Start with the body.<br/>The details will follow.</p><div className="stage-progress"><span/><span/><span/><span/><span/></div><small>Foundation & basic cabinet</small></div>
      </aside>
      <div className="canvas-area"><Viewport cabinet={cabinet} evaluated={evaluated} selection={selection} theme={theme} preview={!!snapshot.preview} cutaway={cutaway}
        onSelect={setSelection} onEdit={axis => { dimensions.current[axis]?.focus(); dimensions.current[axis]?.select(); }}
        onDragStart={() => { store.cancel(); dragBase.current = store.getSnapshot().committed; }}
        onPreview={(axis, value) => { if (dragBase.current) store.preview(resize(dragBase.current, axis, value)); }}
        onCommit={() => { const s = store.getSnapshot(); if (s.preview && !s.error) store.commit(); dragBase.current = null; }}
        onCancel={() => { store.cancel(); dragBase.current = null; }}/>
        {(snapshot.error || notice) && <div className={`notice ${snapshot.error ? 'error-notice' : ''}`} role={snapshot.error ? 'alert' : 'status'}><Icon name={snapshot.error ? 'help' : 'check'} size={18}/><span>{snapshot.error || notice}</span><IconButton icon="close" label="Dismiss message" onClick={() => { store.cancel(); setNotice(''); }}/></div>}
      </div>
      <aside className="inspector" aria-label="Contextual inspector"><label className="compact-selection">Selected element<select value={selection} onChange={event => setSelection(event.target.value)}><option value={cabinet.id}>Cabinet body</option>{evaluated.panels.map(panel => <option key={panel.id} value={panel.id}>{panel.label}</option>)}<option value={cabinet.compartments.id}>Interior opening</option></select></label><div className="inspector-title"><span className="eyebrow">INSPECTOR</span><h2>{title}</h2><p>{selectedPanel ? 'A generated part of your cabinet.' : openingSelected ? 'The space inside your cabinet.' : 'Define the space you’re building.'}</p></div>
        <Section title="Dimensions" aside={<span className="unit-badge">mm</span>}>
          {(['width', 'height', 'depth'] as const).map(axis => <DimensionField key={axis} axis={axis} label={axis[0].toUpperCase() + axis.slice(1)} value={cabinet.envelope[axis]} cancelValue={snapshot.committed.envelope[axis]} onPreview={value => previewDimension(axis, value)} onCommit={value => commitDimension(axis, value)} onCancel={store.cancel} register={el => { dimensions.current[axis] = el; }}/>) }
          <p className="field-note">Body depth excludes fronts and handles.<br/>Installation height is not assigned.</p>
        </Section>
        {selectedPanel ? <Section title="Selected panel"><div className="data-row"><span>Finished size</span><strong>{selectedPanel.size.join(' × ')} mm</strong></div><div className="data-row"><span>Material</span><strong>{selectedPanel.role === 'back' ? 'Generic back · 6 mm' : 'Generic panel · 18 mm'}</strong></div><p className="field-note">Finished geometry only. Joinery and preparation are not assigned.</p></Section> : openingSelected ? <Section title="Usable opening"><div className="opening-size">{evaluated.opening.size.map((n, i) => <div key={i}><span>{['Width', 'Height', 'Depth'][i]}</span><strong>{n}<small>mm</small></strong></div>)}</div><p className="field-note">Measured between the panels and in front of the back.</p></Section> : <Section title="Construction"><div className="data-row"><span>Body</span><strong>18 mm panel</strong></div><div className="data-row"><span>Back</span><strong>6 mm inset panel</strong></div><div className="data-row"><span>Top</span><strong>Full panel</strong></div><div className="material-preview"><span className="material-swatch"/><div>Neutral finish<small>Display appearance only</small></div></div></Section>}
        <Section title="View"><label className="switch-row"><span><Icon name="eye" size={17}/> Transparent back</span><input type="checkbox" role="switch" checked={cutaway} onChange={e => setCutaway(e.target.checked)}/></label><p className="field-note">Look inside without changing construction.</p></Section>
        <Section title="Cabinet"><label className="name-field">Name<input aria-label="Cabinet name" value={nameDraft} maxLength={100} onChange={e => setNameDraft(e.target.value)} onBlur={() => { if (nameCanceled.current) { nameCanceled.current = false; return; } store.commit({ ...snapshot.committed, name: nameDraft.trim() || 'Untitled cabinet' }); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { nameCanceled.current = true; setNameDraft(snapshot.committed.name); e.currentTarget.blur(); } }}/></label></Section>
        <div className="concept-note"><span className="status-dot"/><div><strong>Conceptual construction</strong><p>Dimensions are evaluated. Hardware, joints and load capacity are not verified.</p></div></div>
      </aside>
    </main>
    <footer className="status-bar"><span><span className="status-dot"/>{snapshot.preview ? 'Preview · release to apply' : saveStatus}</span><span>5 panels <span className="footer-separator">/</span> 1 opening <span className="footer-separator">/</span> {cabinet.envelope.width} × {cabinet.envelope.height} × {cabinet.envelope.depth} mm</span><span>{theme === 'graphite' ? 'Graphite' : 'Linen'} theme <span className="footer-separator">·</span> v0.1.0</span></footer>
    <dialog ref={dialog} onClose={() => setHelp(false)} onCancel={() => setHelp(false)}><div className="dialog-heading"><h2>A few ways to make it yours.</h2><IconButton icon="close" label="Close guide" onClick={() => setHelp(false)}/></div><p>Select a panel in the 3D view or Structure list. Click a dimension label to edit its field, or drag a gold handle along its axis. Every drag commits one Undo step; Escape cancels.</p><p>Orbit by dragging empty space. Scroll to zoom and right-drag to pan. Focus the canvas and use arrow keys to orbit, +/− to zoom, and F to fit. The view buttons also reset the camera.</p><p>Width is the overall body width. Height and depth describe the body; fronts, handles, feet and installation are not included. Current ranges are modelling policies, not structural ratings.</p><p>Your cabinet autosaves only in this browser at this local address. Save cabinet creates a portable JSON backup. Open validates the complete file; unsupported versions preserve your current cabinet. Loading can be undone.</p>{protectAutosave && <Button className="primary-button" onClick={() => { const raw = localStorage.getItem(AUTOSAVE_KEY); if (raw) { const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'cabinet-recovery-original.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } setProtectAutosave(false); }}>Back up recovery data & resume autosave</Button>}<Button className="primary-button" onClick={() => setHelp(false)}>Back to building<Icon name="arrow"/></Button></dialog>
  </div>;
}
