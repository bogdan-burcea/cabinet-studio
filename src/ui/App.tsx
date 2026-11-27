import {EdgeBandingInspector} from './EdgeBandingInspector';
import {AssemblyWorkspace,type AssemblyApi} from './AssemblyWorkspace';
import {deserializeAssembly} from '../persistence/assembly';
import {LIBRARY_WORKING_COPY_KEY,LibraryWorkingCopy,readLibrary,findLibrarySnapshot} from '../persistence/library';
import {LibrarySaveDialog} from './LibrarySaveDialog';
import {saveToLibrary} from './save-to-library';
import {CabinetLibrary} from './CabinetLibrary';
import {physicalPockets} from '../rules/shaker';
import {holeSpacingRepairs} from '../commands/hole-spacing-repairs';
import {railCollisionRepairs} from '../commands/rail-collision-repairs';
import {constructionOwner,isConstructionSelection} from '../domain/construction-selection';
import {SimpleConstructionInspector} from './SimpleConstructionInspector';
import {CostPanel} from './CostPanel';
import type {PlacementHistory} from '../cnc/placement-history';
import {removalPlan} from '../commands/removal';
import {FrontFeaturesInspector} from './FrontFeaturesInspector';
import {frontTargets} from '../commands/front-features';
import {HingeInspector} from './HingeInspector';
import {fitDrawerRails} from '../rules/drawer-rails';
import {SimpleDrawerInspector} from './SimpleDrawerInspector';
import {removeMetalDrawer} from '../commands/drawers';
import {flattenParts} from '../cnc/parts';
import type {SheetSettings} from '../cnc/layout';
import {cabinetForExport} from '../cnc/sheet-export';
import {downloadSheetStep,requestSheetStep} from '../cnc/step-download';
import {CncWorkspace} from './CncWorkspace';
import {WorkspaceTabs,type Workspace} from './WorkspaceTabs';
import {backFastenerInteriorRepairs} from '../commands/machining-repairs';
import {WallHangingInspector} from './WallHangingInspector';
import {bottomFaceRepairs,hingePlateRepairs,innerDrawerOpeningRepairs,doorOpeningRepairs,footHoleRepairs,oneFaceRepairs} from '../commands/clearance-repairs';
import {BaseSupportInspector} from './BaseSupportInspector';
import {renameItem} from '../commands/item-names';
import {backFixingRepairs} from '../commands/machining-repairs';
import {MachiningChecks,affectedItems} from './MachiningChecks';
import {toolingRepairs} from '../commands/tooling-repairs';
import {drawerOpeningEditIssue,fitNewPantryHinges} from '../commands/drawer-opening-preflight';
import {drawerOpeningIssue,doorAngleLimit,safeDoorAngles,safeInnerDrawerExtensions} from '../rules/door-motion';
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
import {setCnc,setPartCabineoCount,resetGlobalCabineoCount} from '../commands/cnc';
import {setStockThickness,setPuzzleCorners} from '../commands/stock';
import {stock} from '../catalogue/materials';
import {BackPanelInspector} from './BackPanelInspector';
import {PartThumbnail} from './PartThumbnail';
import {ConstructionThumbnail} from './ConstructionThumbnail';
import {setCabineo} from '../commands/cabineo';
import {cabineoVariants,type CabineoId} from '../catalogue/cabineo';
import {presets,type PresetId} from '../catalogue/presets';
import {applySimplePreset} from '../commands/simple-presets';
import {SimpleInteriorInspector} from './SimpleInteriorInspector';
import {moveDivision,findDivision} from '../commands/interiors';
import {Fragment,useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {createCabinet,type Axis,type Cabinet} from '../domain/cabinet';
import {SIMPLE_AUTOSAVE_KEY,readSimpleCabinet} from '../persistence/simple';
import {CabinetStore} from '../commands/store';
import {resizeCabinet} from '../commands/dimensions';
import {evaluate} from '../geometry/evaluate';
import {downloadCabinet,serialize} from '../persistence/files';
import type {ThemeName} from '../design-system/themes';
import {Icon} from '../design-system/Icon';
import {Viewport} from '../viewport/Viewport';
import {Button,IconButton,Section,Notice,FieldPair,InspectorSections} from './components';
import {DimensionField} from './DimensionField';
import {Structure} from './Structure';
function revealField(input:HTMLInputElement|null|undefined){const details=input?.closest('details');if(details)details.open=true;input?.focus();input?.select();}
function named(c:Cabinet):Cabinet{c=fitDrawerRails(c);const type=c.cabinetType??presets.find(p=>p.width===c.envelope.width&&p.height===c.envelope.height&&p.depth===c.envelope.depth)?.id;return {...c,name:c.name==='Untitled cabinet'?'Cabinet':c.name,...type?{cabinetType:type}:{}};}
function initial(){
 try{const raw=localStorage.getItem(SIMPLE_AUTOSAVE_KEY);return {cabinet:named(raw?readSimpleCabinet(raw):createCabinet()),recovery:false};}
 catch{return {cabinet:named(createCabinet()),recovery:true};}
}
const startup=initial(),store=new CabinetStore(startup.cabinet);
const ASSEMBLY_BUILD_LINK_KEY='wemakebox.assembly-build-link.v1';
function restoredAssemblyBuildLink():{itemId:string;cabinetId:string}|null {try{const saved=JSON.parse(localStorage.getItem(ASSEMBLY_BUILD_LINK_KEY)??'null');return typeof saved?.itemId==='string'&&saved.cabinetId===startup.cabinet.id?saved:null;}catch{return null;}}
export function App(){
 const exportingCabinet=useRef(false);
 const [cabinetStepProgress,setCabinetStepProgress]=useState('');
 const assemblyApi=useRef<AssemblyApi|null>(null),assemblyBuildLink=useRef<{itemId:string;cabinetId:string}|null>(restoredAssemblyBuildLink()),[assemblyHistory,setAssemblyHistory]=useState({canUndo:false,canRedo:false});
 function linkAssemblyBuild(next:{itemId:string;cabinetId:string}|null){assemblyBuildLink.current=next;try{localStorage.setItem(ASSEMBLY_BUILD_LINK_KEY,JSON.stringify(next));}catch{}}
 const [workspace,setWorkspace]=useState<Workspace>('box');
 const [savingLibrary,setSavingLibrary]=useState(false),savingLibraryRef=useRef(false);
 const [librarySaveChoice,setLibrarySaveChoice]=useState<{source:Cabinet;entryId:string}|null>(null);
 async function performLibrarySave(source:Cabinet,overwriteId?:string){if(savingLibraryRef.current)return;savingLibraryRef.current=true;setSavingLibrary(true);try{await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));const entryId=saveToLibrary(source,overwriteId);workingCopy.current!.link(source,entryId);workingCopy.current!.update(store.getSnapshot().committed);setLibrarySaveChoice(null);}catch(error){setNotice((error as Error).message,true);setLibrarySaveChoice(null);}finally{savingLibraryRef.current=false;setSavingLibrary(false);}}
 function saveLibrary(){try{const source=store.getSnapshot().committed,entries=readLibrary(localStorage),origin=workingCopy.current!.entryId??findLibrarySnapshot(entries,source),entryId=entries.find(e=>e.id===origin)?.id;if(entryId)setLibrarySaveChoice({source,entryId});else void performLibrarySave(source);}catch(error){setNotice((error as Error).message,true);}}

 const [libraryOpen,setLibraryOpen]=useState(false),libraryTrigger=useRef<HTMLDivElement>(null);
 function closeLibrary(){setLibraryOpen(false);libraryTrigger.current?.querySelector('button')?.focus();}
 const [costsOpen,setCostsOpen]=useState(false),costTrigger=useRef<HTMLDivElement>(null);
 function closeCosts(){setCostsOpen(false);costTrigger.current?.querySelector('button')?.focus();}
 const cncHistory=useRef<PlacementHistory|null>(null),[cutHistory,setCutHistory]=useState({canUndo:false,canRedo:false});
 const undo=()=>workspace==='assembly'?assemblyApi.current?.undo():workspace==='cnc'?cncHistory.current?.undo():store.undo(),redo=()=>workspace==='assembly'?assemblyApi.current?.redo():workspace==='cnc'?cncHistory.current?.redo():store.redo();
 const [sheetSettings,setSheetSettings]=useState<SheetSettings>({});
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot),cabinet=snapshot.preview??snapshot.committed;
 const evaluated=useMemo(()=>{const model=evaluate(cabinet),issue=drawerOpeningIssue(model);return issue?{...model,issues:[...model.issues,issue]}:model;},[cabinet]);
 useEffect(()=>{if(startup.recovery&&snapshot.committed.id===startup.cabinet.id)return;const link=assemblyBuildLink.current,itemId=assemblyApi.current?.syncBuild(snapshot.committed,link?.cabinetId===snapshot.committed.id?link.itemId:undefined);if(itemId)linkAssemblyBuild({itemId,cabinetId:snapshot.committed.id});},[snapshot.committed]);
 const workingCopy=useRef<LibraryWorkingCopy|null>(null);
 if(!workingCopy.current){let entries=[] as ReturnType<typeof readLibrary>;try{entries=readLibrary(localStorage);}catch{}workingCopy.current=new LibraryWorkingCopy(snapshot.committed,entries);try{const saved=JSON.parse(localStorage.getItem(LIBRARY_WORKING_COPY_KEY)??'null');if(saved?.cabinetId===snapshot.committed.id&&entries.some(e=>e.id===saved.entryId))workingCopy.current.link(snapshot.committed,saved.entryId);}catch{}}else workingCopy.current.update(snapshot.committed);
 const libraryEntryId=workingCopy.current.entryId;
 useEffect(()=>{try{localStorage.setItem(LIBRARY_WORKING_COPY_KEY,JSON.stringify({cabinetId:snapshot.committed.id,entryId:libraryEntryId}));}catch{}},[snapshot.committed,libraryEntryId]);
 const [selectedIds,setSelectedIds]=useState([cabinet.id]),[theme,setTheme]=useState<ThemeName>('linen');
 const commonFrontIds=frontTargets(cabinet,selectedIds),mixedFronts=commonFrontIds.some(id=>cabinet.fronts.some(d=>d.id===id))&&commonFrontIds.some(id=>cabinet.drawers?.some(d=>d.id===id));
 const selectedDrawerPart=evaluated.drawers.drawers.flatMap(d=>d.parts).find(p=>p.id===selectedIds.at(-1));
 const selection=selectedIds[selectedIds.length-1]??cabinet.id;
 const [pendingEdit,setPendingEdit]=useState<PendingEdit|null>(null);
 const failedCandidate=useRef<Cabinet|null>(null);
 const [hiddenIds,setHiddenIds]=useState<string[]>([]);
 const [doorAngles,setDoorAngles]=useState<Record<string,number>>({});
 function setSelection(id:string){setSelectedIds([evaluated.shaker.panels.some(p=>p.id===id)?id:constructionOwner(cabinet,id)]);}
 function select(id:string,additive=false){
  if(!additive){setSelection(id);return;}
  const kindOf=(id:string)=>[...evaluated.panels,...(evaluated.drawerBoards??[])].some(p=>p.edges.some(e=>e.product&&e.id===id))?'edge-band':evaluated.panels.some(p=>p.id===id&&['left','right'].includes(p.role))?'side':evaluated.shaker.panels.some(p=>p.id===id)?'shaker-part':frontTargets(cabinet,[id]).length?'front':evaluated.doorHardware.hinges.some(h=>h.id===id)?'hinge':evaluated.drawers.drawers.some(d=>d.parts.some(p=>p.id===id))?'drawer-part':evaluated.openings.some(o=>o.id===id)?'opening':cabinet.drawers?.some(d=>d.id===id)?'drawer':cabinet.fronts.some(d=>d.id===id)?'door':cabinet.contents.some(s=>s.id===id)?'adjustable':evaluated.divisions.find(d=>d.id===id)?.axis;
  const kind=kindOf(id);
  if(!kind||selectedIds.some(selected=>kindOf(selected)!==kind)){if(selectedIds.length===1&&selectedIds[0]===cabinet.id){setSelection(id);return;}setNotice('Select openings together, or select elements of the same kind using Shift, Cmd or Ctrl.');return;}
  setSelectedIds(ids=>ids.includes(id)?(ids.length>1?ids.filter(i=>i!==id):[cabinet.id]):[...ids,id]);
 }
 function commit(candidate=store.getSnapshot().preview,repairDialog=true,checkOpening=true):boolean {
  if(!candidate)return false;
  candidate=fitDrawerRails(candidate);
  try{
   if(checkOpening)candidate=fitNewPantryHinges(candidate,store.getSnapshot().committed);
   const issue=checkOpening?drawerOpeningEditIssue(candidate,store.getSnapshot().committed):null;
   if(issue){store.cancel();if(!repairDialog){setNotice(issue.message,true);return false;}setNotice('');setPendingEdit({title:'Internal drawer clearance',message:issue.message,options:innerDrawerOpeningRepairs(candidate),base:store.getSnapshot().committed});return false;}
  }catch{/* Existing construction validation supplies its normal error/repairs. */}
  if(store.commit(candidate)){setPendingEdit(null);return true;}
  const error=store.getSnapshot().error;
  if(error&&!repairDialog){store.cancel();setPendingEdit(null);setNotice(error,true);return false;}
  if(error){store.cancel();setNotice('');setPendingEdit({message:error,options:editRepairs(candidate,store.getSnapshot().committed),base:store.getSnapshot().committed});}
  return false;
 }
 function commitFasteners(candidate:Cabinet){const applied=commit(candidate,false);if(applied)setNotice('');return applied;}
 function requestRemoval(ids:string[]){
  try{
  ids=[...new Set(ids.map(id=>evaluated.drawers.drawers.find(d=>d.parts.some(p=>p.id===id))?.id??id))];
  const base=store.getSnapshot().committed,{cabinet:next,connected}=removalPlan(base,ids);
  // Removal must stay available while a cabinet has an unresolved opening warning.
  // The normal construction validation still runs and remaining warnings stay visible.
  if(connected.length){setPendingEdit({removal:true,title:'Delete connected items?',message:`Deleting this selection also removes ${connected.length} connected item${connected.length===1?'':'s'} (interiors, doors or drawers). Undo restores all removed items.`,options:[{label:`Delete selection and ${connected.length} connected item${connected.length===1?'':'s'}`,cabinet:next}],base});}
  else if(commit(next,true,false))setSelection(cabinet.id);
  }catch(error){setNotice((error as Error).message,true);}
 }
 const [notice,setNoticeText]=useState('');
 const [noticeError,setNoticeError]=useState(false);
 function setNotice(message:string,error=false){setNoticeText(message);setNoticeError(error);}
 const file=useRef<HTMLInputElement>(null),fields=useRef<Partial<Record<Axis,HTMLInputElement|null>>>({}),drag=useRef<Cabinet|null>(null),shelfPosition=useRef<HTMLInputElement|null>(null),pendingDimension=useRef<Axis|null>(null);
 useLayoutEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
 useEffect(()=>{setSelection(cabinet.id);setDoorAngles({});setHiddenIds([]);},[cabinet.id]);
 useEffect(()=>{
  if(startup.recovery&&snapshot.committed.id===startup.cabinet.id)return;
  try{localStorage.setItem(SIMPLE_AUTOSAVE_KEY,serialize(snapshot.committed));}catch{setNotice('Autosave is unavailable. Use Save to keep a copy.');}
 },[snapshot.committed]);
 useEffect(()=>{
  function key(e:KeyboardEvent){
   if(e.key==='Escape'){store.cancel();drag.current=null;}
   if((e.target as HTMLElement).closest('input,textarea,select,dialog,[contenteditable=true]'))return;
   if(workspace==='box'&&e.key==='Backspace'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){
    if(!selectedIds.some(id=>store.getSnapshot().committed.drawers?.some(d=>d.id===id||evaluated.drawers.drawers.find(v=>v.id===d.id)?.parts.some(p=>p.id===id))||findDivision(store.getSnapshot().committed.compartments,id)||store.getSnapshot().committed.contents.some(s=>s.id===id)||store.getSnapshot().committed.fronts.some(d=>d.id===id)))return;
    e.preventDefault();if(e.repeat)return;requestRemoval(selectedIds);
    return;
   }
   if((e.metaKey||e.ctrlKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();e.shiftKey||e.key.toLowerCase()==='y'?redo():undo();}
  }
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[selectedIds,workspace]);
 useEffect(()=>{const feedback=(e:Event)=>{const d=(e as CustomEvent<{message:string;error:boolean}>).detail;setNotice(d.message,d.error);};window.addEventListener('cabinet-input-feedback',feedback);return()=>window.removeEventListener('cabinet-input-feedback',feedback);},[]);
 const review=evaluated.issues.filter(i=>i.code.startsWith('machining-'));
 const constructionPart=selection===`${cabinet.id}/panel/top`?'top':selection===`${cabinet.id}/panel/back`?'back':undefined;
 const bandingPanels=[...evaluated.panels,...(evaluated.drawerBoards??[]).filter(p=>p.role==='door')];
 const selectedBands=bandingPanels.flatMap(p=>p.edges.filter(e=>e.product&&selectedIds.includes(e.id)).map(edge=>({panel:p,edge})));
 const selectedBand=bandingPanels.flatMap(p=>p.edges.map(edge=>({panel:p,edge}))).find(({edge})=>edge.id===selection);
 const bandPanels=bandingPanels.filter(p=>(selectedIds.includes(p.id)||selectedIds.includes(constructionOwner(cabinet,p.id))||evaluated.drawers.drawers.some(d=>selectedIds.includes(d.id)&&d.parts.some(part=>part.id===p.id)))&&(p.role!=='back'||cabinet.carcass.back.mode==='full'&&cabinet.carcass.back.joint?.mode==='applied'));
 const shakerPart=evaluated.shaker.panels.find(p=>p.id===selection);
 const panel=shakerPart??evaluated.panels.find(p=>p.id===selection),opening=evaluated.openings.find(o=>o.id===selection)??(selection===cabinet.compartments.id?evaluated.opening:undefined),foot=evaluated.installation.feet.find(f=>f.id===selection);
 useEffect(()=>{setSelectedIds(ids=>{const valid=ids.filter(id=>id===cabinet.id||id===cabinet.compartments.id||isConstructionSelection(cabinet,id)||evaluated.drawers.drawers.some(d=>d.id===id||d.parts.some(p=>p.id===id))||evaluated.doorHardware.hinges.some(h=>h.id===id)||bandingPanels.some(p=>p.id===id||p.edges.some(e=>e.product&&e.id===id))||evaluated.shaker.panels.some(p=>p.id===id)||evaluated.openings.some(o=>o.id===id)||evaluated.installation.feet.some(f=>f.id===id));return valid.length===ids.length?ids:valid.length?valid:[cabinet.id];});},[cabinet,selectedIds,evaluated]);
 useEffect(()=>{if(selection===cabinet.id&&pendingDimension.current){const input=fields.current[pendingDimension.current];revealField(input);pendingDimension.current=null;}},[selection,cabinet.id]);
 const selectedReview=review.filter(i=>selection===cabinet.id||selectedIds.some(id=>affectedItems(i).some(part=>constructionOwner(cabinet,part)===id)));
 function resolveMachining(issues=selectedReview){
  const hingeSetup=issues.find(i=>i.code==='machining-hinge-selection');
  if(hingeSetup){setSelection(hingeSetup.featureId);requestAnimationFrame(()=>{const field=document.querySelector<HTMLSelectElement>('.inspector select[aria-label="Hinge system"]');field?.scrollIntoView({block:'center'});field?.focus({preventScroll:true});});return;}

  const faceIssues=issues.filter(i=>i.code==='machining-faces'),faceIds=faceIssues.map(i=>i.featureId);
  const hole=issues.some(i=>i.code==='machining-hole-collision'||i.code==='machining-collision'&&i.operationIds?.some(id=>id.includes('/installation/foot/'))),collision=issues.some(i=>i.code==='machining-collision'),plate=issues.some(i=>i.code==='machining-hinge-plate'),faces=issues.some(i=>i.code==='machining-faces'&&i.featureId===`${cabinet.id}/panel/bottom`),tool=issues.some(i=>i.code==='machining-tool-width');
  const backIds=new Set(evaluated.backFasteners.map(b=>b.id)),backCollision=issues.some(i=>i.operationIds?.some(id=>backIds.has(id)));
  const options=[...issues.some(i=>i.code==='machining-drawer-opening')?innerDrawerOpeningRepairs(snapshot.committed):[],...holeSpacingRepairs(snapshot.committed,issues),...railCollisionRepairs(snapshot.committed),...oneFaceRepairs(snapshot.committed,faceIds),...hole?footHoleRepairs(snapshot.committed):[],...plate?hingePlateRepairs(snapshot.committed):[],...faces?bottomFaceRepairs(snapshot.committed):[],...backCollision?[...backFastenerInteriorRepairs(snapshot.committed,issues),...backFixingRepairs(snapshot.committed)]:[],...tool?toolingRepairs(snapshot.committed):[]];
  if(!options.length){setPendingEdit(null);setNotice(`${issues[0]?.message??'Review the machining setup.'} No automatic correction is available. Adjust the part or fastener settings.`,true);return;}
  setPendingEdit({title:issues.some(i=>i.code==='machining-drawer-opening')?'Internal drawer clearance':'Resolve machining check',message:faceIssues.length===issues.length&&faceIssues.length===1?faceIssues[0].message:hole?'Two drilled features overlap. Choose a clear placement or adjust their layout.':plate?'Move the obstructed hinge mounting zones to the nearest clear positions.':faceIds.length?'Some parts have blind cuts on both faces.':backCollision?'Choose a clear position for the affected part or back fixing, or cut the affected rear corner at 45° where it fits.':collision?'Adjust the connection layout.':issues[0]?.message??'Review the machining setup.',options,base:snapshot.committed});
 }
 function operateDoors(ids:string[],angle:number){
  const result=safeDoorAngles(evaluated,doorAngles,ids,angle);setDoorAngles(result.angles);
  if(result.blocked){const hit=result.collision!,label=(id:string)=>evaluated.panels.find(p=>p.id===id)?.label??(id.includes('/handle/')?'handle':'part');setPendingEdit({title:'Door opening blocked',message:`${label(hit.movingId)} meets ${label(hit.otherId)} near ${Math.round(hit.angle)}°. This front-edge clearance study is not verified manufacturer linkage motion.`,options:doorOpeningRepairs(snapshot.committed,ids,angle),base:snapshot.committed,motion:{ids,target:angle}});}
 }
 const doorIds=cabinet.fronts.map(d=>d.id),drawerIds=(cabinet.drawers??[]).map(d=>d.id);
 const movableIds=[...doorIds,...drawerIds],doorsOpen=movableIds.length>0&&(cabinet.drawers?.some(d=>d.internal)?movableIds.some(id=>(doorAngles[id]??0)>0):movableIds.every(id=>(doorAngles[id]??0)>0));
 function toggleFronts(){
  const hingeSetup=drawerOpeningIssue(evaluated);if(hingeSetup?.code==='machining-hinge-selection'){resolveMachining([hingeSetup]);return;}
  const opening=!doorsOpen;
  if(!cabinet.drawers?.some(d=>d.internal)){
   if(doorIds.length)operateDoors(doorIds,opening?Math.max(...doorIds.map(id=>doorAngleLimit(evaluated,id))):0);
   setDoorAngles(old=>({...old,...Object.fromEntries(drawerIds.map(id=>[id,opening?100:0]))}));return;
  }
  // Keep doors clear until the trays have retracted. Open doors to a checked
  // pose before evaluating the inner-drawer extension.
  if(!opening){const retracted={...doorAngles,...Object.fromEntries(drawerIds.map(id=>[id,0]))},doors=safeDoorAngles(evaluated,retracted,doorIds,0);setDoorAngles({...doors.angles,...Object.fromEntries(drawerIds.map(id=>[id,0]))});return;}
  const doors=safeDoorAngles(evaluated,doorAngles,doorIds,Math.max(0,...doorIds.map(id=>doorAngleLimit(evaluated,id))));
  const result=safeInnerDrawerExtensions(evaluated,doorAngles,{...doors.angles,...Object.fromEntries(drawerIds.map(id=>[id,100]))});
  setDoorAngles(result.angles);
  if(doors.blocked){const hit=doors.collision!,label=(id:string)=>evaluated.panels.find(p=>p.id===id)?.label??evaluated.drawers.drawers.find(d=>d.id===id)?.label??'part';setNotice(`${label(hit.movingOwner)} meets ${label(hit.otherOwner)} near ${Math.round(hit.angle)}°. The opening stopped at the last clear position.`,true);}
  else if(result.blocked){
   const drawer=evaluated.drawers.drawers.find(d=>d.id===result.drawerId)!,hinge=evaluated.doorHardware.hinges.find(h=>h.id===result.otherId),door=evaluated.fronts.doors.find(d=>d.id===hinge?.ownerId);
   const obstacle=hinge?`hinge ${Number(hinge.id.split('/').at(-1))+1} on ${door?.label??'the door'} (mounting-clearance zone)`:evaluated.panels.find(p=>p.id===result.otherId)?.label??'another part';
   const message=`${drawer.label} is blocked by ${obstacle}. The drawer stopped at the last clear position.`,options=innerDrawerOpeningRepairs(snapshot.committed);
   if(options.length)setPendingEdit({title:'Internal drawer opening blocked',message:message+(hinge?'':' The simplified door-motion preview intersects the drawer fittings; this is not verified manufacturer linkage motion.'),options,base:snapshot.committed,motion:{ids:doorIds,target:Math.max(0,...doorIds.map(id=>doorAngleLimit(evaluated,id))),drawers:true}});
   else setNotice(`${message} ${hinge?'Adjust the hinge position or drawer spacing.':'Check the selected hinge’s inward door protrusion and the drawer-side clearance. Intermediate hinge motion remains approximate.'}`,true);
  }
 }
 const reviewKey=JSON.stringify(review),[dismissedReview,setDismissedReview]=useState('');
 const drawerOpeningReview=review.some(i=>i.code==='machining-drawer-opening'),reviewNotice=review.length&&reviewKey!==dismissedReview?(drawerOpeningReview?'Internal drawers cannot fully open':`${review.length} machining ${review.length===1?'check needs':'checks need'} review`):'';
 const fastenerParts=evaluated.panels.filter(p=>(selectedIds.includes(p.id)||(constructionPart&&p.role.startsWith(constructionPart+'-')))&&evaluated.cabineo.some(j=>j.hostId===p.id));
 const partFastenerFields=fastenerParts.length>0?<FieldPair>{fastenerParts.map(part=>{const override=cnc(cabinet).partCabineoCounts?.[part.id],joints=evaluated.cabineo.filter(j=>j.hostId===part.id&&/\/cabineo\/-?1\//.test(j.id)),count=override??Math.max(1,...[-1,1].map(side=>joints.filter(j=>j.id.includes(`/cabineo/${side}/`)).length));return <Fragment key={part.id}>{!constructionPart&&part.role!=='bottom'&&fastenerParts.length===1&&<DimensionField plain disabled label="Thickness" accessibleLabel={`${part.label} thickness`} value={part.size[part.orientation==='yz'?0:part.orientation==='xz'?1:2]} cancelValue={part.size[part.orientation==='yz'?0:part.orientation==='xz'?1:2]} limits={{min:3,max:24}} onPreview={()=>{}} onCommit={()=>false} onCancel={()=>{}}/>}<DimensionField plain label={constructionPart?(part.role==='back-upper-rail'?'Upper rail fasteners':part.role==='back-lower-rail'?'Lower rail fasteners':part.role==='top-front-rail'?'Front rail fasteners':'Rear rail fasteners'):'Cabineo per side'} accessibleLabel={`${part.label} Cabineo per side`} value={count} cancelValue={count} limits={{min:1,max:20}} onPreview={()=>{}} onCommit={value=>commitFasteners(setPartCabineoCount(snapshot.committed,part.id,value))} onCancel={store.cancel}/></Fragment>;})}</FieldPair>:null;
 const defaultCabineoCount=Math.max(1,Math.ceil(Math.max(0,cabinet.envelope.depth-(cabinet.carcass.back.joint?evaluated.opening.origin[2]-cabinet.envelope.origin[2]:0)-100)/300)+1);
 const focus=(axis:Axis)=>{if(selection!==cabinet.id){pendingDimension.current=axis;setSelection(cabinet.id);}else{revealField(fields.current[axis]);}};
 async function load(e:React.ChangeEvent<HTMLInputElement>){
  const selected=e.target.files?.[0];e.target.value='';if(!selected)return;
  try{
   if(selected.size>10_000_000)throw new Error('Choose a file smaller than 10 MB.');
   const revision=store.getSnapshot().revision,assemblyRevision=assemblyApi.current?.revision();
   const text=await selected.text();if(revision!==store.getSnapshot().revision)throw Error('The cabinet changed while opening the file. Open it again.');if(JSON.parse(text)?.format==='wemakebox-assembly'){if(assemblyRevision!==assemblyApi.current?.revision())throw Error('The assembly changed while opening the file. Open it again.');assemblyApi.current?.replace(deserializeAssembly(text));setWorkspace('assembly');return;}
   if(selected.size>2_000_000)throw new Error('Choose a cabinet file smaller than 2 MB.');
   const next=named(readSimpleCabinet(text));
   if(revision!==store.getSnapshot().revision)throw new Error('The cabinet changed while opening the file. Open it again.');
   if(commit(next,true,false)){linkAssemblyBuild(null);workingCopy.current!.link(store.getSnapshot().committed,null);setSelection(next.id);setNotice('');}
  }catch(error){setNotice((error as Error).message,true);}
 }
 async function exportCabinetStep(){
  if(exportingCabinet.current)return;
  exportingCabinet.current=true;
  setCabinetStepProgress('Preparing STEP…');
  const source=store.getSnapshot().committed;
  try{
   const model=cabinetForExport(evaluate(source),source.name);
   const result=await requestSheetStep(model,(done,total)=>setCabinetStepProgress(`Building part ${done} of ${total}…`));
   const filename=source.name.replace(/[^a-z0-9.-]+/gi,'-').replace(/^[.-]+|[.-]+$/g,'')||'cabinet';
   downloadSheetStep(result,`${filename}.step`);
   setNotice('Cabinet STEP downloaded.');
  }catch(error){setNotice((error as Error).message,true);}
  finally{exportingCabinet.current=false;setCabinetStepProgress('');}
 }
 const notification=(snapshot.error||notice||reviewNotice)&&<Notice message={snapshot.error||notice||reviewNotice} persistent={!snapshot.error&&!notice&&!!reviewNotice&&drawerOpeningReview} error={!!snapshot.error||!!notice&&noticeError||!notice&&!!reviewNotice} onAction={!snapshot.error&&!notice&&reviewNotice?()=>{if(workspace==='box')resolveMachining(review);else {setDismissedReview(reviewKey);setSelection(cabinet.id);setWorkspace('box');resolveMachining(review);}}:undefined} onDismiss={()=>{if(snapshot.error)store.cancel();setNotice('');setDismissedReview(reviewKey);}}/>;
 return <div className="app-shell simple-workspace">
  <header className="app-header"><div className="brand"><span className="brand-symbol"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><use href={`${import.meta.env.BASE_URL}assets/wemakebox.svg#mark`}/></svg></span><span>WeMakeBox</span></div><div className="workspace-navigation"><WorkspaceTabs value={workspace} onChange={next=>{store.cancel();setWorkspace(next);}}/></div><div className="document-actions"><div className="history-actions"><IconButton icon="undo" label="Undo (⌘Z)" disabled={!(workspace==='assembly'?assemblyHistory.canUndo:workspace==='cnc'?cutHistory.canUndo:snapshot.canUndo)} onClick={undo}/><IconButton icon="redo" label="Redo (⇧⌘Z)" disabled={!(workspace==='assembly'?assemblyHistory.canRedo:workspace==='cnc'?cutHistory.canRedo:snapshot.canRedo)} onClick={redo}/></div><span className="header-separator" aria-hidden="true"/><div ref={costTrigger}><IconButton icon="utilities" label="Utilities" aria-haspopup="dialog" aria-expanded={costsOpen} aria-controls="cost-estimate" onClick={()=>setCostsOpen(open=>!open)}/></div><div ref={libraryTrigger}><IconButton icon="library" label="Library" disabled={savingLibrary} aria-haspopup="dialog" aria-expanded={libraryOpen} aria-controls="cabinet-library" onClick={()=>setLibraryOpen(true)}/></div><span className="header-separator" aria-hidden="true"/><IconButton icon="new" label={workspace==='assembly'?'New assembly':'New cabinet'} onClick={()=>{if(workspace==='assembly'){assemblyApi.current?.newAssembly();return;}commit({...createCabinet(),name:'Cabinet',cabinetType:'base'});setNotice('New cabinet. Undo returns to your previous cabinet.');}}/><IconButton icon="open" label={workspace==='assembly'?'Open assembly':'Open cabinet'} onClick={()=>file.current?.click()}/><IconButton icon="save" label="Download" onClick={()=>{if(workspace==='assembly'){assemblyApi.current?.download();return;}downloadCabinet({...snapshot.committed,name:snapshot.committed.name==='Untitled cabinet'?'Cabinet':snapshot.committed.name});setNotice('');}}/><span className="header-separator" aria-hidden="true"/><IconButton icon={theme==='graphite'?'sun':'moon'} label={`Switch to ${theme==='graphite'?'light':'dark'} mode`} onClick={()=>setTheme(theme==='graphite'?'linen':'graphite')}/><input ref={file} type="file" accept=".json,application/json" hidden onChange={load}/></div></header>
  <main className="workspace" id="workspace-box" role="tabpanel" aria-labelledby="workspace-tab-0" hidden={workspace!=='box'}>
   <Structure simple cabinet={cabinet} evaluated={evaluated} selection={selection} selectedIds={selectedIds} onSelect={select} onRename={(id,label)=>{try{commit(renameItem(snapshot.committed,id,label));}catch(e){setNotice((e as Error).message,true);}}} hiddenIds={hiddenIds} onToggleVisibility={id=>setHiddenIds(ids=>ids.includes(id)?ids.filter(v=>v!==id):[...ids,id])}/>
   <div className="canvas-area"><Viewport hiddenIds={hiddenIds} onToggleDoors={movableIds.length?toggleFronts:undefined} doorsOpen={doorsOpen} simple cabinet={cabinet} evaluated={evaluated} selection={selection} selectedIds={selectedIds} theme={theme} preview={!!snapshot.preview} cutaway={false} plinthVisible frontsVisible doorAngles={doorAngles}
     onResize={(axis,value)=>{try{if(!Number.isFinite(value)||value<1||value>10000)throw Error('Enter a dimension between 1 and 10,000 mm.');return commit(resizeCabinet(store.getSnapshot().committed,axis,value));}catch(e){setNotice((e as Error).message,true);return false;}}} onSelect={select} onEdit={focus} onEditDivision={()=>{revealField(shelfPosition.current);}} onPreviewDivision={(id,value)=>{if(drag.current){failedCandidate.current=drag.current.contents.some(s=>s.id===id)?moveAdjustable(drag.current,id,value):moveDivision(drag.current,id,value);store.preview(failedCandidate.current);}}}
    onDragStart={()=>{store.cancel();failedCandidate.current=null;drag.current=store.getSnapshot().committed;}}
    onPreview={(axis,value)=>{if(drag.current){failedCandidate.current=resizeCabinet(drag.current,axis,value);store.preview(failedCandidate.current);}}}
    onCommit={()=>{const s=store.getSnapshot();if(failedCandidate.current||s.preview)commit(failedCandidate.current??s.preview);drag.current=null;failedCandidate.current=null;}}
    onCancel={()=>{store.cancel();drag.current=null;failedCandidate.current=null;}}/>
    {workspace==='box'&&notification}
   </div>
   <aside className="inspector" aria-label="Cabinet inspector"><div className="inspector-title"><h2><Icon name={opening?'element-opening':constructionPart?elementIcon(constructionPart):panel?elementIcon(panel.role,cabinet.contents.some(s=>s.id===selection)):foot?'element-foot':selectedDrawerPart||cabinet.drawers?.some(d=>d.id===selection)?'element-drawer':'cube'} size={24}/><span>{selectedIds.length>1?`${selectedIds.length} ${selectedBands.length?'edge bands':mixedFronts?'fronts':evaluated.doorHardware.hinges.some(h=>h.id===selection)?'hinges':opening?'openings':panel?.role==='door'?'doors':panel&&['left','right'].includes(panel.role)?'sides':panel?.role==='shelf'?'shelves':selectedDrawerPart||cabinet.drawers?.some(d=>d.id===selection)?'drawers':'dividers'}`:selection===cabinet.id?'Size & shape':(constructionPart?(cabinet.names?.[selection]??(constructionPart==='top'?'Top':'Back')):undefined)??(selectedBand?`${selectedBand.panel.label} · ${selectedBand.edge.label} band`:undefined)??panel?.label??selectedDrawerPart?.label??evaluated.drawers.drawers.find(d=>d.id===selection)?.label??opening?.label??(foot?'Feet':undefined)??(evaluated.doorHardware.hinges.some(h=>h.id===selection)?`Hinge ${Number(selection.split('/').at(-1))+1}`:'Selection')}</span></h2><div className="inspector-title-actions"><IconButton icon="library-add" label={savingLibrary?"Saving to library…":"Save to library"} disabled={savingLibrary} onClick={saveLibrary}/>{selectedIds.every(id=>cabinet.drawers?.some(d=>d.id===id)||evaluated.drawers.drawers.some(d=>d.parts.some(p=>p.id===id))||cabinet.fronts.some(d=>d.id===id)||cabinet.contents.some(s=>s.id===id)||evaluated.divisions.some(d=>d.id===id))&&<IconButton icon="delete" label={selectedDrawerPart?"Remove drawer":selectedIds.length>1?"Remove selected items":"Remove selected item"} onClick={()=>requestRemoval(selectedIds)}/>}</div></div>

    <HingeInspector cabinet={snapshot.committed} model={evaluated} ids={selectedIds} commit={commit}/>
    {mixedFronts?<FrontFeaturesInspector cabinet={snapshot.committed} ids={commonFrontIds} commit={commit}/>:<SimpleDrawerInspector cabinet={snapshot.committed} model={evaluated} id={selectedDrawerPart?.ownerId??selection} ids={[...new Set(selectedIds.map(id=>evaluated.drawers.drawers.find(d=>d.parts.some(p=>p.id===id))?.id??id))]} partId={selectedDrawerPart?.id} onSelectMany={setSelectedIds} commit={commit} select={setSelection} notice={message=>setNotice(message,true)}/>}
    <InspectorSections key={selection} accordion={selection===cabinet.id}>
    {selection===cabinet.id&&<><Section title="Cabinet type"><label className="construction-choice">Size preset<span className="select select--fluid"><select aria-label="Cabinet type" value={presets.find(p=>p.width===cabinet.envelope.width&&p.height===cabinet.envelope.height&&p.depth===cabinet.envelope.depth)?.id??''} onChange={e=>{if(!e.target.value)return;try{commit(applySimplePreset(snapshot.committed,e.target.value as PresetId));}catch(error){setNotice((error as Error).message,true);}}}><option value="">Custom size</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name} · {p.width} × {p.height} × {p.depth}</option>)}</select><Icon name="chevron" size={12}/></span></label></Section>
    <Section title="Dimensions" aside={<span className="unit-badge">mm</span>}><FieldPair>{(['width','height','depth'] as const).map(axis=><DimensionField plain key={axis} axis={axis} label={axis[0].toUpperCase()+axis.slice(1)} value={cabinet.envelope[axis]} cancelValue={snapshot.committed.envelope[axis]} onPreview={v=>{store.preview(resizeCabinet(snapshot.committed,axis,v));}} onCommit={v=>commit(resizeCabinet(snapshot.committed,axis,v))} onCancel={store.cancel} register={el=>{fields.current[axis]=el;}}/>)}<DimensionField plain label="Stock" accessibleLabel="Stock thickness" value={stock(cabinet,'carcass').thickness} cancelValue={stock(snapshot.committed,'carcass').thickness} limits={{min:3,max:24}} onPreview={()=>{}} onCommit={n=>{try{return commit(setStockThickness(snapshot.committed,n));}catch(e){setNotice((e as Error).message,true);return false;}}} onCancel={store.cancel}/></FieldPair></Section><Section title="Corner joints"><span className="select select--fluid"><select aria-label="Corner joints" value={cabinet.carcass.corner?'puzzle':'butt'} onChange={e=>commit(setPuzzleCorners(snapshot.committed,e.target.value==='puzzle'))}><option value="butt">Butt joints</option><option value="puzzle">Puzzle / finger joints</option></select><Icon name="chevron" size={12}/></span>{cabinet.carcass.corner&&<DimensionField plain stacked label="Target finger width" value={cabinet.carcass.corner.pitch} cancelValue={snapshot.committed.carcass.corner?.pitch??50} limits={{min:20,max:200}} onPreview={()=>{}} onCommit={pitch=>commit({...snapshot.committed,carcass:{...snapshot.committed.carcass,corner:{mode:'puzzle',revision:'puzzle-1',pitch}}})} onCancel={store.cancel}/>}</Section></>}
    {constructionPart==='top'&&<SimpleConstructionInspector cabinet={snapshot.committed} scope="top" commit={commit} railFasteners={partFastenerFields}/>}
    {opening&&<SimpleConstructionInspector cabinet={snapshot.committed} scope="front" commit={commit}/>}
    {(selection===cabinet.id||panel?.role==='bottom'||!!foot)&&<BaseSupportInspector cabinet={snapshot.committed} onCommit={commit} onCancel={store.cancel}/>}
    {selection===cabinet.id&&<FrontFeaturesInspector scope cabinet={snapshot.committed} ids={[...cabinet.fronts.map(d=>d.id),...(cabinet.drawers??[]).map(d=>d.id)]} commit={commit}/>}
    {selection===cabinet.id&&<CncInspector cabinet={snapshot.committed} onCommit={commit} onCancel={store.cancel}/>}
    {selection===cabinet.id&&<Section title="Fasteners"><label className="construction-choice">Assembly connectors<span className="select select--fluid"><select aria-label="Assembly connectors" value={cabinet.hardware[0]?.id??''} onChange={e=>commitFasteners(setCabineo(snapshot.committed,e.target.value as CabineoId|''))}><option value="">None</option>{Object.entries(cabineoVariants).map(([id,v])=><option key={id} value={id}>{v.name}</option>)}</select><Icon name="chevron" size={12}/></span></label>{cabinet.hardware.length>0&&<><FieldPair><DimensionField plain label="Cabineo per side" value={cnc(cabinet).cabineoPerSide||defaultCabineoCount} cancelValue={cnc(cabinet).cabineoPerSide||defaultCabineoCount} limits={{min:1,max:20}} onPreview={()=>{}} onCommit={cabineoPerSide=>commitFasteners(setCnc(snapshot.committed,{cabineoPerSide}))} onCancel={store.cancel}/><DimensionField plain disabled label="Connectors" accessibleLabel="Calculated connector count" value={evaluated.cabineo.length} cancelValue={evaluated.cabineo.length} limits={{min:0,max:9999}} onPreview={()=>{}} onCommit={()=>true} onCancel={()=>{}}/></FieldPair><Button className="full-width-button" disabled={cnc(cabinet).cabineoPerSide===0&&!Object.keys(cnc(cabinet).partCabineoCounts??{}).length} onClick={()=>commitFasteners(resetGlobalCabineoCount(snapshot.committed))}>Reset global</Button><p className="field-note">{cabinet.carcass.corner?'Fixed interiors only · puzzle corners interlock':'Surface mounted · 50 mm panel setback, adaptive on rails · spacing ≤300 mm'}</p></>}</Section>}
    {selection!==cabinet.id&&!(constructionPart&&(cabinet.carcass[constructionPart].mode==='rails'||cabinet.carcass[constructionPart].mode==='rails-panel'))&&partFastenerFields&&<div className="inspector-section">{partFastenerFields}</div>}
    {selection===cabinet.id&&cabinet.cabinetType==='wall'&&<WallHangingInspector cabinet={snapshot.committed} onCommit={commit} onCancel={store.cancel}/>}
    {shakerPart&&<Section title="Door assembly"><Button className="full-width-button" onClick={()=>setSelection(shakerPart.doorOwnerId)}>Edit door</Button></Section>}
    <MachiningChecks issues={selectedReview} onResolve={()=>resolveMachining()}/>
    {!mixedFronts&&cabinet.fronts.some(d=>selectedIds.includes(d.id))&&<SimpleDoorInspector cabinet={snapshot.committed} evaluated={evaluated} ids={selectedIds} onCommit={commit} onHingeCommit={candidate=>commit(candidate,false)} onCancel={store.cancel} onSelect={setSelectedIds} onRemove={requestRemoval} onNotice={message=>setNotice(message,true)}/>}
    {panel?.role==='bottom'&&<Section title="Bottom fasteners"><label className="construction-choice">Machining face<span className="select select--fluid"><select aria-label="Bottom fastener face" value={cnc(cabinet).bottomFastenersThrough?'outside-through':cnc(cabinet).bottomFace??'outside'} onChange={e=>{const value=e.target.value;commitFasteners(setCnc(snapshot.committed,{bottomFace:value==='inside'?'inside':'outside',bottomFastenersThrough:value==='outside-through'}));}}><option value="inside">Inside</option><option value="outside">Outside</option>{cnc(cabinet).bottomFastenersThrough&&<option value="outside-through">Outside · through pilots</option>}</select><Icon name="chevron" size={12}/></span></label>{cnc(cabinet).bottomFastenersThrough&&<p className="field-note">Connector pockets stay blind. Only receiving pilots can drill through.</p>}</Section>}
    {constructionPart==='back'&&<BackPanelInspector cabinet={snapshot.committed} onCommit={commit} onFastenerCommit={commitFasteners} onCancel={store.cancel} railFasteners={partFastenerFields}/>}
    {cabinet.contents.some(s=>s.id===selection)?<SimpleAdjustableInspector onSelect={setSelection} committed={snapshot.committed} evaluated={evaluated} ids={selectedIds} onCommit={commit} onCancel={store.cancel} onRemove={requestRemoval} onNotice={message=>setNotice(message,true)} positionRef={el=>{shelfPosition.current=el;}}/>:<SimpleInteriorInspector cabinet={cabinet} committed={snapshot.committed} evaluated={evaluated} selection={selection} selectedIds={selectedIds} onRemove={requestRemoval} onCommit={commit} onCancel={store.cancel} onSelect={setSelection} onSelectMany={setSelectedIds} onNotice={message=>setNotice(message,true)} positionRef={el=>{shelfPosition.current=el;}}/>}
    {selectedIds.length===1&&opening&&!evaluated.divisions.some(d=>d.id===selection)&&<Section title={panel?.label??'Interior opening'}><div className="data-row"><span>Size</span><strong>{(panel?.size??opening!.size).map(n=>+n.toFixed(1)).join(' × ')} mm</strong></div><p className="field-note">{panel?'Panel size follows the cabinet dimensions.':'Clear space inside the cabinet.'}</p></Section>}

    {selection===cabinet.id&&<Section title="Export cabinet">
      <Button className="full-width-button" disabled={!!cabinetStepProgress} onClick={exportCabinetStep}>Export STEP</Button>
      {cabinetStepProgress&&<p className="field-note" role="status">{cabinetStepProgress}</p>}
    </Section>}

    {(bandPanels.length>0||selectedBand)&&<EdgeBandingInspector cabinet={snapshot.committed} panels={selectedBands.length?[...new Map(selectedBands.map(b=>[b.panel.id,b.panel])).values()]:bandPanels} selectedEdges={selectedBands.map(b=>b.edge.id)} shared={selectedIds.length>1} selectedEdge={selectedBand?.edge.id} commit={c=>commit(c,false,false)} cancel={store.cancel} select={setSelection}/>}
    {selectedIds.length===1&&opening&&evaluated.panels.some(p=>p.role==='front-upper-rail'||p.role==='front-lower-rail')&&<ConstructionThumbnail panels={evaluated.panels.filter(p=>p.role==='front-upper-rail'||p.role==='front-lower-rail')} joints={evaluated.cabineo} pockets={evaluated.pockets} backBores={evaluated.backFasteners} drilling={evaluated.drilling}/>}
    {selectedIds.length===1&&constructionPart&&cabinet.carcass[constructionPart].mode==='rails'&&<ConstructionThumbnail panels={evaluated.panels.filter(p=>p.role.startsWith(constructionPart==='top'?'top-':'back-'))} joints={evaluated.cabineo} pockets={evaluated.pockets} backBores={evaluated.backFasteners} drilling={evaluated.drilling}/>}
    {selectedIds.length===1&&panel&&<PartThumbnail showThickness={!fastenerParts.some(p=>p.id===panel.id)} key={panel.id} panel={panel} joints={shakerPart?[]:evaluated.cabineo} pockets={shakerPart?physicalPockets(evaluated):evaluated.pockets} backBores={shakerPart?[]:evaluated.backFasteners} drilling={shakerPart?evaluated.shaker.bores:evaluated.drilling}/>}
    </InspectorSections>
   </aside>
  </main>
  <AssemblyWorkspace notice={workspace==='assembly'?notification:null} theme={theme} active={workspace==='assembly'} buildCabinet={snapshot.committed} apiRef={assemblyApi} onHistory={setAssemblyHistory} onEdit={(next,itemId)=>{if(commit(next,true,false)){linkAssemblyBuild({itemId,cabinetId:next.id});workingCopy.current!.link(store.getSnapshot().committed,null);setSelection(next.id);}}}/>
  <CncWorkspace historyRef={cncHistory} onHistory={setCutHistory} active={workspace==='cnc'} evaluated={evaluated} theme={theme} bitDiameter={cnc(cabinet).bitDiameter} allowance={cnc(cabinet).tolerance}
    settings={sheetSettings} onSettings={(key,stock)=>setSheetSettings(old=>({...old,[key]:stock}))}
    notice={notification} onNotice={setNotice} onReview={id=>{setSelection(id??cabinet.id);setWorkspace('box');}}/>


 {librarySaveChoice&&<LibrarySaveDialog busy={savingLibrary} onCancel={()=>{if(!savingLibrary)setLibrarySaveChoice(null);}} onSave={overwrite=>{void performLibrarySave(librarySaveChoice.source,overwrite?librarySaveChoice.entryId:undefined);}}/>}
 {libraryOpen&&<CabinetLibrary onClose={closeLibrary} onOpen={(next,entryId)=>{if(!commit(next,true,false))return false;linkAssemblyBuild(null);workingCopy.current!.link(store.getSnapshot().committed,entryId);setSelection(next.id);setWorkspace('box');setNotice('');return true;}}/>}
 {costsOpen&&<CostPanel key={cabinet.id} cabinet={cabinet} model={evaluated} settings={sheetSettings} history={cncHistory.current} onClose={closeCosts} onNotice={setNotice} onReview={()=>{closeCosts();setWorkspace('cnc');}}/>}
 {pendingEdit&&<EditConflict key={snapshot.revision} edit={pendingEdit} onCancel={()=>setPendingEdit(null)} onApply={index=>{if(pendingEdit.base!==store.getSnapshot().committed){setPendingEdit(null);setNotice('The cabinet changed. Try the edit again.');return;}const option=pendingEdit.options[index];if(option){const motion=pendingEdit.motion;if(commit(option.cabinet,true,!pendingEdit.removal)){if(motion){const model=evaluate(option.cabinet),opened=safeDoorAngles(model,{},motion.ids,motion.target);setDoorAngles(motion.drawers?safeInnerDrawerExtensions(model,{}, {...opened.angles,...Object.fromEntries(model.drawers.drawers.map(d=>[d.id,100]))}).angles:opened.angles);}else if(pendingEdit.title)setSelection(cabinet.id);}}}}/>}
 </div>;
}
