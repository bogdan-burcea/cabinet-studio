import { useEffect, useState } from 'react';
import type { Cabinet, SlabDoor } from '../domain/cabinet';
import type { EvaluatedCabinet } from '../geometry/evaluate';
import { addDoor, addDoorPair, removeDoor, splitDoor, updateDoor } from '../commands/fronts';
import { conceptHandle } from '../catalogue/fronts';
import { Section, Button } from './components';
import { DimensionField } from './DimensionField';
interface Props {
  committed:Cabinet; preview:Cabinet|null; error:string|null; evaluated:EvaluatedCabinet; selection:string;
  onPreview(c:Cabinet):boolean; onCommit(c:Cabinet):boolean; onCancel():void; onSelect(id:string):void; onNotice(message:string):void;
  visible:boolean; onVisibility(value:boolean):void; angles:Record<string,number>; onAngle(id:string,value:number):void; onCloseAll():void;
}
export function FrontInspector(p:Props) {
  const [draft,setDraft]=useState<Cabinet|null>(null),[valid,setValid]=useState(true),[split,setSplit]=useState('50');
  const model=draft??p.committed,door=model.fronts.find(door=>door.id===p.selection),shown=p.evaluated.fronts.doors.find(door=>door.id===p.selection);
  const pending=!!draft;
  const reset=()=>{setDraft(null);setValid(true);};
  useEffect(reset,[p.committed]);
  useEffect(()=>{if(draft&&((!p.preview&&!p.error)||(p.preview&&JSON.stringify(p.preview)!==JSON.stringify(draft))))reset();},[p.preview,p.error]);
  function review(next:Cabinet,id?:string){setDraft(next);const ok=p.onPreview(next);setValid(ok);if(ok&&id)p.onSelect(id);return ok;}
  function action(make:()=>{cabinet:Cabinet;featureId:string}){try{const next=make();review(next.cabinet,next.featureId);}catch(error){p.onNotice((error as Error).message);}}
  function edit(change:Partial<SlabDoor>){return review(updateDoor(model,door!.id,change));}
  function handle(change:Partial<SlabDoor['handle']>){return edit({handle:{...door!.handle,...change}});}
  function cancel(){reset();p.onCancel();}
  const field=(label:string,key:'reveal'|'clearance')=><DimensionField key={`${door!.id}/${key}`} retainInvalid label={label} value={door![key]} cancelValue={p.committed.fronts.find(d=>d.id===door!.id)?.[key]??2} limits={{min:1,max:10}} onPreview={v=>edit({[key]:v})} onCommit={v=>edit({[key]:v})} onCancel={cancel}/>;
  return <div onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();cancel();}}}><Section title="Slab doors & handles" aside={<span className="unit-badge">CONCEPT</span>}>
    {!door&&<><p className="field-note">Front layout is independent of shelves and dividers. A full-height door can cover several compartments.</p>{model.fronts.length===0&&<div className="interior-actions"><Button className="primary-button" onClick={()=>action(()=>addDoor(model))}>Preview full-height door</Button><Button onClick={()=>action(()=>addDoorPair(model))}>Preview door pair</Button></div>}
      {p.evaluated.openings.some(o=>o.id===p.selection)&&<Button onClick={()=>action(()=>addDoor(model,p.selection))}>Preview door over this area</Button>}
      {model.fronts.length>0&&<p className="field-note">Select a slab door in 3D or Structure to change its layout, handing or handle.</p>}</>}
    {door&&<>
      {shown&&valid&&<div className="data-row"><span>Closed slab size</span><strong>{shown.size.map(n=>Number(n.toFixed(1))).join(' × ')} mm</strong></div>}
      <label className="construction-choice">Placement<select aria-label="Door placement" value={door.placement} onChange={e=>edit({placement:e.target.value as SlabDoor['placement']})}><option value="overlay">Overlay · concept</option><option value="inset">Inset · concept</option></select></label>
      <label className="construction-choice">Hinge side<select aria-label="Door hinge side" value={door.handing} onChange={e=>edit({handing:e.target.value as SlabDoor['handing']})}><option value="left">Left</option><option value="right">Right</option></select></label>
      <details className="advanced-material"><summary>Door gaps & front divisions</summary>{field('Door reveal','reveal')}{field('Front clearance','clearance')}
        <label className="construction-choice">First section (%)<input aria-label="Front split percentage" type="number" min="10" max="90" value={split} onChange={e=>setSplit(e.target.value)}/></label>
        <div className="interior-actions"><Button onClick={()=>action(()=>splitDoor(model,door.id,'vertical',Number(split)/100))}>Split left / right</Button><Button onClick={()=>action(()=>splitDoor(model,door.id,'horizontal',Number(split)/100))}>Split bottom / top</Button></div>
        <p className="field-note">Coverage proportions follow body resizing. Splitting preserves the first door ID and copies its material, handle and edge intent. Interiors stay unchanged.</p>
      </details>
      <label className="construction-choice">Handle<select aria-label="Door handle style" value={door.handle.kind} onChange={e=>handle({kind:e.target.value as SlabDoor['handle']['kind']})}><option value="none">No handle</option><option value="knob">Knob · concept</option><option value="pull">Pull · concept</option></select></label>
      {door.handle.kind!=='none'&&<>
        {door.handle.kind==='pull'&&<><label className="construction-choice">Pitch<select aria-label="Handle pitch" value={door.handle.pitch} onChange={e=>handle({pitch:Number(e.target.value)})}>{conceptHandle.pitches.map(pitch=><option key={pitch} value={pitch}>{pitch} mm · concept</option>)}</select></label><label className="construction-choice">Direction<select aria-label="Handle orientation" value={door.handle.orientation} onChange={e=>handle({orientation:e.target.value as SlabDoor['handle']['orientation']})}><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select></label></>}
        <label className="construction-choice">Height<select aria-label="Handle height" value={door.handle.height} onChange={e=>handle({height:e.target.value as SlabDoor['handle']['height']})}><option value="top">Near top</option><option value="centre">Centred</option><option value="bottom">Near bottom</option></select></label>
        <details className="advanced-material"><summary>Handle edge offsets</summary>{(['edgeOffset','endOffset'] as const).map(key=><DimensionField key={`${door.id}/${key}`} retainInvalid label={key==='edgeOffset'?'Handle free-edge offset':'Handle end offset'} value={door.handle[key]} cancelValue={p.committed.fronts.find(d=>d.id===door.id)?.handle[key]??(key==='edgeOffset'?40:60)} limits={{min:10,max:key==='edgeOffset'?200:300}} onPreview={v=>handle({[key]:v})} onCommit={v=>handle({[key]:v})} onCancel={cancel}/>)}<p className="field-note">Offsets measure from the slab edge to the nearest handle end. The free edge follows handing. End offset applies near top/bottom.</p></details>
      </>}
      <div className="interior-actions"><Button onClick={()=>review(removeDoor(model,door.id))}>Preview remove door</Button></div>
      <p className="field-note">Door material inherits the carcass unless overridden in Materials & edge banding. Its four edges use the existing banding controls.</p>
    </>}
    {pending&&<div className="construction-review" role="status"><strong>{valid?'Front / handle preview':'Front edit needs a correction'}</strong><p>{valid?'Review the closed layout before applying. Construction, interiors and installation settings are preserved.':'Resolve the identified layout, handle or inset conflict, or cancel. The committed cabinet remains unchanged.'}</p><div className="interior-actions"><Button className="primary-button" disabled={!valid} onClick={()=>p.onCommit(model)}>Apply fronts & handles</Button><Button onClick={cancel}>Cancel front preview</Button></div></div>}
    {model.fronts.length>0&&<div className="front-inspection"><label className="switch-row"><span>Show slab doors</span><input type="checkbox" role="switch" checked={p.visible} onChange={e=>p.onVisibility(e.target.checked)}/></label>{door&&<label className="front-angle">Inspection opening · {p.angles[door.id]??0}°<input aria-label="Door inspection angle" type="range" min="0" max="110" step="5" value={p.angles[door.id]??0} onChange={e=>p.onAngle(door.id,Number(e.target.value))}/></label>}<Button onClick={p.onCloseAll}>Close all doors</Button><p className="field-note">Opening and visibility are view-only and are not saved. Illustrative edge-pivot motion does not prove hinge, handle or adjacent-door clearance.</p></div>}
    {p.evaluated.fronts.doors.length>0&&valid&&<div className="data-row"><span>Closed overall depth</span><strong>{Number(p.evaluated.fronts.overallDepth.toFixed(1))} mm</strong></div>}
    <p className="field-note">Exact hinge/plate, handles, screws, drilling and product compatibility are deferred. These slab and handle envelopes are conceptual, not verified fittings.</p>
  </Section></div>;
}
