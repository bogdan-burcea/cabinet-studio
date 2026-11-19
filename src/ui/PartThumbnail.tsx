import {partPreview} from '../geometry/part-preview';
import type {BackPocket} from '../rules/back-panel';
import {faceAxes} from '../geometry/banding';
import {useState,useEffect,useRef,useId} from 'react';
import type {Panel} from '../geometry/evaluate';
import type {CabineoBore} from '../rules/cabineo';
import type {CabineoJoint} from '../rules/cabineo';
import {partFace,preferredFace} from '../geometry/part-face';
import {Section,IconButton} from './components';
export function PartThumbnail({panel,joints,pockets=[],backBores=[],drilling=[]}:{panel:Panel;joints:CabineoJoint[];pockets?:BackPocket[];backBores?:CabineoBore[];drilling?:CabineoBore[]}){
 const bores=[...joints.flatMap(j=>j.bores),...backBores,...drilling],preferred=preferredFace(panel,bores),[flipped,setFlipped]=useState(false);
 const sign=flipped?-preferred as 1|-1:preferred,face=partFace(panel,bores,sign),opposed=bores.some(b=>b.panelId===panel.id&&b.sign===sign);
 const [expanded,setExpanded]=useState(false),dialog=useRef<HTMLDialogElement>(null),title=useId();
 useEffect(()=>{if(expanded)dialog.current?.showModal();else dialog.current?.close();},[expanded]);
 const preview=partPreview(panel,bores,pockets,sign);
 const scale=Math.min(232/face.width,184/face.height),w=face.width*scale,h=face.height*scale,x=(280-w)/2,y=(232-h)/2;
 const image=<svg className="part-thumbnail" viewBox="0 0 280 256" role="img" aria-label={`${panel.label}, flat ${flipped?'opposite':'machinable'} face, ${face.width} by ${face.height} millimetres, ${face.bores.length} bores`}>

   <svg x={x} y={y} width={w} height={h} viewBox={`0 0 ${face.width} ${face.height}`} overflow="visible"><path className="part-outline" d={preview.outline} vectorEffect="non-scaling-stroke" fillRule="evenodd"/><path className="back-pocket" d={preview.slots} vectorEffect="non-scaling-stroke" fillRule="evenodd"/>{preview.bores.map(b=><path key={b.kind} className={b.kind==='housing'?'housing-bore':'receiver-bore'} d={b.path} vectorEffect="non-scaling-stroke" fillRule="evenodd"/>)}</svg>
   <text x="140" y={y+h+18} textAnchor="middle">{+face.width.toFixed(1)} mm</text><text x={x-10} y="116" textAnchor="middle" transform={`rotate(-90 ${x-10} 116)`}>{+face.height.toFixed(1)} mm</text>
  </svg>;
 return <Section title="Part preview" aside={<div className="part-preview-actions"><IconButton icon="exploded" label="Expand part preview" onClick={()=>setExpanded(true)}/></div>}>
  {image}
  <dialog ref={dialog} role="dialog" aria-modal="true" aria-labelledby={title} hidden={!expanded} className="lightbox-dialog part-preview-dialog" onCancel={()=>setExpanded(false)} onClose={()=>setExpanded(false)} onClick={e=>{if(e.target===e.currentTarget)setExpanded(false);}}><div className="lightbox-dialog__window"><div className="lightbox-dialog__header"><h2 id={title}>{panel.label}</h2><IconButton icon="close" label="Close part preview" onClick={()=>setExpanded(false)}/></div><div className="lightbox-dialog__main">{image}{opposed&&<button className="btn btn--secondary" onClick={()=>setFlipped(v=>!v)}>Flip part</button>}</div></div></dialog>
  {drilling.some(b=>b.panelId===panel.id)&&<div className="data-row"><span>Drilled holes</span><strong>{drilling.filter(b=>b.panelId===panel.id).length}</strong></div>}
  {backBores.some(b=>b.panelId===panel.id)&&<div className="data-row"><span>Back connectors</span><strong>{backBores.filter(b=>b.panelId===panel.id).length}</strong></div>}
  {face.bores.some(b=>b.through)&&<div className="data-row"><span>Through bores</span><strong>{face.bores.filter(b=>b.through).length}</strong></div>}
  <div className="data-row"><span>Thickness</span><strong>{face.thickness} mm</strong></div>
  {opposed&&<button className="btn btn--secondary" onClick={()=>setFlipped(v=>!v)}>Flip part</button>}
  {joints.some(j=>j.hostId===panel.id||j.receiverId===panel.id)&&<div className="data-row"><span>Cabineo joints</span><strong>{joints.filter(j=>j.hostId===panel.id||j.receiverId===panel.id).length}</strong></div>}
 </Section>;
}
