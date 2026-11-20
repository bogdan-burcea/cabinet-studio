import {partPreview} from '../geometry/part-preview';
import type {BackPocket} from '../rules/back-panel';
import {machiningFaces} from '../rules/machining-review';
import {useState} from 'react';
import type {Panel} from '../geometry/evaluate';
import type {CabineoBore} from '../rules/cabineo';
import type {CabineoJoint} from '../rules/cabineo';
import {cabinetFace,partFace,preferredFace} from '../geometry/part-face';
import {DrillingDetails} from './DrillingDetails';
import {PartDrawing} from './PartDrawing';
import {Section,IconButton} from './components';
export function PartThumbnail({panel,joints,pockets=[],backBores=[],drilling=[]}:{panel:Panel;joints:CabineoJoint[];pockets?:BackPocket[];backBores?:CabineoBore[];drilling?:CabineoBore[]}){
 const bores=[...joints.flatMap(j=>j.bores),...backBores,...drilling],preferred=preferredFace(panel,bores),[flipped,setFlipped]=useState(false);
 const faces=machiningFaces(panel,bores,pockets),opposed=faces.size===2;
 const primary=faces.size===1?[...faces][0]:preferred;
 const sign=flipped&&opposed?-primary as 1|-1:primary as 1|-1,face=partFace(panel,bores,sign);
 const preview=partPreview(panel,bores,pockets,sign);
 return <Section title="Part preview">
  <PartDrawing preview={preview} label={panel.label}/>
  {drilling.some(b=>b.panelId===panel.id)&&<div className="data-row"><span>Drilled holes</span><strong>{drilling.filter(b=>b.panelId===panel.id).length}</strong></div>}
  {backBores.some(b=>b.panelId===panel.id)&&<div className="data-row"><span>Back connectors</span><strong>{backBores.filter(b=>b.panelId===panel.id).length}</strong></div>}
  {face.bores.some(b=>b.through)&&<div className="data-row"><span>Through bores</span><strong>{face.bores.filter(b=>b.through).length}</strong></div>}
  <div className="data-row"><span>Thickness</span><strong>{face.thickness} mm</strong></div>
  {opposed&&<button className="btn btn--secondary" onClick={()=>setFlipped(v=>!v)}>Flip part</button>}
  {joints.some(j=>j.hostId===panel.id||j.receiverId===panel.id)&&<div className="data-row"><span>Cabineo joints</span><strong>{joints.filter(j=>j.hostId===panel.id||j.receiverId===panel.id).length}</strong></div>}
 </Section>;
}
