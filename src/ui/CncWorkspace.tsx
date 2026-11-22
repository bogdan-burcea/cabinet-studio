import {PartDrawing} from './PartDrawing';
import {PlacementHistory} from '../cnc/placement-history';
import {sheetSelection,sharedStockEdits} from '../cnc/selection';
import {useEffect,useMemo,useRef,useState,useSyncExternalStore,type ReactNode,type RefObject} from 'react';
import {flattenParts,flatPreview,type FaceSign} from '../cnc/parts';
import {validStock,type StockSheet,type NestOverride} from '../cnc/nesting';
import {planSheets,sheetOverview,stockOffcuts,type SheetSettings} from '../cnc/layout';
import {cutterLimit} from '../cnc/tooling';
import {Icon} from '../design-system/Icon';
import type {ThemeName} from '../design-system/themes';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {CncViewport} from '../viewport/CncViewport';
import type {CncScene} from '../viewport/cnc-scene';
import {sheetForExport} from '../cnc/sheet-export';
import {downloadSheetStep,requestSheetStep} from '../cnc/step-download';
import {Button,FieldPair,IconButton,Section} from './components';
import {DimensionField} from './DimensionField';
import {StructureGroup} from './Structure';
import {elementIcon} from './element-icons';
import {DrillingDetails} from './DrillingDetails';

const stockPresets=[[1220,1220],[2440,1220],[2500,1250],[2800,2070],[3050,1525]] as const;
const rounded=(n:number)=>+n.toFixed(2);

export function CncWorkspace({active,evaluated,theme,bitDiameter,allowance,settings,onSettings,notice,onReview,onNotice,historyRef,onHistory}:{
 historyRef:RefObject<PlacementHistory|null>;onHistory(value:{canUndo:boolean;canRedo:boolean}):void;
 active:boolean;evaluated:EvaluatedCabinet;theme:ThemeName;bitDiameter:number;allowance:number;settings:SheetSettings;
 onSettings(key:string,stock:StockSheet):void;notice:ReactNode;onReview(id?:string):void;onNotice(message:string,error?:boolean):void;
}){
 const [history]=useState(()=>new PlacementHistory());
 const historyState=useSyncExternalStore(history.subscribe,history.getSnapshot),overrides=historyState.choices;
 useEffect(()=>{historyRef.current=history;return()=>{historyRef.current=null;};},[history,historyRef]);
 useEffect(()=>{onHistory({canUndo:historyState.canUndo,canRedo:historyState.canRedo});},[historyState.canUndo,historyState.canRedo,onHistory]);
 const [selectedIds,setSelectedIds]=useState<string[]>([]),selected=selectedIds.at(-1)??'',[reverse,setReverse]=useState(false),[expanded,setExpanded]=useState(false);
 const [includeStock,setIncludeStock]=useState(false),[keepOffcuts,setKeepOffcuts]=useState(false),[minimum,setMinimum]=useState(150);
 const [progress,setProgress]=useState('');
 const exporting=useRef(false),lastPlan=useRef<EvaluatedCabinet|undefined>(undefined);
 if(active)lastPlan.current=evaluated;
 const model=lastPlan.current;
 const parts=useMemo(()=>model?flattenParts(model):[],[model]);
 const packed=useMemo(()=>{try{return {plan:planSheets(parts,settings,allowance,overrides),reset:false};}catch{return {plan:planSheets(parts,settings,allowance),reset:true};}},[parts,settings,allowance,overrides]);
 const {groups,sheets,unplaced}=packed.plan;
 useEffect(()=>{if(packed.reset){history.reset();onNotice('Requested rotations no longer fit. The layout was automatically rearranged.',true);}},[packed.reset]);
 useEffect(()=>{const valid=new Set([...sheets.map(s=>s.id),...parts.map(p=>p.id)]);setSelectedIds(ids=>{const next=ids.filter(id=>valid.has(id)||id.includes('/offcut/')||id.startsWith('group/'));return next.length===ids.length?ids:next;});},[sheets,parts]);
 const part=parts.find(p=>p.id===selected);
 const sheetOfPart=part&&sheets.find(entry=>entry.sheet.placements.some(p=>p.part.id===part.id));
 const requestedGroup=groups.find(group=>selected===`group/${group.key}`);
 const entry=sheetOfPart??sheets.find(s=>s.id===selected||selected.startsWith(s.id+'/offcut/'))??(requestedGroup
  ?sheets.find(s=>s.key===requestedGroup.key):sheets[0]);
 const activeGroup=entry??requestedGroup??groups[0];
 const options=activeGroup?.options;
 const selectedSheets=sheets.filter(s=>selectedIds.includes(s.id));
 const shared=selectedSheets.length>1;
 const sharedMixed=shared&&selectedSheets.some(s=>JSON.stringify(s.options)!==JSON.stringify(options));
 const offcutIndex=selected.includes('/offcut/')?Number(selected.split('/offcut/').at(-1)):-1;
 const placement=sheetOfPart?.sheet.placements.find(p=>p.part.id===part?.id);
 const other=!!part?.twoSided&&reverse;
 const face=part&&(other?-part.face as FaceSign:part.face);
 const preview=useMemo(()=>part&&face?flatPreview(part,face):null,[part,face]);
 const offcuts=useMemo(()=>new Map(sheets.map(s=>[s.id,keepOffcuts?stockOffcuts(s,minimum,bitDiameter):[]])),
  [sheets,keepOffcuts,minimum,bitDiameter]);
 const overview=useMemo(():CncScene=>{
  const {width,height,positions}=sheetOverview(sheets.map(s=>s.stock));
  const items=sheets.map((s,i)=>({id:s.id,label:s.label,thickness:s.thickness,width:s.stock.width,height:s.stock.height,margin:s.stock.margin,
   ...positions[i],offcuts:offcuts.get(s.id)??[]}));
  return {key:'all-sheets',width,height,
   margin:0,stock:true,sheets:items,parts:items.flatMap((item,i)=>sheets[i].sheet.placements.map(p=>({...p,x:p.x+item.x,y:p.y+item.y})))};
 },[sheets,offcuts]);
 const isolated=part&&(!placement||other);
 const scene:CncScene=isolated&&part?{key:'part/'+part.id,width:part.width,height:part.height,stock:false,margin:0,
  parts:[{part,x:0,y:0,width:part.width,height:part.height,rotated:false}]}:overview;
 const chosen=options&&stockPresets.find(([w,h])=>w===options.width&&h===options.height);
 const review=evaluated.issues.filter(issue=>issue.code.startsWith('machining-')&&(!part||issue.featureId===part.id||issue.relatedIds?.includes(part.id)));

 function choose(id:string,additive=false){setSelectedIds(current=>sheetSelection(current,id,additive,sheets.map(s=>s.id),entry?.id));setReverse(false);setExpanded(false);}
 function changeStock(patch:Partial<StockSheet>){
  if(!activeGroup)return false;
  try{
   const edits=sharedStockEdits(shared?selectedSheets:[activeGroup],patch,allowance);
   edits.forEach(([key,stock])=>onSettings(key,stock));return true;
  }catch(error){onNotice((error as Error).message,true);return false;}

 }
 function repack(partId:string,patch:NestOverride){
  const next={...overrides,[partId]:{...overrides[partId],...patch}};
  try{const plan=planSheets(parts,settings,allowance,next);if(plan.unplaced.some(p=>p.id===partId))throw Error('The rotated part does not fit the stock size.');history.commit(next);choose(partId);}
  catch(error){onNotice((error as Error).message,true);}
 }
 function rotatePart(){if(!part||!placement)return;if(part.grain!=='none'){onNotice('This part follows stock grain and cannot be quarter-turned.',true);return;}repack(part.id,{rotated:!placement.rotated});}
 async function exportStep(){
  if(!entry||exporting.current)return;
  exporting.current=true;setProgress('Preparing STEP…');
  try{
   const material=entry.material.replace(/[^a-z0-9.-]+/gi,'-');
   const file=await requestSheetStep(sheetForExport(entry.sheet,entry.stock,offcuts.get(entry.id),includeStock),
    (done,total)=>setProgress(`Building solid ${done} of ${total}…`));
   downloadSheetStep(file,`${material}-${entry.label.toLowerCase().replace(' ','-')}.step`);
   onNotice(`${entry.label} STEP downloaded.`);
  }catch(error){onNotice((error as Error).message,true);}
  finally{exporting.current=false;setProgress('');}
 }
 const field=(key:'width'|'height'|'margin'|'gap',label:string)=>options&&<DimensionField plain label={label}
  value={options[key]} cancelValue={options[key]} limits={key==='width'||key==='height'?{min:100,max:10000}:{min:0,max:500}}
  onPreview={()=>{}} onCommit={value=>changeStock({[key]:value})} onCancel={()=>{}}/>;
 const toolParts=part?[part]:entry?.sheet.placements.map(p=>p.part)??[];

 return <div className="workspace cnc-workspace" id="workspace-cnc" role="tabpanel" aria-labelledby="workspace-tab-1" hidden={!active}>
  {parts.length>0&&<>
   <aside className="elements-panel cnc-elements" aria-label="CNC elements">
      <div className="panel-heading"><h2>Layout</h2><span className="count-badge">{parts.length} parts</span></div>
      <StructureGroup title="Sheets" count={sheets.length}>
       {sheets.map(s=><button type="button" className="tree-item" key={s.id} aria-pressed={selectedIds.length?selectedIds.includes(s.id):entry?.id===s.id} onClick={event=>choose(s.id,event.shiftKey||event.metaKey||event.ctrlKey)}>
        <Icon name="panel" size={20}/><span>{s.label}</span><small>{s.thickness} mm</small>
       </button>)}
      </StructureGroup>
      {entry&&<StructureGroup title={`${entry.label} parts`} count={entry.sheet.placements.length}>
       {entry.sheet.placements.map(({part:p})=><button type="button" className="tree-item" key={p.id} onClick={()=>choose(p.id)} aria-pressed={part?.id===p.id}>
        <Icon name={elementIcon(p.panel.role)} size={20}/><span>{p.label}</span>
       </button>)}
      </StructureGroup>}
      {unplaced.length>0&&<StructureGroup title="Unplaced parts" count={unplaced.length}>
       {unplaced.map(p=><button type="button" className="tree-item" key={p.id} onClick={()=>choose(p.id)} aria-pressed={part?.id===p.id}>
        <Icon name={elementIcon(p.panel.role)} size={20}/><span>{p.label}</span>
       </button>)}
      </StructureGroup>}

   </aside>
   <div className="canvas-area">
    <CncViewport onRotatePart={part&&placement?rotatePart:undefined} selectedIds={selectedIds.length?selectedIds:[entry?.id??'']} scene={scene} selection={part?.id??(offcutIndex>=0?selected:entry?.id)??''} reverse={other} theme={theme} onSelect={choose}/>
    {active&&notice}
   </div>
   <aside className="inspector" aria-label="CNC inspector">
    {Object.keys(overrides).length>0&&<div className="inspector-section"><Button className="full-width-button" onClick={()=>history.commit({})}>Auto arrange layout</Button></div>}
    <div className="inspector-title"><h2><Icon name={part?elementIcon(part.panel.role):'panel'} size={24}/>
     <span>{shared?`${selectedSheets.length} sheets`:part?.label??(offcutIndex>=0?`Offcut ${offcutIndex+1}`:undefined)??entry?.label??'Stock layout'}</span></h2></div>
    {offcutIndex>=0&&entry?<Section title="Offcut">
     <div className="data-row"><span>Size</span><strong>{offcuts.get(entry.id)?.[offcutIndex]?.width} × {offcuts.get(entry.id)?.[offcutIndex]?.height} × {entry.thickness} mm</strong></div>
     <Button onClick={()=>choose(entry.id)}>Sheet settings</Button>
    </Section>:part&&preview?<Section title="Part preview"><PartDrawing preview={preview} label={part.label}/><div className="data-row"><span>Thickness</span><strong>{part.thickness} mm</strong></div>{part.twoSided&&<Button onClick={()=>setReverse(v=>!v)}>Flip part</Button>}{placement&&<Button onClick={rotatePart}>Rotate part 90°</Button>}</Section>:options&&<><Section title={shared?'Shared stock settings':'Stock sheet'} aside={<span className="unit-badge">mm</span>}>
     {shared&&<p className="field-note">Changes apply to every selected stock type. Sheets of the same stock share settings.{sharedMixed?' Values differ; each edited field updates the selection.':''}</p>}
     <div className="data-row"><span>Material</span><strong>{activeGroup?.entries[0].material}</strong></div>
     <label className="construction-choice">Sheet size<span className="select select--fluid"><select aria-label="Sheet size"
      value={chosen?.join('x')??''} onChange={e=>{if(e.target.value){const [width,height]=e.target.value.split('x').map(Number);changeStock({width,height});}}}>
      {stockPresets.map(pair=><option value={pair.join('x')} key={pair.join('x')}>{pair.join(' × ')}</option>)}
      <option value="">Custom size</option></select><Icon name="chevron" size={12}/></span></label>
     <FieldPair>{field('width','Sheet width')}{field('height','Sheet height')}</FieldPair>
     <FieldPair>{field('margin','Edge margin')}{field('gap','Part gap')}</FieldPair>
     <label className="cnc-rotate"><input type="checkbox" checked={options.rotate} onChange={e=>changeStock({rotate:e.target.checked})}/> Rotate parts without grain</label>
     <div className="data-row"><span>Effective part gap</span><strong>{rounded(options.gap+allowance)} mm</strong></div>
     <div className="data-row"><span>Fit allowance included</span><strong>{allowance} mm</strong></div>
     <div className="data-row"><span>Sheet utilization</span><strong>{Math.round((entry?.sheet.utilization??0)*100)}%</strong></div>
    </Section>
    <Section title="Reusable offcuts">
     <label className="cnc-rotate"><input type="checkbox" checked={keepOffcuts} onChange={e=>setKeepOffcuts(e.target.checked)}/> Mark offcut cuts</label>
     {keepOffcuts&&<>
      <DimensionField plain stacked label="Minimum side (mm)" value={minimum} cancelValue={minimum} limits={{min:25,max:10000}}
       onPreview={()=>{}} onCommit={n=>{setMinimum(n);return true;}} onCancel={()=>{}}/>
      {((entry&&offcuts.get(entry.id))??[]).map((cut,i)=><div className="data-row" key={i}><span>Offcut {i+1}</span><strong>{cut.width} × {cut.height} mm</strong></div>)}
     </>}
    </Section>
    <Section title="Export sheet">
     <label className="cnc-rotate"><input type="checkbox" checked={includeStock} onChange={e=>setIncludeStock(e.target.checked)}/> Include stock body</label>
     <Button className="full-width-button" disabled={shared||!entry||!!progress} onClick={exportStep}>Export STEP</Button>
     {progress&&<p className="field-note" role="status">{progress}</p>}
    </Section></>}
    {evaluated.drawers.drawers.length>0&&<Section title="Drawer preparation"><p className="field-note">Drawer boards are included. Prepare the runner, front brackets, and board-to-metal fixings using the matched Blum assembly instructions and template.</p></Section>}
    <Section title="Cut bits">
     <DrillingDetails holes={parts.flatMap(p=>p.holes)} cutter={bitDiameter} limit={cutterLimit(parts)}/>
    </Section>
    {(!!review.length||(!part&&!!unplaced.length)||(!part&&entry&&entry.stock.gap<bitDiameter)||toolParts.some(p=>p.twoSided||p.edgeOperations))&&
     <Section title="Setup checks">
      {(!part&&!!unplaced.length)&&<p className="field-note">{unplaced.length} unplaced {unplaced.length===1?'part':'parts'}. Check sheet size or margins.</p>}
      {!part&&entry&&entry.stock.gap<bitDiameter&&<p className="field-note">Effective part gap is smaller than the cutter.</p>}
      {toolParts.some(p=>p.twoSided||p.edgeOperations)&&<p className="field-note">Some cuts require a reverse-face or edge setup.</p>}
      {!!review.length&&<Button onClick={()=>onReview(part?.id)}>Review machining checks in Build</Button>}
     </Section>}

   </aside>
  </>}
 </div>;
}
