import {setInteriorInsets} from '../commands/simple-interiors';
import type {Cabinet} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {moveAdjustable,setShelfHoles,positionShelfHoles,linkedShelfIds,changeSimpleShelfKind} from '../commands/adjustable';
import {shelfHoleMaximum,shelfPattern} from '../rules/shelf-pattern';
import {Button,Section,FieldPair} from './components';
import {Icon} from '../design-system/Icon';
import {DimensionField} from './DimensionField';
export function ShelfTypeField({value,onChange}:{value:'fixed'|'adjustable';onChange(kind:'fixed'|'adjustable'):void}){
 return <label className="construction-choice">Shelf type<span className="select select--fluid"><select aria-label="Shelf type" value={value} onChange={e=>onChange(e.target.value as 'fixed'|'adjustable')}><option value="fixed">Fixed</option><option value="adjustable">Adjustable</option></select><Icon name="chevron" size={12}/></span></label>;
}
export function SimpleAdjustableInspector(p:{committed:Cabinet;evaluated:EvaluatedCabinet;ids:string[];onCommit(c:Cabinet):boolean;onCancel():void;onRemove(ids:string[]):void;onNotice(s:string):void;positionRef(el:HTMLInputElement|null):void}){
 const shelves=p.ids.map(id=>p.evaluated.adjustable.shelves.find(s=>s.id===id));if(shelves.some(s=>!s))return null;
 const shelf=shelves[0]!,intent=p.committed.contents.find(s=>s.id===shelf.id)!,d=intent.drilling!,count=d.count,mixed=p.ids.some(id=>p.committed.contents.find(s=>s.id===id)?.drilling?.count!==count),opening=p.evaluated.openings.find(o=>o.id===shelf.nodeId)!,pattern=shelfPattern(p.committed,intent,opening),floor=opening.origin[1]-p.evaluated.opening.origin[1];
 const linked=linkedShelfIds(p.committed,p.ids),max=Math.min(...linked.map(id=>{const s=p.committed.contents.find(s=>s.id===id)!;return shelfHoleMaximum(p.committed,p.evaluated.openings.find(o=>o.id===s.openingId)!,s);}));
 const thin=p.evaluated.drilling.some(b=>b.kind==='shelf-support'&&p.ids.includes(b.group)&&p.evaluated.panels.some(panel=>panel.id===b.panelId&&panel.size[0]<5));
 function edit(make:()=>Cabinet){try{return p.onCommit(make());}catch(e){p.onNotice((e as Error).message);return false;}}
 return <Section title={p.ids.length>1?'Shared shelf features':'Shelf'}>
 {p.ids.length===1&&<ShelfTypeField value="adjustable" onChange={kind=>edit(()=>changeSimpleShelfKind(p.committed,shelf.id,kind))}/>}
 <div className={p.ids.length===1?'field-pair':undefined}>{p.ids.length===1&&<DimensionField plain step={32} label="Shelf height" accessibleLabel="Shelf height in opening" value={shelf.underside} cancelValue={shelf.underside} limits={{min:shelf.min-shelf.size[1]/2,max:shelf.max-shelf.size[1]/2}} register={p.positionRef} normalize={n=>{if(!Number.isFinite(n))return n;const nearest=shelf.legalPositions.reduce((a,b)=>Math.abs(b-shelf.size[1]/2-n)<Math.abs(a-shelf.size[1]/2-n)?b:a);return nearest-shelf.size[1]/2;}} onPreview={()=>{}} onCommit={n=>edit(()=>moveAdjustable(p.committed,shelf.id,n+shelf.size[1]/2))} onCancel={p.onCancel}/>}
 <DimensionField plain label="Front inset" value={intent.frontSetback} cancelValue={intent.frontSetback} limits={{min:0,max:Math.min(...shelves.map(s=>p.evaluated.openings.find(o=>o.id===s!.nodeId)!.size[2]-60))}} onPreview={()=>{}} onCommit={n=>edit(()=>setInteriorInsets(p.committed,p.ids,n))} onCancel={p.onCancel}/></div>
 <FieldPair>
 <DimensionField plain label={mixed?'Row holes (mixed)':'Row holes'} accessibleLabel={mixed?'Adjustment holes per row (mixed)':'Adjustment holes per row'} value={count} cancelValue={count} limits={{min:1,max}} onPreview={()=>{}} onCommit={n=>edit(()=>setShelfHoles(p.committed,p.ids,n))} onCancel={p.onCancel}/>
 <DimensionField plain step={1} label="Hole centre" accessibleLabel="Hole set centre from floor" value={+(floor+pattern.center).toFixed(1)} cancelValue={+(floor+pattern.center).toFixed(1)} limits={{min:Math.ceil((floor+pattern.minCenter)*10)/10,max:Math.floor((floor+pattern.maxCenter)*10)/10}} onPreview={()=>{}} onCommit={n=>d.anchor==='centre'&&Math.abs(n-+(floor+pattern.center).toFixed(1))<1e-6?true:edit(()=>positionShelfHoles(p.committed,p.ids,'height',Math.round((n-floor)*10)/10))} onCancel={p.onCancel}/></FieldPair>
 <Button className="full-width-button" onClick={()=>edit(()=>positionShelfHoles(p.committed,p.ids,'centre'))}>Centre hole set in opening</Button>
 <p className="field-note">Ø5 mm · 32 mm pitch. {thin?'Through holes; opposing shelves share rows.':'Blind depth 4–8 mm.'} Height starts at the cabinet’s inside floor.{linked.length>p.ids.length?' Opposing sets are linked.':''}{d.anchor==='centre'?' Centred on resize.':''}</p>

 </Section>;
}
