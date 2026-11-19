import {useEffect,useState} from 'react';
import type {Cabinet} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {antaroM500} from '../catalogue/drawers';
import {addMetalDrawer,removeMetalDrawer,updateMetalDrawer} from '../commands/drawers';
import {Button,Section} from './components';
import {DimensionField} from './DimensionField';
export function DrawerInspector(p:{committed:Cabinet;preview:Cabinet|null;evaluated:EvaluatedCabinet;selection:string;onPreview(c:Cabinet):boolean;onCommit(c?:Cabinet):boolean;onCancel():void;onSelect(id:string):void;onNotice(s:string):void;angles:Record<string,number>;onAngle(id:string,v:number):void}){
 const [opening,setOpening]=useState('');
 useEffect(()=>{if(p.evaluated.openings.some(o=>o.id===p.selection))setOpening(p.selection);},[p.selection]);
 const c=p.preview??p.committed,drawer=p.evaluated.drawers.drawers.find(d=>d.id===p.selection),selected=c.drawers?.find(d=>d.id===p.selection);
 function action(make:()=>Cabinet,id?:string){try{const next=make();const ok=p.onPreview(next);if(ok&&id)p.onSelect(id);return ok;}catch(e){p.onNotice((e as Error).message);return false;}}
 return <Section title="TANDEMBOX antaro M" aside={<span className="unit-badge">BLUM · 500</span>}>
 <p className="field-note">500 mm BLUMOTION · M sides · silk white. Manufacturer-rated runner pair: 30 kg; this is not a cabinet load rating.</p>
 {!selected&&<><label className="construction-choice">Opening<select aria-label="Drawer opening" value={opening} onChange={e=>setOpening(e.target.value)}><option value="">Choose an opening…</option>{p.evaluated.openings.map(o=><option key={o.id} value={o.id}>{o.label} · {o.size.map(n=>+n.toFixed(1)).join(' × ')} mm</option>)}</select></label><Button disabled={!opening} onClick={()=>{try{const result=addMetalDrawer(c,opening);action(()=>result.cabinet,result.featureId);}catch(e){p.onNotice((e as Error).message);}}}>Preview metal drawer</Button></>}
 {selected&&drawer&&<>
 <DimensionField label="Allocation from opening bottom" value={selected.offset} cancelValue={p.committed.drawers?.find(d=>d.id===selected.id)?.offset??0} limits={{min:0,max:3000}} onPreview={v=>action(()=>updateMetalDrawer(c,selected.id,{offset:v}))} onCommit={v=>action(()=>updateMetalDrawer(c,selected.id,{offset:v}))} onCancel={p.onCancel}/>
 <DimensionField label="Front allocation height" value={selected.frontHeight} cancelValue={p.committed.drawers?.find(d=>d.id===selected.id)?.frontHeight??160} limits={{min:98.5,max:3000}} onPreview={v=>action(()=>updateMetalDrawer(c,selected.id,{frontHeight:v}))} onCommit={v=>action(()=>updateMetalDrawer(c,selected.id,{frontHeight:v}))} onCancel={p.onCancel}/>
 <div className="data-row"><span>Bottom · 16 mm</span><strong>{drawer.bottom[0]} × {drawer.bottom[2]} mm</strong></div><div className="data-row"><span>Back · 16 mm</span><strong>{drawer.back[0]} × {drawer.back[1]} mm</strong></div><div className="data-row"><span>Front</span><strong>{drawer.front[0]} × {drawer.front[1]} mm</strong></div>
 <label className="front-angle">Inspection extension · {p.angles[selected.id]??0}%<input aria-label="Drawer inspection extension" type="range" min="0" max="100" step="5" value={p.angles[selected.id]??0} onChange={e=>p.onAngle(selected.id,Number(e.target.value))}/></label>
 <Button onClick={()=>action(()=>removeMetalDrawer(c,selected.id),c.id)}>Preview remove drawer</Button>
 </>}
 {p.preview&&<div className="construction-review"><p>Review the complete cabinet before applying.</p><div className="interior-actions"><Button className="primary-button" onClick={()=>p.onCommit(c)}>Apply drawer changes</Button><Button onClick={p.onCancel}>Cancel preview</Button></div></div>}
 <p className="field-note">Requires 503 mm clear depth, 98.5 mm minimum allocation and continuous mounting sides. Bottom/back are 16 mm chipboard. Front reveals are 2 mm application policy. Geometry and opening motion are simplified inspection envelopes.</p>
 <details className="advanced-material"><summary>Exact fittings & evidence</summary>{antaroM500.components.map(part=><div className="data-row" key={part.article}><span>{part.quantity} × {part.article}</span><strong>{part.unit}<br/>{part.description}</strong></div>)}<p className="field-note">{antaroM500.fastening}</p><p className="field-note">Drawing-checked dimensions; regional screw completion and physical trial fitting remain pending. No drilling or manufacturing output.</p>{antaroM500.sources.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">Blum · {source.edition} · p. {source.page}</a></p>)}</details>
 </Section>;
}
