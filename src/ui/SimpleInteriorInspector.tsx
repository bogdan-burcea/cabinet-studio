import {useMemo} from 'react';
import type {Cabinet,DivisionAxis} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {evaluate} from '../geometry/evaluate';
import {addDivision,centreDivision,moveDivision,removeDivision,setInteriorFinger,findDivision} from '../commands/interiors';
import {Icon} from '../design-system/Icon';
import {Button,Section} from './components';
import {DimensionField} from './DimensionField';
export function SimpleInteriorInspector(p:{cabinet:Cabinet;committed:Cabinet;evaluated:EvaluatedCabinet;selection:string;onCommit(c:Cabinet):boolean;onCancel():void;onSelect(id:string):void;onNotice(s:string):void;positionRef(el:HTMLInputElement|null):void}){
 const division=p.evaluated.divisions.find(d=>d.id===p.selection);
 const opening=p.evaluated.openings.find(o=>o.id===p.selection)??(p.selection===p.cabinet.id&&p.evaluated.openings.length===1?p.evaluated.openings[0]:undefined);
 const original=useMemo(()=>evaluate(p.committed).divisions.find(d=>d.id===p.selection),[p.committed,p.selection]);
 function edit(make:()=>Cabinet){try{return p.onCommit(make());}catch(e){p.onNotice((e as Error).message);return false;}}
 function add(axis:DivisionAxis){if(!opening)return;try{const result=addDivision(p.committed,opening.id,axis,Math.round(opening.size[axis==='horizontal'?1:0]*5)/10);if(p.onCommit(centreDivision(result.cabinet,result.featureId)))p.onSelect(result.featureId);}catch(e){p.onNotice((e as Error).message);}}
 if(division){
  const shelf=division.axis==='horizontal',kind=shelf?'shelf':'divider',half=division.size[shelf?1:0]/2;
  const node=findDivision(p.cabinet.compartments,division.id);
  return <Section title={division.label} aside={<span className="unit-badge">mm</span>}>
   <DimensionField plain key={division.id} label={shelf?'Clear space below':'Clear space left'} value={division.before} cancelValue={original?.before??division.before} limits={{min:division.min-half,max:division.max-half}} register={p.positionRef} onPreview={()=>{}} onCommit={v=>edit(()=>moveDivision(p.committed,division.id,Math.round((v+half)*10)/10))} onCancel={p.onCancel}/>
   <div className="data-row"><span>{shelf?'Clear above':'Clear right'}</span><strong>{+division.after.toFixed(1)} mm</strong></div>
   <div className="interior-actions"><Button onClick={()=>edit(()=>centreDivision(p.committed,division.id))}>Centre {kind}</Button><Button className="destructive-button" disabled={!division.canRemove} title={division.canRemove?`Remove this ${kind} (Backspace)`:'Remove nested shelves and dividers first'} onClick={()=>{if(edit(()=>removeDivision(p.committed,division.id)))p.onSelect(division.nodeId);}}>Remove {kind}</Button></div>
   <label className="construction-choice spaced-choice">End joints<span className="select select--fluid"><select aria-label={`${shelf?'Shelf':'Divider'} end joints`} value={node?.joint?'finger':'butt'} onChange={e=>edit(()=>setInteriorFinger(p.committed,division.id,e.target.value==='finger'))}><option value="butt">Butt / global fasteners</option><option value="finger">Finger joints</option></select><Icon name="chevron" size={12}/></span></label>
   {node?.joint&&<DimensionField plain label="Target finger width" value={node.joint.pitch} cancelValue={node.joint.pitch} limits={{min:20,max:200}} onPreview={()=>{}} onCommit={pitch=>edit(()=>setInteriorFinger(p.committed,division.id,true,pitch))} onCancel={p.onCancel}/>}
   <p className="field-note">{shelf?'Clear gap from the opening floor to the underside of this shelf.':'Clear gap from the opening’s left side to the left face of this divider.'}{!division.canRemove?' Remove nested shelves and dividers first.':''}</p>
  </Section>;
 }
 if(p.evaluated.panels.some(panel=>panel.id===p.selection))return null;
 if(!opening)return null;
 return <Section title="Interior">{opening?<div className="interior-actions"><Button className="primary-button" onClick={()=>add('horizontal')}>Add shelf</Button><Button onClick={()=>add('vertical')}>Add divider</Button></div>:<p className="field-note">Select an opening to add a shelf or divider.</p>}</Section>;
}
