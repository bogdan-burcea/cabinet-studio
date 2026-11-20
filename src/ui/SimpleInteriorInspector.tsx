import {bestDrawerPack} from '../rules/drawer-rails';
import {DrawerPackFields} from './DrawerPackFields';
import {drawerPacks} from '../catalogue/drawers';
import {InteriorTabs} from './InteriorTabs';
import {addDrawerStack} from '../commands/drawers';
import {addSimpleDoors} from '../commands/simple-doors';
import {addInteriors,addInteriorBatch,setInteriorInsets} from '../commands/simple-interiors';
import {addSimpleAdjustable,changeSimpleShelfKind} from '../commands/adjustable';
import {ShelfTypeField} from './SimpleAdjustableInspector';
import {useMemo,useState} from 'react';
import type {Cabinet,DivisionAxis} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {evaluate} from '../geometry/evaluate';
import {addDivision,centreDivision,moveDivision,removeDivision,setInteriorFinger,setInteriorFingers,findDivision} from '../commands/interiors';
import {Icon} from '../design-system/Icon';
import {Button,Section,FieldPair} from './components';
import {DimensionField} from './DimensionField';
export function SimpleInteriorInspector(p:{cabinet:Cabinet;committed:Cabinet;evaluated:EvaluatedCabinet;selection:string;selectedIds?:string[];onRemove?(ids:string[]):void;onCommit(c:Cabinet):boolean;onCancel():void;onSelect(id:string):void;onSelectMany?(ids:string[]):void;onNotice(s:string):void;positionRef(el:HTMLInputElement|null):void}){
 const [interiorCount,setInteriorCount]=useState(1);
 const [drawerCount,setDrawerCount]=useState(3);
 const [doorLayout,setDoorLayout]=useState<'single'|'pair'>('single');
 const [drawerSystem,setDrawerSystem]=useState(drawerPacks[0].id);
 const [category,setCategory]=useState<'shelves'|'doors'|'drawers'>('shelves');
 const [shelfType,setShelfType]=useState<'fixed'|'adjustable'>('fixed'),[createInset,setCreateInset]=useState(0),[targetOpening,setTargetOpening]=useState('');
 const division=p.evaluated.divisions.find(d=>d.id===p.selection);
 const opening=p.evaluated.openings.find(o=>o.id===p.selection)??(p.selection===p.cabinet.id&&p.evaluated.openings.length===1?p.evaluated.openings[0]:undefined);
 const original=useMemo(()=>evaluate(p.committed).divisions.find(d=>d.id===p.selection),[p.committed,p.selection]);
 function edit(make:()=>Cabinet){try{return p.onCommit(make());}catch(e){p.onNotice((e as Error).message);return false;}}
 const ids=p.selectedIds??[p.selection],nodes=ids.map(id=>findDivision(p.cabinet.compartments,id));
 const openings=p.evaluated.openings.filter(o=>ids.includes(o.id)),main=p.selection===p.cabinet.id,targets=main?(targetOpening==='all'?p.evaluated.openings:[p.evaluated.openings.find(o=>o.id===targetOpening)??p.evaluated.openings[0]]):openings.length===ids.length?openings:opening?[opening]:[];
 const doorActions=<><label className="construction-choice">Door layout<span className="select select--fluid"><select aria-label="Door layout" value={doorLayout} onChange={e=>setDoorLayout(e.target.value as 'single'|'pair')}><option value="single">Single door</option><option value="pair">Door pair</option></select><Icon name="chevron" size={12}/></span></label><Button className="primary-button full-width-button" onClick={()=>{try{const next=addSimpleDoors(p.committed,doorLayout,targets.map(o=>o.id));if(p.onCommit(next.cabinet)){if(p.onSelectMany)p.onSelectMany(next.featureIds);else p.onSelect(next.featureIds[0]);}}catch(e){p.onNotice((e as Error).message);}}}>Add {doorLayout==='single'?'door':'door pair'}</Button></>;

 const creation=()=>{const max=Math.max(0,Math.min(...targets.map(o=>o.size[2]-60)));
  const add=(kind:'fixed'|'adjustable'|'divider')=>{try{const next=addInteriorBatch(p.committed,targets.map(o=>o.id),kind,createInset,interiorCount);if(p.onCommit(next.cabinet)){if(p.onSelectMany)p.onSelectMany(next.featureIds);else p.onSelect(next.featureIds[0]);}}catch(e){p.onNotice((e as Error).message);}};
  return <Section title="Interior">{main&&p.evaluated.openings.length>1&&<label className="construction-choice">Opening<span className="select select--fluid"><select aria-label="Interior opening" value={targetOpening||targets[0]?.id} onChange={e=>setTargetOpening(e.target.value)}>{p.evaluated.openings.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}<option value="all">All openings</option></select><Icon name="chevron" size={12}/></span></label>}<InteriorTabs value={category} onChange={setCategory}/><div role="tabpanel" id="interior-creation-panel" aria-labelledby={`interior-tab-${category}`}>
   {category==='shelves'&&<><FieldPair><ShelfTypeField value={shelfType} onChange={setShelfType}/><DimensionField plain label="Front inset" value={createInset} cancelValue={createInset} limits={{min:0,max}} onPreview={()=>{}} onCommit={n=>{if(!Number.isFinite(n)||n<0||n>max)return false;setCreateInset(n);return true;}} onCancel={p.onCancel}/></FieldPair><FieldPair><DimensionField plain label="Quantity" value={interiorCount} cancelValue={interiorCount} limits={{min:1,max:16}} onPreview={()=>{}} onCommit={n=>{setInteriorCount(n);return true;}} onCancel={()=>{}}/></FieldPair><div className="interior-actions"><Button className="primary-button" onClick={()=>add(shelfType)}>Add {targets.length>1||interiorCount>1?'shelves':'shelf'}</Button><Button onClick={()=>add('divider')}>Add {targets.length>1||interiorCount>1?'dividers':'divider'}</Button></div></>}{category==='doors'&&doorActions}{category==='drawers'&&<><DrawerPackFields automatic value={bestDrawerPack(p.committed,targets[0]?.id??'',{id:drawerSystem,revision:'catalogue-2024-1'})} onChange={pin=>setDrawerSystem(pin.id)}/><FieldPair><DimensionField plain label="Drawers" value={drawerCount} cancelValue={drawerCount} limits={{min:1,max:16}} onPreview={()=>{}} onCommit={n=>{setDrawerCount(n);return true;}} onCancel={()=>{}}/></FieldPair><Button className="full-width-button primary-button" onClick={()=>{try{let cabinet=p.committed;const added:string[]=[];for(const target of targets){const result=addDrawerStack(cabinet,target.id,drawerCount,{id:drawerSystem,revision:'catalogue-2024-1'});cabinet=result.cabinet;added.push(...result.featureIds);}if(p.onCommit(cabinet)){if(p.onSelectMany)p.onSelectMany(added);else p.onSelect(added[0]);}}catch(e){p.onNotice((e as Error).message);}}}>Add drawers</Button></>}</div></Section>;
 };
 if(main)return creation();
 if(targets.length===ids.length&&targets.length>1)return creation();
 if(ids.length>1){
  if(nodes.some(n=>!n)||nodes.some(n=>n!.axis!==nodes[0]!.axis))return null;
  const allFinger=nodes.every(n=>n!.joint),allButt=nodes.every(n=>!n!.joint),pitch=nodes[0]!.joint?.pitch??50,mixedPitch=nodes.some(n=>(n!.joint?.pitch??50)!==pitch);
  return <Section title="Shared features"><FieldPair><DimensionField plain label="Front inset" value={nodes[0]?.frontSetback??0} cancelValue={nodes[0]?.frontSetback??0} limits={{min:0,max:Math.min(...ids.map(id=>{const d=p.evaluated.divisions.find(d=>d.id===id)!;return d.size[2]+(findDivision(p.cabinet.compartments,id)?.frontSetback??0)-60;}))}} onPreview={()=>{}} onCommit={n=>edit(()=>setInteriorInsets(p.committed,ids,n))} onCancel={p.onCancel}/></FieldPair><p className="field-note">Changes apply to all {ids.length} selected {nodes[0]!.axis==='horizontal'?'shelves':'dividers'} in one Undo step.</p><label className="construction-choice spaced-choice">End joints<span className="select select--fluid"><select aria-label="Selected end joints" value={allFinger?'finger':allButt?'butt':''} onChange={e=>edit(()=>setInteriorFingers(p.committed,ids,e.target.value==='finger'))}>{!allFinger&&!allButt&&<option value="" disabled>Mixed</option>}<option value="butt">Butt / global fasteners</option><option value="finger">Finger joints</option></select><Icon name="chevron" size={12}/></span></label>{allFinger&&<><DimensionField plain stacked label={mixedPitch?'Target finger width (mixed)':'Target finger width'} value={pitch} cancelValue={pitch} limits={{min:20,max:200}} onPreview={()=>{}} onCommit={n=>edit(()=>setInteriorFingers(p.committed,ids,true,n))} onCancel={p.onCancel}/>{mixedPitch&&<p className="field-note">Widths differ. Enter a value to set all selected parts.</p>}</>}<div className="interior-actions"><Button onClick={()=>edit(()=>ids.reduce((next,id)=>centreDivision(next,id),p.committed))}>Centre selected</Button></div></Section>;
 }
 if(division){
  const shelf=division.axis==='horizontal',kind=shelf?'shelf':'divider',half=division.size[shelf?1:0]/2;
  const node=findDivision(p.cabinet.compartments,division.id);
  return <Section title={division.label} aside={<span className="unit-badge">mm</span>}>
   {shelf&&<ShelfTypeField value="fixed" onChange={kind=>edit(()=>changeSimpleShelfKind(p.committed,division.id,kind))}/>}
   <FieldPair><DimensionField plain key={division.id} label={shelf?'Below':'Left gap'} accessibleLabel={shelf?'Clear space below':'Clear space left'} value={division.before} cancelValue={original?.before??division.before} limits={{min:division.min-half,max:division.max-half}} register={p.positionRef} onPreview={()=>{}} onCommit={v=>edit(()=>moveDivision(p.committed,division.id,Math.round((v+half)*10)/10))} onCancel={p.onCancel}/>
   <DimensionField plain label="Front inset" value={node?.frontSetback??0} cancelValue={node?.frontSetback??0} limits={{min:0,max:division.size[2]+(node?.frontSetback??0)-60}} onPreview={()=>{}} onCommit={n=>edit(()=>setInteriorInsets(p.committed,[division.id],n))} onCancel={p.onCancel}/></FieldPair>
   <div className="data-row"><span>{shelf?'Clear above':'Clear right'}</span><strong>{+division.after.toFixed(1)} mm</strong></div>
   <div className="interior-actions"><Button onClick={()=>edit(()=>centreDivision(p.committed,division.id))}>Centre {kind}</Button></div>
   <label className="construction-choice spaced-choice">End joints<span className="select select--fluid"><select aria-label={`${shelf?'Shelf':'Divider'} end joints`} value={node?.joint?'finger':'butt'} onChange={e=>edit(()=>setInteriorFinger(p.committed,division.id,e.target.value==='finger'))}><option value="butt">Butt / global fasteners</option><option value="finger">Finger joints</option></select><Icon name="chevron" size={12}/></span></label>
   {node?.joint&&<DimensionField plain stacked label="Target finger width" value={node.joint.pitch} cancelValue={node.joint.pitch} limits={{min:20,max:200}} onPreview={()=>{}} onCommit={pitch=>edit(()=>setInteriorFinger(p.committed,division.id,true,pitch))} onCancel={p.onCancel}/>}
   <p className="field-note">{shelf?'Clear gap from the opening floor to the underside of this shelf.':'Clear gap from the opening’s left side to the left face of this divider.'}</p>
  </Section>;
 }
 if(p.evaluated.panels.some(panel=>panel.id===p.selection))return null;
 if(!opening)return p.selection===p.cabinet.id?<Section title="Interior">{doorActions}</Section>:null;
 return creation();
}
