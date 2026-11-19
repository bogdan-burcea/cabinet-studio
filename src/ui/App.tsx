import {backFastenerInteriorRepairs} from '../commands/machining-repairs';
import {WallHangingInspector} from './WallHangingInspector';
import {bottomFaceRepairs,hingePlateRepairs,doorOpeningRepairs,footHoleRepairs,oneFaceRepairs} from '../commands/clearance-repairs';
import {BaseSupportInspector} from './BaseSupportInspector';
import {renameItem} from '../commands/item-names';
import {backFixingRepairs} from '../commands/machining-repairs';
import {MachiningChecks,affectedItems} from './MachiningChecks';
import {toolingRepairs} from '../commands/tooling-repairs';
import {doorAngleLimit,safeDoorAngles} from '../rules/door-motion';
import {SimpleDoorInspector} from './SimpleDoorInspector';
import {removeDoor} from '../commands/fronts';
import {elementIcon} from './element-icons';
import {SimpleAdjustableInspector} from './SimpleAdjustableInspector';
import {moveAdjustable,removeAdjustable} from '../commands/adjustable';
import {EditConflict,type PendingEdit} from './EditConflict';
import {editRepairs} from '../commands/edit-repairs';
import {removeDivisionTree} from '../commands/interiors';
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
import {moveDivision,findDivision} from '../commands/interiors';
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
import {IconButton,Section,Notice,FieldPair,InspectorSections} from './components';
import {DimensionField} from './DimensionField';
import {Structure} from './Structure';
function revealField(input:HTMLInputElement|null|undefined){const details=input?.closest('details');if(details)details.open=true;input?.focus();input?.select();}
function named(c:Cabinet):Cabinet{const type=c.cabinetType??presets.find(p=>p.width===c.envelope.width&&p.height===c.envelope.height&&p.depth===c.envelope.depth)?.id;return {...c,name:c.name==='Untitled cabinet'?'Cabinet':c.name,...type?{cabinetType:type}:{}};}
function initial(){
 try{const raw=localStorage.getItem(SIMPLE_AUTOSAVE_KEY);return {cabinet:named(raw?readSimpleCabinet(raw):createCabinet()),recovery:false};}
 catch{return {cabinet:named(createCabinet()),recovery:true};}
}
const startup=initial(),store=new CabinetStore(startup.cabinet);
export function App(){
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot),cabinet=snapshot.preview??snapshot.committed;
 const evaluated=useMemo(()=>evaluate(cabinet),[cabinet]);
 const [selectedIds,setSelectedIds]=useState([cabinet.id]),[theme,setTheme]=useState<ThemeName>('linen');
 const selection=selectedIds[selectedIds.length-1]??cabinet.id;
 const [pendingEdit,setPendingEdit]=useState<PendingEdit|null>(null);
 const failedCandidate=useRef<Cabinet|null>(null);
 const [hiddenIds,setHiddenIds]=useState<string[]>([]);
 const [doorAngles,setDoorAngles]=useState<Record<string,number>>({});
 function setSelection(id:string){setSelectedIds([id]);}
 function select(id:string,additive=false){
  if(!additive){setSelection(id);return;}
  const kindOf=(id:string)=>evaluated.openings.some(o=>o.id===id)?'opening':cabinet.fronts.some(d=>d.id===id)?'door':cabinet.contents.some(s=>s.id===id)?'adjustable':evaluated.divisions.find(d=>d.id===id)?.axis;
  const kind=kindOf(id);
  if(!kind||selectedIds.some(selected=>kindOf(selected)!==kind)){if(selectedIds.length===1&&selectedIds[0]===cabinet.id){setSelection(id);return;}setNotice('Select openings together, or select elements of the same kind using Shift, Cmd or Ctrl.');return;}
  setSelectedIds(ids=>ids.includes(id)?(ids.length>1?ids.filter(i=>i!==id):[cabinet.id]):[...ids,id]);
 }
 function commit(candidate=store.getSnapshot().preview):boolean {
  if(!candidate)return false;
  if(store.commit(candidate)){setPendingEdit(null);return true;}
  const error=store.getSnapshot().error;
  if(error){store.cancel();setNotice('');setPendingEdit({message:error,options:editRepairs(candidate,store.getSnapshot().committed),base:store.getSnapshot().committed});}
  return false;
 }
 function requestRemoval(ids:string[]){
  const base=store.getSnapshot().committed;let next=base,nested=false;
  for(const id of ids){if(next.fronts.some(d=>d.id===id)){next=removeDoor(next,id);continue;}if(next.contents.some(s=>s.id===id)){next=removeAdjustable(next,id);continue;}const node=findDivision(next.compartments,id);if(!node)continue;nested ||= node.children.some(child=>child.kind!=='opening'||next.contents.some(s=>s.openingId===child.id));next=removeDivisionTree(next,id);}
  if(nested){const count=evaluate(base).divisions.length+base.contents.length-evaluate(next).divisions.length-next.contents.length;setPendingEdit({title:'Remove nested interiors?',message:`Remove nested shelves and dividers first. Remove all ${count} selected and nested parts instead?`,options:[{label:`Remove all ${count} parts`,cabinet:next}],base});}
  else if(commit(next))setSelection(cabinet.id);
 }
 const [notice,setNoticeText]=useState(startup.recovery?'Your earlier simple draft could not be opened. It is preserved; use Save to keep this cabinet.':''),[name,setName]=useState(cabinet.name==='Untitled cabinet'?'Cabinet':cabinet.name);
 const [noticeError,setNoticeError]=useState(!!startup.recovery);
 function setNotice(message:string,error=false){setNoticeText(message);setNoticeError(error);}
 const file=useRef<HTMLInputElement>(null),fields=useRef<Partial<Record<Axis,HTMLInputElement|null>>>({}),drag=useRef<Cabinet|null>(null),cancelName=useRef(false),shelfPosition=useRef<HTMLInputElement|null>(null),pendingDimension=useRef<Axis|null>(null);
 useLayoutEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
 useEffect(()=>{setName(snapshot.committed.name==='Untitled cabinet'?'Cabinet':snapshot.committed.name);},[snapshot.committed]);
 useEffect(()=>{setSelection(cabinet.id);setDoorAngles({});setHiddenIds([]);},[cabinet.id]);
 useEffect(()=>{
  if(startup.recovery)return;
  try{localStorage.setItem(SIMPLE_AUTOSAVE_KEY,serialize(snapshot.committed));}catch{setNotice('Autosave is unavailable. Use Save to keep a copy.');}
 },[snapshot.committed]);
 useEffect(()=>{
  function key(e:KeyboardEvent){
   if(e.key==='Escape'){store.cancel();drag.current=null;}
   if((e.target as HTMLElement).closest('input,textarea,select,dialog,[contenteditable=true]'))return;
   if(e.key==='Backspace'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){
    if(!selectedIds.some(id=>findDivision(store.getSnapshot().committed.compartments,id)||store.getSnapshot().committed.contents.some(s=>s.id===id)||store.getSnapshot().committed.fronts.some(d=>d.id===id)))return;
    e.preventDefault();if(e.repeat)return;requestRemoval(selectedIds);
    return;
   }
   if((e.metaKey||e.ctrlKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();e.shiftKey||e.key.toLowerCase()==='y'?store.redo():store.undo();}
  }
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[selectedIds]);
 useEffect(()=>{const feedback=(e:Event)=>{const d=(e as CustomEvent<{message:string;error:boolean}>).detail;setNotice(d.message,d.error);};window.addEventListener('cabinet-input-feedback',feedback);return()=>window.removeEventListener('cabinet-input-feedback',feedback);},[]);
 const review=evaluated.issues.filter(i=>i.code.startsWith('machining-'));
 const panel=evaluated.panels.find(p=>p.id===selection),opening=evaluated.openings.find(o=>o.id===selection),foot=evaluated.installation.feet.find(f=>f.id===selection);
 useEffect(()=>{const valid=selectedIds.filter(id=>id===cabinet.id||evaluated.panels.some(p=>p.id===id)||evaluated.openings.some(o=>o.id===id)||evaluated.installation.feet.some(f=>f.id===id));if(valid.length!==selectedIds.length)setSelectedIds(valid.length?valid:[cabinet.id]);},[cabinet,selectedIds,evaluated]);
 useEffect(()=>{if(selection===cabinet.id&&pendingDimension.current){const input=fields.current[pendingDimension.current];revealField(input);pendingDimension.current=null;}},[selection,cabinet.id]);
 const selectedReview=review.filter(i=>selection===cabinet.id||selectedIds.some(id=>affectedItems(i).includes(id)));
 function resolveMachining(issues=selectedReview){
  const faceIssues=issues.filter(i=>i.code==='machining-faces'),faceIds=faceIssues.map(i=>i.featureId);
  const hole=issues.some(i=>i.code==='machining-hole-collision'||i.code==='machining-collision'&&i.operationIds?.some(id=>id.includes('/installation/foot/'))),collision=issues.some(i=>i.code==='machining-collision'),plate=issues.some(i=>i.code==='machining-hinge-plate'),faces=issues.some(i=>i.code==='machining-faces'&&i.featureId===`${cabinet.id}/panel/bottom`),tool=issues.some(i=>i.code==='machining-tool-width');
  const backIds=new Set(evaluated.backFasteners.map(b=>b.id)),backCollision=issues.some(i=>i.operationIds?.some(id=>backIds.has(id)));
  const options=[...oneFaceRepairs(snapshot.committed,faceIds),...hole?footHoleRepairs(snapshot.committed):[],...plate?hingePlateRepairs(snapshot.committed):[],...faces?bottomFaceRepairs(snapshot.committed):[],...backCollision?[...backFastenerInteriorRepairs(snapshot.committed,issues),...backFixingRepairs(snapshot.committed)]:[],...tool?toolingRepairs(snapshot.committed):[]];
  setPendingEdit({title:'Resolve machining check',message:faceIssues.length===issues.length&&faceIssues.length===1?faceIssues[0].message:hole?'Two drilled features overlap. Choose a clear placement or adjust their layout.':plate?'Move the obstructed hinge mounting zones to the nearest clear positions.':faceIds.length?'Some parts have blind cuts on both faces.':backCollision?'Choose a clear position for the affected part or back fixing, or cut the affected rear corner at 45° where it fits.':collision?'Adjust the connection layout.':issues[0]?.message??'Review the machining setup.',options,base:snapshot.committed});
 }
 function operateDoors(ids:string[],angle:number){
  const result=safeDoorAngles(evaluated,doorAngles,ids,angle);setDoorAngles(result.angles);
  if(result.blocked){const hit=result.collision!,label=(id:string)=>evaluated.panels.find(p=>p.id===id)?.label??(id.includes('/handle/')?'handle':'part');setPendingEdit({title:'Door opening blocked',message:`${label(hit.movingId)} meets ${label(hit.otherId)} near ${Math.round(hit.angle)}°. This front-edge clearance study is not verified Blum linkage motion.`,options:doorOpeningRepairs(snapshot.committed,ids,angle),base:snapshot.committed,motion:{ids,target:angle}});}
 }
 const doorIds=cabinet.fronts.map(d=>d.id),doorsOpen=doorIds.length>0&&doorIds.every(id=>(doorAngles[id]??0)>0);
 const reviewKey=JSON.stringify(review),[dismissedReview,setDismissedReview]=useState('');
 const reviewNotice=review.length&&reviewKey!==dismissedReview?`${review.length} machining ${review.length===1?'check needs':'checks need'} review`:'';
 const defaultCabineoCount=Math.max(1,Math.ceil(Math.max(0,cabinet.envelope.depth-(cabinet.carcass.back.joint?evaluated.opening.origin[2]-cabinet.envelope.origin[2]:0)-100)/300)+1);
 const focus=(axis:Axis)=>{if(selection!==cabinet.id){pendingDimension.current=axis;setSelection(cabinet.id);}else{revealField(fields.current[axis]);}};
 async function load(e:React.ChangeEvent<HTMLInputElement>){
  const selected=e.target.files?.[0];e.target.value='';if(!selected)return;
  try{
   if(selected.size>2_000_000)throw new Error('Choose a cabinet file smaller than 2 MB.');
   const revision=store.getSnapshot().revision,next=named(readSimpleCabinet(await selected.text()));
   if(revision!==store.getSnapshot().revision)throw new Error('The cabinet changed while opening the file. Open it again.');
   if(commit(next)){setSelection(next.id);setNotice(`Opened “${next.name}”. Undo returns to your previous cabinet.`);}
  }catch(error){setNotice((error as Error).message,true);}
 }
 return <div className="app-shell simple-workspace">
  <header className="app-header"><div className="brand"><span className="brand-symbol"><Icon name="cabinet" size={23}/></span><span>Cabinet Studio</span></div><div className="document-actions"><div className="history-actions"><IconButton icon="undo" label="Undo (⌘Z)" disabled={!snapshot.canUndo} onClick={store.undo}/><IconButton icon="redo" label="Redo (⇧⌘Z)" disabled={!snapshot.canRedo} onClick={store.redo}/></div><span className="header-separator" aria-hidden="true"/><IconButton icon="new" label="New cabinet" onClick={()=>{commit({...createCabinet(),name:'Cabinet',cabinetType:'base'});setNotice('New cabinet. Undo returns to your previous cabinet.');}}/><IconButton icon="open" label="Open cabinet" onClick={()=>file.current?.click()}/><IconButton icon="save" label="Save cabinet" onClick={()=>{downloadCabinet({...snapshot.committed,name:snapshot.committed.name==='Untitled cabinet'?'Cabinet':snapshot.committed.name});setNotice('Saved a cabinet file.');}}/><span className="header-separator" aria-hidden="true"/><IconButton icon={theme==='graphite'?'sun':'moon'} label={`Switch to ${theme==='graphite'?'light':'dark'} mode`} onClick={()=>setTheme(theme==='graphite'?'linen':'graphite')}/><input ref={file} type="file" accept=".json,application/json" hidden onChange={load}/></div></header>
  <main className="workspace">
   <Structure simple nameEditor={<span className="textbox cabinet-name-input"><input className="textbox__control" aria-label="Cabinet name" onFocus={()=>setSelection(cabinet.id)} maxLength={100} value={name} onChange={e=>setName(e.target.value)} onBlur={()=>{if(cancelName.current){cancelName.current=false;return;}commit({...snapshot.committed,name:name.trim()||'Cabinet'});}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){cancelName.current=true;setName(snapshot.committed.name==='Untitled cabinet'?'Cabinet':snapshot.committed.name);e.currentTarget.blur();}}}/></span>} cabinet={cabinet} evaluated={evaluated} selection={selection} selectedIds={selectedIds} onSelect={select} onRename={(id,label)=>commit(renameItem(snapshot.committed,id,label))} hiddenIds={hiddenIds} onToggleVisibility={id=>setHiddenIds(ids=>ids.includes(id)?ids.filter(v=>v!==id):[...ids,id])}/>
   <div className="canvas-area"><Viewport hiddenIds={hiddenIds} onToggleDoors={doorIds.length?()=>operateDoors(doorIds,doorsOpen?0:Math.max(...doorIds.map(id=>doorAngleLimit(evaluated,id)))):undefined} doorsOpen={doorsOpen} simple cabinet={cabinet} evaluated={evaluated} selection={selection} selectedIds={selectedIds} theme={theme} preview={!!snapshot.preview} cutaway={false} plinthVisible frontsVisible doorAngles={doorAngles}
     onSelect={select} onEdit={focus} onEditDivision={()=>{revealField(shelfPosition.current);}} onPreviewDivision={(id,value)=>{if(drag.current){failedCandidate.current=drag.current.contents.some(s=>s.id===id)?moveAdjustable(drag.current,id,value):moveDivision(drag.current,id,value);store.preview(failedCandidate.current);}}}
    onDragStart={()=>{store.cancel();failedCandidate.current=null;drag.current=store.getSnapshot().committed;}}
    onPreview={(axis,value)=>{if(drag.current){failedCandidate.current=resizeCabinet(drag.current,axis,value);store.preview(failedCandidate.current);}}}
    onCommit={()=>{const s=store.getSnapshot();if(failedCandidate.current||s.preview)commit(failedCandidate.current??s.preview);drag.current=null;failedCandidate.current=null;}}
    onCancel={()=>{store.cancel();drag.current=null;failedCandidate.current=null;}}/>
    {(snapshot.error||notice||reviewNotice)&&<Notice message={snapshot.error||notice||reviewNotice} error={!!snapshot.error||!!notice&&noticeError||!notice&&!!reviewNotice} onAction={!snapshot.error&&!notice&&reviewNotice?()=>resolveMachining(review):undefined} onDismiss={()=>{if(snapshot.error)store.cancel();setNotice('');setDismissedReview(reviewKey);}}/>}
   </div>
   <aside className="inspector" aria-label="Cabinet inspector"><div className="inspector-title"><h2><Icon name={opening?'element-opening':panel?elementIcon(panel.role,cabinet.contents.some(s=>s.id===selection)):foot?'element-foot':'cube'} size={24}/><span>{selectedIds.length>1?`${selectedIds.length} ${opening?'openings':panel?.role==='door'?'doors':panel?.role==='shelf'?'shelves':'dividers'}`:selection===cabinet.id?'Size & shape':panel?.label??opening?.label??foot?.label??'Selection'}</span></h2><div className="inspector-title-actions">{selectedIds.every(id=>cabinet.fronts.some(d=>d.id===id)||cabinet.contents.some(s=>s.id===id)||evaluated.divisions.some(d=>d.id===id))&&<IconButton icon="delete" label={selectedIds.length>1?"Remove selected items":"Remove selected item"} onClick={()=>requestRemoval(selectedIds)}/>}</div></div>
    <InspectorSections key={selection} accordion={selection===cabinet.id}>
    {selection===cabinet.id&&<><Section title="Cabinet type"><label className="construction-choice">Size preset<span className="select select--fluid"><select aria-label="Cabinet type" value={presets.find(p=>p.width===cabinet.envelope.width&&p.height===cabinet.envelope.height&&p.depth===cabinet.envelope.depth)?.id??''} onChange={e=>{if(!e.target.value)return;try{commit(applySimplePreset(snapshot.committed,e.target.value as PresetId));}catch(error){setNotice((error as Error).message,true);}}}><option value="">Custom size</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name} · {p.width} × {p.height} × {p.depth}</option>)}</select><Icon name="chevron" size={12}/></span></label></Section>
    <Section title="Dimensions" aside={<span className="unit-badge">mm</span>}><FieldPair>{(['width','height','depth'] as const).map(axis=><DimensionField plain key={axis} axis={axis} label={axis[0].toUpperCase()+axis.slice(1)} value={cabinet.envelope[axis]} cancelValue={snapshot.committed.envelope[axis]} onPreview={v=>{store.preview(resizeCabinet(snapshot.committed,axis,v));}} onCommit={v=>commit(resizeCabinet(snapshot.committed,axis,v))} onCancel={store.cancel} register={el=>{fields.current[axis]=el;}}/>)}<DimensionField plain label="Stock" accessibleLabel="Stock thickness" value={stock(cabinet,'carcass').thickness} cancelValue={stock(snapshot.committed,'carcass').thickness} limits={{min:3,max:24}} onPreview={()=>{}} onCommit={n=>{try{return commit(setStockThickness(snapshot.committed,n));}catch(e){setNotice((e as Error).message,true);return false;}}} onCancel={store.cancel}/></FieldPair></Section><Section title="Corner joints"><span className="select select--fluid"><select aria-label="Corner joints" value={cabinet.carcass.corner?'puzzle':'butt'} onChange={e=>commit(setPuzzleCorners(snapshot.committed,e.target.value==='puzzle'))}><option value="butt">Butt joints</option><option value="puzzle">Puzzle / finger joints</option></select><Icon name="chevron" size={12}/></span>{cabinet.carcass.corner&&<DimensionField plain stacked label="Target finger width" value={cabinet.carcass.corner.pitch} cancelValue={snapshot.committed.carcass.corner?.pitch??50} limits={{min:20,max:200}} onPreview={()=>{}} onCommit={pitch=>commit({...snapshot.committed,carcass:{...snapshot.committed.carcass,corner:{mode:'puzzle',revision:'puzzle-1',pitch}}})} onCancel={store.cancel}/>}</Section></>}
    {(selection===cabinet.id||panel?.role==='bottom')&&<BaseSupportInspector cabinet={snapshot.committed} onCommit={commit} onCancel={store.cancel}/>}
    {selection===cabinet.id&&<CncInspector cabinet={snapshot.committed} onCommit={commit} onCancel={store.cancel}/>}
    {selection===cabinet.id&&<Section title="Fasteners"><label className="construction-choice">Assembly connectors<span className="select select--fluid"><select aria-label="Assembly connectors" value={cabinet.hardware[0]?.id??''} onChange={e=>commit(setCabineo(snapshot.committed,e.target.value as CabineoId|''))}><option value="">None</option>{Object.entries(cabineoVariants).map(([id,v])=><option key={id} value={id}>{v.name}</option>)}</select><Icon name="chevron" size={12}/></span></label>{cabinet.hardware.length>0&&<><FieldPair><DimensionField plain label="Cabineo per side" value={cnc(cabinet).cabineoPerSide||defaultCabineoCount} cancelValue={cnc(cabinet).cabineoPerSide||defaultCabineoCount} limits={{min:1,max:20}} onPreview={()=>{}} onCommit={cabineoPerSide=>commit(setCnc(snapshot.committed,{cabineoPerSide}))} onCancel={store.cancel}/><DimensionField plain disabled label="Connectors" accessibleLabel="Calculated connector count" value={evaluated.cabineo.length} cancelValue={evaluated.cabineo.length} limits={{min:0,max:9999}} onPreview={()=>{}} onCommit={()=>true} onCancel={()=>{}}/></FieldPair><p className="field-note">{cabinet.carcass.corner?'Fixed interiors only · puzzle corners interlock':'Surface mounted · 50 mm end setback · spacing ≤300 mm'}</p></>}</Section>}
    {selection===cabinet.id&&cabinet.cabinetType==='wall'&&<WallHangingInspector cabinet={snapshot.committed} onCommit={commit} onCancel={store.cancel}/>}
    <MachiningChecks issues={selectedReview} onResolve={()=>resolveMachining()}/>
    {cabinet.fronts.some(d=>selectedIds.includes(d.id))&&<SimpleDoorInspector cabinet={snapshot.committed} evaluated={evaluated} ids={selectedIds} onCommit={commit} onCancel={store.cancel} onSelect={setSelectedIds} onRemove={requestRemoval} onNotice={message=>setNotice(message,true)}/>}
    {panel?.role==='bottom'&&<Section title="Bottom fasteners"><label className="construction-choice">Machining face<span className="select select--fluid"><select aria-label="Bottom fastener face" value={cnc(cabinet).bottomFastenersThrough?'outside-through':cnc(cabinet).bottomFace??'outside'} onChange={e=>{const value=e.target.value;commit(setCnc(snapshot.committed,{bottomFace:value==='inside'?'inside':'outside',bottomFastenersThrough:value==='outside-through'}));}}><option value="inside">Inside</option><option value="outside">Outside</option>{cnc(cabinet).bottomFastenersThrough&&<option value="outside-through">Outside · through cuts</option>}</select><Icon name="chevron" size={12}/></span></label></Section>}
    {panel?.role==='back'&&<BackPanelInspector cabinet={snapshot.committed} onCommit={commit} onCancel={store.cancel}/>}
    {selectedIds.length===1&&panel&&<PartThumbnail key={panel.id} panel={panel} joints={evaluated.cabineo} pockets={evaluated.pockets} backBores={evaluated.backFasteners} drilling={evaluated.drilling}/>}
    {cabinet.contents.some(s=>s.id===selection)?<SimpleAdjustableInspector onSelect={setSelection} committed={snapshot.committed} evaluated={evaluated} ids={selectedIds} onCommit={commit} onCancel={store.cancel} onRemove={requestRemoval} onNotice={message=>setNotice(message,true)} positionRef={el=>{shelfPosition.current=el;}}/>:<SimpleInteriorInspector cabinet={cabinet} committed={snapshot.committed} evaluated={evaluated} selection={selection} selectedIds={selectedIds} onRemove={requestRemoval} onCommit={commit} onCancel={store.cancel} onSelect={setSelection} onSelectMany={setSelectedIds} onNotice={message=>setNotice(message,true)} positionRef={el=>{shelfPosition.current=el;}}/>}
    {selectedIds.length===1&&opening&&!evaluated.divisions.some(d=>d.id===selection)&&<Section title={panel?.label??'Interior opening'}><div className="data-row"><span>Size</span><strong>{(panel?.size??opening!.size).map(n=>+n.toFixed(1)).join(' × ')} mm</strong></div><p className="field-note">{panel?'Panel size follows the cabinet dimensions.':'Clear space inside the cabinet.'}</p></Section>}

    </InspectorSections>
   </aside>
  </main>

 {pendingEdit&&<EditConflict key={snapshot.revision} edit={pendingEdit} onCancel={()=>setPendingEdit(null)} onApply={index=>{if(pendingEdit.base!==store.getSnapshot().committed){setPendingEdit(null);setNotice('The cabinet changed. Try the edit again.');return;}const option=pendingEdit.options[index];if(option){const motion=pendingEdit.motion;if(commit(option.cabinet)){if(motion)setDoorAngles(safeDoorAngles(evaluate(option.cabinet),{},motion.ids,motion.target).angles);else if(pendingEdit.title)setSelection(cabinet.id);}}}}/>}
 </div>;
}
