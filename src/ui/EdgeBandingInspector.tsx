import type {Cabinet} from '../domain/cabinet';
import type {Panel} from '../geometry/evaluate';
import {setBanding} from '../commands/materials';
import {DimensionField} from './DimensionField';
import {Button,FieldPair,Section} from './components';
export function EdgeBandingInspector({cabinet,panels,selectedEdge,selectedEdges=[],shared=false,commit,cancel,select}:{cabinet:Cabinet;panels:Panel[];selectedEdge?:string;selectedEdges?:string[];shared?:boolean;commit(c:Cabinet):boolean;cancel():void;select(id:string):void}){
 const supported=panels.filter(p=>(p.role!=='back'&&p.constructionPart!=='back'||cabinet.carcass.back.mode==='full'&&cabinet.carcass.back.joint?.mode==='applied')&&!cabinet.fronts.some(d=>d.id===p.id&&(d.style==='shaker-frame'||d.style==='shaker-routed-panel')));
 if(!supported.length)return null;
 const strips=supported.flatMap(panel=>panel.edges.filter(edge=>edge.product&&selectedEdges.includes(edge.id)).map(edge=>({panel,edge})));
 if(strips.length>1){
  const value=strips[0].edge.thickness,mixed=strips.some(s=>s.edge.thickness!==value);
  return <Section title="Edge banding" aside={<span className="unit-badge">mm</span>}>
   <DimensionField plain label="Thickness" accessibleLabel="Selected edge band thickness" step={.1} value={value} cancelValue={value} limits={{min:0,max:20}} onPreview={()=>{}} onCancel={cancel} onCommit={n=>commit(strips.reduce((c,{panel,edge})=>setBanding(c,panel.id,edge.key,n?{id:`generic-edge-${n}`,revision:'1'}:null),cabinet))}/>
   <p className="field-note">{mixed?'Selected bands have different thicknesses. ':''}Changes apply to all {strips.length} selected bands. 0 removes them.</p>
  </Section>;
 }
 return <Section title="Edge banding" aside={<span className="unit-badge">mm</span>}>
  {(shared?supported.slice(0,1):supported).map(panel=><div key={panel.id}>
   {shared&&<p className="field-note">Changes apply to all {supported.length} selected parts.</p>}
   {!shared&&supported.length>1&&<p className="field-note">{panel.label}</p>}
   {!!(cabinet.fronts.find(d=>d.id===panel.id)??cabinet.drawers?.find(d=>`${d.id}/front`===panel.id))?.cornerRadius&&<p className="field-note">Banding around rounded corners is not supported yet. Keep this front unbanded, or set Corner radius to 0 before adding bands.</p>}
   <FieldPair>{panel.edges.filter(edge=>!selectedEdge||edge.id===selectedEdge).map(edge=><DimensionField key={edge.id} plain label={edge.label} accessibleLabel={`${panel.label} ${edge.label.toLowerCase()} band thickness`} step={.1} value={edge.thickness} cancelValue={edge.thickness} limits={{min:0,max:20}} onPreview={()=>{}} onCancel={cancel} onCommit={n=>commit((shared?supported:[panel]).reduce((c,p)=>setBanding(c,p.id,edge.key,n?{id:`generic-edge-${n}`,revision:'1'}:null),cabinet))}/>)}</FieldPair>
   <p className="field-note">Board core: {panel.coreSize.map(n=>+n.toFixed(1)).join(' × ')} mm</p>
   {selectedEdge&&<Button className="full-width-button" onClick={()=>select(panel.id)}>Edit part</Button>}
  </div>)}
  <p className="field-note">0 means no band. Finished dimensions stay the same; banding reduces the board core. Select a strip in 3D or Structure to edit it.</p>
 </Section>;
}
