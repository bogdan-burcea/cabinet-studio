import {CncInspector} from './CncInspector';
import {cnc} from '../rules/cnc';
import {setCnc} from '../commands/cnc';
import {setStockThickness,setPuzzleCorners} from '../commands/stock';
import {stock} from '../catalogue/materials';
import {BackPanelInspector} from './BackPanelInspector';
import {PartThumbnail} from './PartThumbnail';
import {setCabineo} from '../commands/cabineo';
import {cabineoVariants,type CabineoId} from '../catalogue/cabineo';
import {presets,type PresetId} from '../catalogue/presets';
import {applySimplePreset} from '../commands/simple-presets';
import {SimpleInteriorInspector} from './SimpleInteriorInspector';
import {moveDivision,findDivision,removeDivision} from '../commands/interiors';
import {useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {createCabinet,type Axis,type Cabinet} from '../domain/cabinet';
import {SIMPLE_AUTOSAVE_KEY,readSimpleCabinet} from '../persistence/simple';
import {CabinetStore} from '../commands/store';
import {resizeCabinet} from '../commands/dimensions';
import {evaluate} from '../geometry/evaluate';
import {downloadCabinet,serialize} from '../persistence/files';
import type {ThemeName} from '../design-system/themes';
import {Icon} from '../design-system/Icon';
import {Viewport} from '../viewport/Viewport';
import {IconButton,Section,Notice} from './components';
import {DimensionField} from './DimensionField';
import {Structure} from './Structure';
function named(c:Cabinet):Cabinet{return c.name==='Untitled cabinet'?{...c,name:'Cabinet'}:c;}
function initial(){
 try{const raw=localStorage.getItem(SIMPLE_AUTOSAVE_KEY);return {cabinet:named(raw?readSimpleCabinet(raw):createCabinet()),recovery:false};}
 catch{return {cabinet:named(createCabinet()),recovery:true};}
}
const startup=initial(),store=new CabinetStore(startup.cabinet);
export function App(){
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot),cabinet=snapshot.preview??snapshot.committed;
 const evaluated=useMemo(()=>evaluate(cabinet),[cabinet]);
 const [dismissedReview,setDismissedReview]=useState('');
 const [selection,setSelection]=useState(cabinet.id),[theme,setTheme]=useState<ThemeName>('linen');
 const [notice,setNotice]=useState(startup.recovery?'Your earlier simple draft could not be opened. It is preserved; use Save to keep this cabinet.':''),[name,setName]=useState(cabinet.name==='Untitled cabinet'?'Cabinet':cabinet.name);
 const file=useRef<HTMLInputElement>(null),fields=useRef<Partial<Record<Axis,HTMLInputElement|null>>>({}),drag=useRef<Cabinet|null>(null),cancelName=useRef(false),shelfPosition=useRef<HTMLInputElement|null>(null),pendingDimension=useRef<Axis|null>(null);
 useLayoutEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
 useEffect(()=>{setName(snapshot.committed.name==='Untitled cabinet'?'Cabinet':snapshot.committed.name);},[snapshot.committed]);
 useEffect(()=>{setSelection(cabinet.id);},[cabinet.id]);
 useEffect(()=>{
  if(startup.recovery)return;
  try{localStorage.setItem(SIMPLE_AUTOSAVE_KEY,serialize(snapshot.committed));}catch{setNotice('Autosave is unavailable. Use Save to keep a copy.');}
 },[snapshot.committed]);
 useEffect(()=>{
  function key(e:KeyboardEvent){
   if(e.key==='Escape'){store.cancel();drag.current=null;}
   if((e.target as HTMLElement).closest('input,textarea,select,dialog,[contenteditable=true]'))return;
   if(e.key==='Backspace'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){
    const current=store.getSnapshot().committed,shelf=findDivision(current.compartments,selection);
    if(!shelf)return;
    e.preventDefault();if(e.repeat)return;
    if(shelf.children.some(child=>child.kind!=='opening')){setNotice('Remove nested shelves and dividers first.');return;}
    try{if(store.commit(removeDivision(current,shelf.featureId)))setSelection(shelf.id);}catch(error){setNotice((error as Error).message);}
    return;
   }
   if((e.metaKey||e.ctrlKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();e.shiftKey||e.key.toLowerCase()==='y'?store.redo():store.undo();}
  }
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[selection]);
 const review=evaluated.issues.filter(i=>i.code.startsWith('machining-')),reviewKey=JSON.stringify(review),reviewNotice=reviewKey!==dismissedReview?review[0]?.message:'';
 const panel=evaluated.panels.find(p=>p.id===selection),opening=evaluated.openings.find(o=>o.id===selection);
 useEffect(()=>{if(selection!==cabinet.id&&!evaluated.panels.some(p=>p.id===selection)&&!evaluated.openings.some(o=>o.id===selection))setSelection(cabinet.id);},[cabinet,selection,evaluated]);
 useEffect(()=>{if(selection===cabinet.id&&pendingDimension.current){const input=fields.current[pendingDimension.current];input?.focus();input?.select();pendingDimension.current=null;}},[selection,cabinet.id]);
 const defaultCabineoCount=Math.max(1,Math.ceil(Math.max(0,cabinet.envelope.depth-(cabinet.carcass.back.joint?evaluated.opening.origin[2]-cabinet.envelope.origin[2]:0)-100)/300)+1);
 const focus=(axis:Axis)=>{if(selection!==cabinet.id){pendingDimension.current=axis;setSelection(cabinet.id);}else{fields.current[axis]?.focus();fields.current[axis]?.select();}};
 async function load(e:React.ChangeEvent<HTMLInputElement>){
  const selected=e.target.files?.[0];e.target.value='';if(!selected)return;
  try{
   if(selected.size>2_000_000)throw new Error('Choose a cabinet file smaller than 2 MB.');
   const revision=store.getSnapshot().revision,next=named(readSimpleCabinet(await selected.text()));
   if(revision!==store.getSnapshot().revision)throw new Error('The cabinet changed while opening the file. Open it again.');
   if(store.commit(next)){setSelection(next.id);setNotice(`Opened “${next.name}”. Undo returns to your previous cabinet.`);}
  }catch(error){setNotice((error as Error).message);}
 }
 return <div className="app-shell simple-workspace">
  <header className="app-header"><div className="brand"><span className="brand-symbol"><Icon name="cabinet" size={23}/></span><span>Cabinet Studio</span></div><div className="document-actions"><div className="history-actions"><IconButton icon="undo" label="Undo (⌘Z)" disabled={!snapshot.canUndo} onClick={store.undo}/><IconButton icon="redo" label="Redo (⇧⌘Z)" disabled={!snapshot.canRedo} onClick={store.redo}/></div><span className="header-separator" aria-hidden="true"/><IconButton icon="new" label="New cabinet" onClick={()=>{store.commit({...createCabinet(),name:'Cabinet'});setNotice('New cabinet. Undo returns to your previous cabinet.');}}/><IconButton icon="open" label="Open cabinet" onClick={()=>file.current?.click()}/><IconButton icon="save" label="Save cabinet" onClick={()=>{downloadCabinet({...snapshot.committed,name:snapshot.committed.name==='Untitled cabinet'?'Cabinet':snapshot.committed.name});setNotice('Saved a cabinet file.');}}/><span className="header-separator" aria-hidden="true"/><IconButton icon={theme==='graphite'?'sun':'moon'} label={`Switch to ${theme==='graphite'?'light':'dark'} mode`} onClick={()=>setTheme(theme==='graphite'?'linen':'graphite')}/><input ref={file} type="file" accept=".json,application/json" hidden onChange={load}/></div></header>
  <main className="workspace">
   <Structure simple nameEditor={<span className="textbox cabinet-name-input"><input className="textbox__control" aria-label="Cabinet name" onFocus={()=>setSelection(cabinet.id)} maxLength={100} value={name} onChange={e=>setName(e.target.value)} onBlur={()=>{if(cancelName.current){cancelName.current=false;return;}store.commit({...snapshot.committed,name:name.trim()||'Cabinet'});}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){cancelName.current=true;setName(snapshot.committed.name==='Untitled cabinet'?'Cabinet':snapshot.committed.name);e.currentTarget.blur();}}}/></span>} cabinet={cabinet} evaluated={evaluated} selection={selection} onSelect={setSelection}/>
   <div className="canvas-area"><Viewport simple cabinet={cabinet} evaluated={evaluated} selection={selection} theme={theme} preview={!!snapshot.preview} cutaway={false} plinthVisible frontsVisible doorAngles={{}}
    onSelect={setSelection} onEdit={focus} onEditDivision={()=>{shelfPosition.current?.focus();shelfPosition.current?.select();}} onPreviewDivision={(id,value)=>{if(drag.current)store.preview(moveDivision(drag.current,id,value));}}
    onDragStart={()=>{store.cancel();drag.current=store.getSnapshot().committed;}}
    onPreview={(axis,value)=>{if(drag.current)store.preview(resizeCabinet(drag.current,axis,value));}}
    onCommit={()=>{const s=store.getSnapshot();if(s.preview&&!s.error)store.commit();drag.current=null;}}
    onCancel={()=>{store.cancel();drag.current=null;}}/>
    {(snapshot.error||notice||reviewNotice)&&<Notice message={snapshot.error||notice||reviewNotice!} error={!!snapshot.error||!!reviewNotice} onDismiss={()=>{store.cancel();setNotice('');setDismissedReview(reviewKey);}}/>}
   </div>
   <aside className="inspector" aria-label="Cabinet inspector"><div className="inspector-title"><h2>{selection===cabinet.id?'Size & shape':panel?.label??opening?.label??'Selection'}</h2></div>
    {selection===cabinet.id&&<><Section title="Cabinet type"><label className="construction-choice">Size preset<span className="select select--fluid"><select aria-label="Cabinet type" value={presets.find(p=>p.width===cabinet.envelope.width&&p.height===cabinet.envelope.height&&p.depth===cabinet.envelope.depth)?.id??''} onChange={e=>{if(!e.target.value)return;try{store.commit(applySimplePreset(snapshot.committed,e.target.value as PresetId));}catch(error){setNotice((error as Error).message);}}}><option value="">Custom size</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name} · {p.width} × {p.height} × {p.depth}</option>)}</select><Icon name="chevron" size={12}/></span></label></Section>
    <Section title="Dimensions" aside={<span className="unit-badge">mm</span>}>{(['width','height','depth'] as const).map(axis=><DimensionField plain key={axis} axis={axis} label={axis[0].toUpperCase()+axis.slice(1)} value={cabinet.envelope[axis]} cancelValue={snapshot.committed.envelope[axis]} onPreview={v=>{store.preview(resizeCabinet(snapshot.committed,axis,v));}} onCommit={v=>store.commit(resizeCabinet(snapshot.committed,axis,v))} onCancel={store.cancel} register={el=>{fields.current[axis]=el;}}/>)}<DimensionField plain label="Stock thickness" value={stock(cabinet,'carcass').thickness} cancelValue={stock(snapshot.committed,'carcass').thickness} limits={{min:3,max:24}} onPreview={()=>{}} onCommit={n=>{try{return store.commit(setStockThickness(snapshot.committed,n));}catch(e){setNotice((e as Error).message);return false;}}} onCancel={store.cancel}/></Section><Section title="Corner joints"><span className="select select--fluid"><select aria-label="Corner joints" value={cabinet.carcass.corner?'puzzle':'butt'} onChange={e=>store.commit(setPuzzleCorners(snapshot.committed,e.target.value==='puzzle'))}><option value="butt">Butt joints</option><option value="puzzle">Puzzle / finger joints</option></select><Icon name="chevron" size={12}/></span>{cabinet.carcass.corner&&<DimensionField plain label="Target finger width" value={cabinet.carcass.corner.pitch} cancelValue={snapshot.committed.carcass.corner?.pitch??50} limits={{min:20,max:200}} onPreview={()=>{}} onCommit={pitch=>store.commit({...snapshot.committed,carcass:{...snapshot.committed.carcass,corner:{mode:'puzzle',revision:'puzzle-1',pitch}}})} onCancel={store.cancel}/>}</Section></>}
    {selection===cabinet.id&&<CncInspector cabinet={snapshot.committed} onCommit={store.commit} onCancel={store.cancel}/>}
    {selection===cabinet.id&&<Section title="Fasteners"><label className="construction-choice">Assembly connectors<span className="select select--fluid"><select aria-label="Assembly connectors" value={cabinet.hardware[0]?.id??''} onChange={e=>store.commit(setCabineo(snapshot.committed,e.target.value as CabineoId|''))}><option value="">None</option>{Object.entries(cabineoVariants).map(([id,v])=><option key={id} value={id}>{v.name}</option>)}</select><Icon name="chevron" size={12}/></span></label>{cabinet.hardware.length>0&&<><DimensionField plain label="Cabineo per side" value={cnc(cabinet).cabineoPerSide||defaultCabineoCount} cancelValue={cnc(cabinet).cabineoPerSide||defaultCabineoCount} limits={{min:1,max:20}} onPreview={()=>{}} onCommit={cabineoPerSide=>store.commit(setCnc(snapshot.committed,{cabineoPerSide}))} onCancel={store.cancel}/><div className="data-row"><span>Connectors</span><strong>{evaluated.cabineo.length}</strong></div><p className="field-note">{cabinet.carcass.corner?'Fixed interiors only · puzzle corners interlock':'Surface mounted · 50 mm end setback · spacing ≤300 mm'}</p></>}</Section>}
    {evaluated.issues.some(i=>i.code.startsWith('machining-')&&(i.code==='machining-collision'||selection===cabinet.id||i.featureId===selection))&&<Section title="Machining checks">{evaluated.issues.filter(i=>i.code.startsWith('machining-')&&(i.code==='machining-collision'||selection===cabinet.id||i.featureId===selection)).map((i,n)=><p key={n} className="machining-warning"><Icon name="attention" size={16}/>{i.message}</p>)}</Section>}
    {panel?.role==='back'&&<BackPanelInspector cabinet={snapshot.committed} onCommit={store.commit} onCancel={store.cancel}/>}
    {panel&&<PartThumbnail key={panel.id} panel={panel} joints={evaluated.cabineo} pockets={evaluated.pockets} backBores={evaluated.backFasteners}/>}
    <SimpleInteriorInspector cabinet={cabinet} committed={snapshot.committed} evaluated={evaluated} selection={selection} onCommit={store.commit} onCancel={store.cancel} onSelect={setSelection} onNotice={setNotice} positionRef={el=>{shelfPosition.current=el;}}/>
    {opening&&!evaluated.divisions.some(d=>d.id===selection)&&<Section title={panel?.label??'Interior opening'}><div className="data-row"><span>Size</span><strong>{(panel?.size??opening!.size).map(n=>+n.toFixed(1)).join(' × ')} mm</strong></div><p className="field-note">{panel?'Panel size follows the cabinet dimensions.':'Clear space inside the cabinet.'}</p></Section>}

   </aside>
  </main>

 </div>;
}
