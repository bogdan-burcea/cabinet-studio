import {useEffect,useState} from 'react';
import type {CustomHingeSpec} from '../domain/cabinet';
import {customHingeLimits} from '../catalogue/custom-hinge';
import {FieldPair,Button} from './components';
import {DimensionField} from './DimensionField';
import {HingeMountingDrawing} from './HingeMountingDrawing';
const mainFields=['maxAngle','cupDiameter','cupDepth','screwPitch','screwOffset','plateLine','platePitch'] as const;
const labels:Record<keyof typeof customHingeLimits,string>={cupDiameter:'Cup diameter · D',cupDepth:'Cup depth · C',screwPitch:'Screw pitch · P',screwOffset:'Screw offset · O',plateLine:'Plate line · L',platePitch:'Plate pitch · R',doorPilotDiameter:'Door pilot diameter',doorPilotDepth:'Door pilot depth',platePilotDiameter:'Plate pilot diameter',platePilotDepth:'Plate pilot depth',maxAngle:'Opening angle · A (°)',mountingReach:'Hinge inward reach',mountingHeight:'Hinge zone height',mountingDepth:'Hinge zone depth',openProtrusion:'Door protrusion at 90°',openingAdvance:'Opening forward travel'};
export function CustomHingeFields(p:{spec:CustomHingeSpec;cupDistance:number;onChange(change:Partial<CustomHingeSpec>,cupDistance:number):boolean;onCancel():void}){
 const [draft,setDraft]=useState(p.spec),[cupDistance,setCupDistance]=useState(p.cupDistance);
 useEffect(()=>setDraft(p.spec),[p.spec]);useEffect(()=>setCupDistance(p.cupDistance),[p.cupDistance]);
 const change=(patch:Partial<CustomHingeSpec>)=>{setDraft(d=>({...d,...patch}));return true;};
 const field=(key:keyof typeof customHingeLimits)=>{const [min,max]=customHingeLimits[key];return <DimensionField key={key} plain label={labels[key]} value={draft[key]} cancelValue={draft[key]} limits={{min,max}} step={.1} onPreview={()=>{}} onCommit={value=>change({[key]:value})} onCancel={p.onCancel}/>;};
 return <div className="custom-hinge-fields"><FieldPair>{(['article','plate'] as const).map(key=><label key={key} className="construction-choice custom-hinge-reference">{key==='article'?'Hinge reference':'Plate reference'}<span className="textbox textbox--fluid"><input className="textbox__control" aria-label={key==='article'?'Hinge reference':'Plate reference'} placeholder="Optional" maxLength={100} value={draft[key]} onChange={e=>change({[key]:e.target.value})}/></span></label>)}</FieldPair>
 <FieldPair>{field('maxAngle')}<DimensionField plain label="Cup setback · E" value={cupDistance} cancelValue={cupDistance} limits={{min:3,max:30}} step={.1} onPreview={()=>{}} onCommit={value=>{setCupDistance(value);return true;}} onCancel={p.onCancel}/>{mainFields.filter(key=>key!=='maxAngle').map(field)}</FieldPair>
 <details className="advanced-material custom-hinge-advanced"><summary>Advanced mounting & clearance</summary><FieldPair>{(Object.keys(customHingeLimits) as (keyof typeof customHingeLimits)[]).filter(key=>!mainFields.some(main=>main===key)).map(field)}</FieldPair></details>
 <HingeMountingDrawing spec={draft} cupDistance={cupDistance}/>
 <p className="field-note">Copy the dimensions from the hinge packaging or mounting drawing. E is the door edge to the cup edge; O is the cup centre to the screw line. L starts at the cabinet front, including the inset-door allowance. Keep advanced values unless your fitting specifies different drilling or clearance.</p>
 <Button className="primary-button custom-hinge-apply" onClick={()=>p.onChange({...draft,article:draft.article.trim()||'Custom hinge',plate:draft.plate.trim()||'Custom mounting plate'},cupDistance)}>Apply mounting details</Button></div>;
}
