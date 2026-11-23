import {defaultShaker} from '../rules/shaker';
import {binding,stock} from '../catalogue/materials';
import {DoorHardwareInspector} from './DoorHardwareInspector';
import type {Cabinet,SlabDoor} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {addSimpleDoors,editSimpleDoors} from '../commands/simple-doors';
import {splitDoor,resizeDoor} from '../commands/fronts';
import {supportedHingeSides} from '../rules/fronts';
import {Section,Button,FieldPair} from './components';
import {DimensionField} from './DimensionField';
import {Icon} from '../design-system/Icon';
export function SimpleDoorInspector(p:{cabinet:Cabinet;evaluated:EvaluatedCabinet;ids:string[];onCommit(c:Cabinet):boolean;onCancel():void;onSelect(ids:string[]):void;onRemove(ids:string[]):void;onNotice(s:string):void}){
 const door=p.cabinet.fronts.find(d=>d.id===p.ids[0]),selected=p.ids.filter(id=>p.cabinet.fronts.some(d=>d.id===id));
 function edit(make:()=>Cabinet){try{return p.onCommit(make());}catch(e){p.onNotice((e as Error).message);return false;}}
 function add(layout:'single'|'pair'){try{const openings=p.ids.filter(id=>p.evaluated.openings.some(o=>o.id===id)),next=addSimpleDoors(p.cabinet,layout,openings);if(p.onCommit(next.cabinet))p.onSelect(next.featureIds);}catch(e){p.onNotice((e as Error).message);}}
 const choice=(label:string,value:string,options:[string,string][],onChange:(value:string)=>void)=><label className="construction-choice">{label}<span className="select select--fluid"><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{options.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select><Icon name="chevron" size={12}/></span></label>;
 if(!door){if(!p.ids.every(id=>id===p.cabinet.id||p.evaluated.openings.some(o=>o.id===id)))return null;return <Section title="Doors"><div className="interior-actions"><Button onClick={()=>add('single')}>Add door</Button><Button onClick={()=>add('pair')}>Add door pair</Button></div></Section>;}
 const style=door.style??'slab',settings=door.shaker??defaultShaker;
 const design=(change:Partial<SlabDoor>)=>edit(()=>({...p.cabinet,fronts:p.cabinet.fronts.map(d=>selected.includes(d.id)?{...d,...change,shaker:{...(d.shaker??defaultShaker),...change.shaker}}:d)}));
 const shape=p.evaluated.fronts.doors.find(d=>d.id===door.id)!,update=(patch:Parameters<typeof editSimpleDoors>[2])=>edit(()=>editSimpleDoors(p.cabinet,selected,patch));
 return <><Section title={selected.length>1?'Shared door features':'Door'}>
 {choice('Door style',style==='shaker-routed-panel'?'shaker-routed':style,[['slab','Slab'],['shaker-routed','Shaker · routed'],['shaker-frame','Shaker · frame & panel']],value=>design({style:value as SlabDoor['style'],...value==='shaker-routed'&&settings.infill==='glass'?{shaker:{...settings,infill:'wood' as const}}:{}}))}
 {style!=='slab'&&<>
 {style.startsWith('shaker-routed')&&choice('Construction',style,[['shaker-routed','Routed centre'],['shaker-routed-panel','Separate panel']],value=>design({style:value as SlabDoor['style'],...value==='shaker-routed'?{shaker:{...settings,infill:'wood' as const}}:{}}))}
 {style!=='shaker-routed'&&choice('Centre panel',settings.infill,[['wood','Wood'],['glass','Glass']],value=>design({shaker:{...settings,infill:value as 'wood'|'glass'}}))}
 <FieldPair><DimensionField plain label="Frame width" value={settings.frameWidth} cancelValue={settings.frameWidth} limits={{min:50,max:150}} step={.1} onPreview={()=>{}} onCommit={frameWidth=>design({shaker:{...settings,frameWidth}})} onCancel={p.onCancel}/>
 {style==='shaker-routed'?<DimensionField plain label="Recess depth" value={settings.recessDepth} cancelValue={settings.recessDepth} limits={{min:1,max:21}} step={.1} onPreview={()=>{}} onCommit={recessDepth=>design({shaker:{...settings,recessDepth}})} onCancel={p.onCancel}/>:<DimensionField plain label="Panel thickness" value={settings.panelThickness} cancelValue={settings.panelThickness} limits={{min:3,max:18}} step={.1} onPreview={()=>{}} onCommit={panelThickness=>design({shaker:{...settings,panelThickness}})} onCancel={p.onCancel}/>}</FieldPair>
 <p className="field-note">{style==='shaker-routed'?'One board with a routed centre. Interior corner radius follows the selected cutter.':style==='shaker-routed-panel'?'One-piece routed frame with a through opening and a rear rebate for a separate wood or glass panel. Retention hardware is not modelled.':'Five physical pieces with rounded flat-dovetail frame joints and a rear panel rebate. Glass is listed as a separate cut-size part; retention hardware is not modelled.'}</p>
 </>}
 {selected.length===1&&<FieldPair>{(['width','height'] as const).map((axis,i)=><DimensionField plain key={axis} label={axis==='width'?'Width':'Height'} accessibleLabel={`Door ${axis}`} value={+shape.size[i].toFixed(1)} cancelValue={+shape.size[i].toFixed(1)} limits={{min:axis==='width'?80:120,max:axis==='width'?1200:3000}} onPreview={()=>{}} onCommit={n=>edit(()=>resizeDoor(p.cabinet,door.id,axis,n))} onCancel={p.onCancel}/>)}</FieldPair>}
 <FieldPair>{choice('Placement',door.placement,[['overlay','Overlay'],['inset','Inset']],value=>update({placement:value as SlabDoor['placement']}))}{selected.length===1&&choice('Hinge side',door.handing,supportedHingeSides(p.cabinet,door).map(side=>[side,side==='left'?'Left':'Right']),value=>update({handing:value as SlabDoor['handing']}))}</FieldPair>
 <FieldPair><DimensionField plain step={.1} label="Edge clearance" accessibleLabel="Door reveal" value={door.reveal} cancelValue={door.reveal} limits={{min:1,max:10}} onPreview={()=>{}} onCommit={reveal=>update({reveal})} onCancel={p.onCancel}/><DimensionField plain step={.1} label="Front stand-off" accessibleLabel="Door front clearance" value={door.clearance} cancelValue={door.clearance} limits={{min:1,max:10}} onPreview={()=>{}} onCommit={clearance=>update({clearance})} onCancel={p.onCancel}/></FieldPair>
 <FieldPair><DimensionField plain label="Thickness" accessibleLabel="Door thickness" value={stock(p.cabinet,'front',door.id).thickness} cancelValue={stock(p.cabinet,'front',door.id).thickness} limits={{min:3,max:24}} step={.1} onPreview={()=>{}} onCommit={thickness=>p.onCommit({...p.cabinet,fronts:p.cabinet.fronts.map(d=>selected.includes(d.id)?{...d,material:{...binding(p.cabinet,'front',d.id),stock:{id:`generic-panel-${thickness}`,revision:'1'}}}:d)})} onCancel={p.onCancel}/><DimensionField plain label="Corner radius" value={door.cornerRadius??0} cancelValue={door.cornerRadius??0} limits={{min:0,max:Math.min(shape.size[0],shape.size[1])/2}} step={.1} onPreview={()=>{}} onCommit={n=>p.onCommit({...p.cabinet,fronts:p.cabinet.fronts.map(d=>selected.includes(d.id)?{...d,cornerRadius:n}:d)})} onCancel={p.onCancel}/></FieldPair>
 {selected.length===1&&<div className="interior-actions"><Button onClick={()=>edit(()=>splitDoor(p.cabinet,door.id,'vertical').cabinet)}>Split left/right</Button><Button onClick={()=>edit(()=>splitDoor(p.cabinet,door.id,'horizontal').cabinet)}>Split top/bottom</Button></div>}
 <p className="field-note">Opening is a clearance study; Exact hinge kinematics are not yet verified.</p>
 </Section><DoorHardwareInspector cabinet={p.cabinet} evaluated={p.evaluated} ids={selected} onCommit={p.onCommit} onCancel={p.onCancel}/></>;
}
