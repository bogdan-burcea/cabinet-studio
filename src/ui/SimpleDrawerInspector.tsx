import {recommendedDrawerFront} from '../rules/drawer-layout';
import {HandleFields} from './HandleFields';
import {defaultDrawerHandle} from '../rules/handles';
import {useMemo,useState} from 'react';
import {flattenParts} from '../cnc/parts';
import {partPreview} from '../geometry/part-preview';
import {PartDrawing} from './PartDrawing';
import {setDrawerFrontHeight,setDrawerPlacement} from '../commands/drawers';
import {DrawerPackFields} from './DrawerPackFields';
import type {Cabinet,MetalDrawer} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {stock} from '../catalogue/materials';
import {editDrawerGroup,duplicateDrawers} from '../commands/drawers';
import {drawerPack} from '../catalogue/drawers';
import {Button,Section,FieldPair} from './components';
import {Icon} from '../design-system/Icon';
import {DimensionField} from './DimensionField';

export function SimpleDrawerInspector({cabinet,model,id,ids,partId,onSelectMany,commit,notice}:{
 cabinet:Cabinet;model:EvaluatedCabinet;id:string;ids:string[];partId?:string;onSelectMany(ids:string[]):void;commit(c:Cabinet):boolean;select(id:string):void;notice(s:string):void;
}){
 const [customOverlap,setCustomOverlap]=useState(false);
 const flatParts=useMemo(()=>flattenParts(model),[model]);
 const anchor=ids[0]??id;
 const drawer=model.drawers.drawers.find(d=>d.id===anchor),intent=cabinet.drawers?.find(d=>d.id===anchor);
 if(!drawer||!intent)return null;
 const pack=drawerPack(intent.pack);
 const bottom=!!intent.stack&&intent.stack.order===Math.max(...cabinet.drawers!.filter(d=>d.stack?.groupId===intent.stack!.groupId).map(d=>d.stack!.order));
 const board=flatParts.find(p=>p.id===partId)??flatParts.find(p=>p.id===`${anchor}/front`);
 const opening=model.openings.find(o=>o.id===intent.openingId)!;
 const front=intent.front??{placement:'overlay',gap:2,clearance:2,left:0,right:0,top:0,bottom:0};
 function edit(patch:Partial<Pick<MetalDrawer,'offset'|'frontHeight'|'front'|'pack'|'manualRail'>>){
  try{return commit(editDrawerGroup(cabinet,ids,patch));}catch(e){notice((e as Error).message);return false;}
 }
 const editableHeights=ids.some(id=>{const d=cabinet.drawers?.find(d=>d.id===id);return d?.stack&&d.stack.order<Math.max(...cabinet.drawers!.filter(v=>v.stack?.groupId===d.stack!.groupId).map(v=>v.stack!.order));});
 const optimal=recommendedDrawerFront(cabinet,intent,'overlay'),showOverlap=customOverlap||(['left','right','top','bottom'] as const).some(k=>front[k]!==optimal[k]);
 const frontField=(key:'gap'|'clearance'|'left'|'right'|'top'|'bottom',label:string)=><DimensionField plain step={.1} key={key} label={label}
  value={front[key]} cancelValue={front[key]} limits={{min:0,max:key==='gap'||key==='clearance'?10:50}}
  onPreview={()=>{}} onCommit={n=>(()=>{try{let next=cabinet;const drawers=next.drawers!.map(d=>{
   if(!ids.includes(d.id))return d;
   if(ids.length>1&&d.stack&&(key==='top'||key==='bottom')){
    const group=next.drawers!.filter(v=>v.stack?.groupId===d.stack!.groupId),order=key==='top'?0:Math.max(...group.map(v=>v.stack!.order));
    if(d.stack.order!==order)return d;
   }
   return {...d,front:{...(d.front??front),[key]:n}};
  });return commit({...next,drawers});}catch(error){notice((error as Error).message);return false;}})()} onCancel={()=>{}}/>;
 const signature=(d:MetalDrawer)=>{
  const f=d.front??front;
  return JSON.stringify([f.placement,f.gap,f.clearance,f.left,f.right,d.pack.id,d.stack?.height??d.frontHeight,...!d.stack?[f.top,f.bottom]:[]]);
 };
 const mixed=ids.length>1&&cabinet.drawers!.filter(d=>ids.includes(d.id)).some(d=>signature(d)!==signature(intent));
 function heightEdit(height:number){try{return intent!.stack?commit(setDrawerFrontHeight(cabinet,ids,height)):edit({frontHeight:intent!.frontHeight+height-drawer!.front[1]});}catch(e){notice((e as Error).message);return false;}}

 return <>
  <Section title={ids.length>1?'Shared drawer settings':'Drawer'}>
  {mixed&&<p className="field-note">Selected drawers have different settings. Changing a field sets that value for the selection.</p>}
   <DrawerPackFields automatic={!intent.manualRail} value={intent.pack} onChange={(pin,manual)=>{
    const selected=drawerPack(pin);
    edit({pack:pin,...manual!==undefined?{manualRail:manual}:{},...!intent.stack?{frontHeight:Math.max(intent.frontHeight,selected.minimumHeight)}:{}});
   }}/>

   {!intent.stack&&<>   <FieldPair>{(['offset','frontHeight'] as const).map(key=><DimensionField plain key={key} label={key==='offset'?'Bottom offset':'Allocation height'}
    value={intent[key]} cancelValue={intent[key]} limits={{min:key==='offset'?0:pack.minimumHeight,max:key==='offset'?opening.size[1]-intent.frontHeight:opening.size[1]-intent.offset}}
    onPreview={()=>{}} onCommit={n=>edit({[key]:n})} onCancel={()=>{}}/>)}</FieldPair>
</>}
  </Section>
  <Section title={ids.length>1?'Shared front features':'Drawer front'}>
   {ids.length===1&&<FieldPair>
    <DimensionField plain hideControls label={bottom?'Height · auto':'Height'} accessibleLabel="Drawer front height" disabled={bottom} value={bottom?drawer.front[1]:intent.stack?.height??drawer.front[1]} cancelValue={bottom?drawer.front[1]:intent.stack?.height??drawer.front[1]} limits={{min:intent.stack?0:98.5,max:opening.size[1]+50}} onPreview={()=>{}} onCommit={heightEdit} onCancel={()=>{}}/>
    <DimensionField plain label="Width" accessibleLabel="Drawer front width" disabled hideControls value={drawer.front[0]} cancelValue={drawer.front[0]} limits={{min:drawer.front[0],max:drawer.front[0]}} onPreview={()=>{}} onCommit={()=>false} onCancel={()=>{}}/>
   </FieldPair>}
   {ids.length>1&&intent.stack&&<FieldPair><DimensionField plain hideControls label={editableHeights?'Front height':'Front height · auto'} disabled={!editableHeights} value={editableHeights?intent.stack.height:drawer.front[1]} cancelValue={editableHeights?intent.stack.height:drawer.front[1]} limits={{min:0,max:opening.size[1]+50}} onPreview={()=>{}} onCommit={heightEdit} onCancel={()=>{}}/></FieldPair>}
   <p className="field-note">Width follows the opening, edge clearance and frame coverage.</p>
   {intent.stack&&<p className="field-note">{bottom?`${cabinet.drawers!.filter(d=>d.stack?.groupId===intent.stack!.groupId).length===1?'The only front fills the opening':'Bottom front fills the remaining space'}: ${+drawer.front[1].toFixed(1)} mm.`:`Enter 0 for automatic sizing · current front ${+drawer.front[1].toFixed(1)} mm.`}</p>}
   {/* Height allocation remains automatic for the bottom front. */}

   <label className="construction-choice">Placement<span className="select select--fluid"><select aria-label="Drawer front placement" value={front.placement} onChange={e=>{
    const placement=e.target.value as 'overlay'|'inset';
    try{
     commit(setDrawerPlacement(cabinet,ids,placement));
    }catch(error){notice((error as Error).message);}
   }}><option value="overlay">Overlay</option><option value="inset">Inset</option></select><Icon name="chevron" size={12}/></span></label>
   <FieldPair>{frontField('gap','Edge clearance')}{frontField('clearance','Front stand-off')}</FieldPair>
   {front.placement==='overlay'&&<><label className="construction-choice">Frame coverage<span className="select select--fluid"><select aria-label="Frame coverage" value={showOverlap?'custom':'frame'} onChange={e=>{if(e.target.value==='custom')setCustomOverlap(true);else {setCustomOverlap(false);commit(setDrawerPlacement(cabinet,ids,'overlay'));}}}><option value="frame">Cover cabinet frame</option><option value="custom">Custom edge overlaps</option></select><Icon name="chevron" size={12}/></span></label>{showOverlap&&<><FieldPair>{frontField('left','Left overlap')}{frontField('right','Right overlap')}</FieldPair>
    <FieldPair>{frontField('top','Top overlap')}{frontField('bottom','Bottom overlap')}</FieldPair></>}</>}
   <FieldPair><DimensionField plain hideControls label="Corner radius" value={intent.cornerRadius??0} cancelValue={intent.cornerRadius??0} limits={{min:0,max:Math.min(...drawer.front.slice(0,2))/2}} step={.1} onPreview={()=>{}} onCommit={n=>commit({...cabinet,drawers:cabinet.drawers!.map(d=>ids.includes(d.id)?{...d,cornerRadius:n}:d)})} onCancel={()=>{}}/></FieldPair>
   {ids.length===1&&<div className="data-row"><span>Front size</span><strong>{drawer.front.map(n=>+n.toFixed(1)).join(' × ')} mm</strong></div>}
  </Section>

  <HandleFields drawer handle={intent.handle??defaultDrawerHandle()} onCancel={()=>{}} onChange={patch=>{try{return commit({...cabinet,drawers:cabinet.drawers!.map(d=>ids.includes(d.id)?{...d,handle:{...(d.handle??defaultDrawerHandle()),...patch}}:d)});}catch(error){notice((error as Error).message);return false;}}}/>
  <Section title="Duplicate">   <div className="interior-actions"><Button onClick={()=>{try{const next=duplicateDrawers(cabinet,ids);if(commit(next.cabinet))onSelectMany(next.featureIds);}catch(error){notice((error as Error).message);}}}>Duplicate {ids.length>1?'group':'drawer'}</Button>
</div></Section>

  <Section title="Drawer fittings">
   <div className="table table--density-compact machining-table"><table aria-label="Drawer fittings"><thead><tr><th>Article</th><th>Quantity</th></tr></thead><tbody>
    {pack.components.map(item=><tr key={item.article}><th scope="row">{item.article}</th><td>{item.quantity} {item.unit}</td></tr>)}
   </tbody></table></div>
   <p className="field-note">K · 550 mm uses supplied CAD. Other sizes adapt the profiles; 650 mm uses the 65 kg runner family. Front/back pilots follow Blum’s drawing. Bottom pilots use the reference side slots; verify these against the bought side profile before manufacture.</p>
  </Section>
  <Section title="Cut parts">
   {board&&<PartDrawing label={board.label} preview={partPreview(board.panel,board.holes,board.cuts,board.face)}/>}
   <p className="field-note">Blum specifies 16 mm bottom and back stock for this configuration.</p>
   <div className="data-row"><span>Bottom · 16 mm</span><strong>{drawer.bottom[0]} × {drawer.bottom[2]} mm</strong></div>
   <div className="data-row"><span>Back · 16 mm</span><strong>{drawer.back[0]} × {drawer.back[1]} mm</strong></div>
  </Section>
 </>;
}
