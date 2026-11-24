import {actionSymbols} from './action-icons';
type ElementIcon='element-drawer'|'element-foot'|'element-left'|'element-right'|'element-door'|'element-side'|'element-shelf'|'element-adjustable'|'element-divider'|'element-back'|'element-top'|'element-bottom'|'element-opening';
export type IconName=ElementIcon|'assembly'|'library-add'|'library'|'utilities'|'costs'|'door-open'|'door-close'|'rotate'|'delete'|'add'|'remove'|'chevron-up'|'move-horizontal'|'move-vertical'|'move'|'information'|'attention'|'attention-filled'|'cabinet'|'undo'|'redo'|'save'|'open'|'cube'|'fit'|'chevron'|'panel'|'sun'|'moon'|'check'|'help'|'close'|'arrow'|'eye'|'transparent'|'wireframe'|'exploded'|'new'|'zoom-in'|'cut';
// Application actions map to unmodified icons from the official eBay Evo library.
const names:Record<Exclude<IconName,ElementIcon|'door-open'|'door-close'|'rotate'>,string>={assembly:'grid-view','library-add':'add',library:'education',utilities:'settings',costs:'file',delete:'delete',add:'add',remove:'remove','chevron-up':'chevron-up','move-horizontal':'move','move-vertical':'move',move:'move',information:'information',attention:'attention','attention-filled':'attention-filled',cabinet:'home',cut:'split-view',undo:'undo',redo:'undo',save:'download',open:'folder',cube:'medium-box',fit:'full-view',chevron:'chevron-down',panel:'split-view',sun:'brightness',moon:'moon',check:'checkmark',help:'help',close:'close',arrow:'arrow-right',eye:'eye',transparent:'eye',wireframe:'grid-view',exploded:'arrows-expand',new:'file','zoom-in':'zoom-in'};
export function Icon({name,size=20}:{name:IconName;size?:number}){
 if(name==='assembly')return <svg className="icon icon--24" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" style={{fill:'none',strokeWidth:2}} aria-hidden="true" focusable="false"><path d="M3 3h18M3 21h18M8 8h8v8H8zM3 7v2m0 2v2m0 2v2M21 7v2m0 2v2m0 2v2"/></svg>;
 if(name==='library-add')return <svg className="icon icon--24" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{fill:'none',strokeWidth:2}} aria-hidden="true" focusable="false"><rect x="8" y="3" width="13" height="13" rx="1.5"/><path d="M4 7v13h13m-2.5-14v7m-3.5-3.5h7"/></svg>;
 if(name==='library')return <svg className="icon icon--24" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{fill:'none',strokeWidth:2}} aria-hidden="true" focusable="false"><circle cx="12" cy="5" r="3"/><path d="M3 10c3.5.2 6.5 1.5 9 4 2.5-2.5 5.5-3.8 9-4v10c-3.5.2-6.5 1.5-9 3-2.5-1.5-5.5-2.8-9-3V10Zm9 4v9"/></svg>;
 // Formula utility glyph, drawn as vectors to avoid font-dependent rendering.
 if(name==='utilities')return <svg className="icon icon--24" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M13 3.1c-3-1.2-5 .5-5.6 3.7L7 9H4.5v2H6.6l-1.4 7.5c-.2 1-.5 1.4-1 1.4-.1 0-.2 0-.3-.1a1.4 1.4 0 1 0-2.2-.8c.2 2 3.8 2.9 5.2.8.4-.6.7-1.4.9-2.4L9 11h3V9H9.4l.4-2c.3-1.6.7-2.4 1.5-2.4a1.5 1.5 0 1 0 1.7-1.5Z"/><path d="M12 9h4v1.8h-.8l2 2.5 2-2.5h-.8V9h4v1.8h-.8l-3.1 3.7 3.2 3.7h.7V20h-4v-1.8h.8l-2-2.4-2 2.4h.8V20h-4v-1.8h.8l3.2-3.7-3.1-3.7H12Z"/></svg>;
 // Halftone transparency glyph: dense centre fading to smaller edge dots.
 if(name==='transparent'){
  const dots=[];
  for(let row=0;row<6;row++)for(let col=0;col<6;col++){
   const x=Math.abs(col-2.5),y=Math.abs(row-2.5);
   if(x===2.5&&y>.5||y===2.5&&x>.5)continue;
   dots.push(<circle key={`${row}-${col}`} cx={2+col*4} cy={2+row*4} r={Math.max(x,y)===2.5?.5:Math.max(x,y)===1.5?1.05:1.65}/>);
  }
  return <svg className="icon icon--24" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">{dots}</svg>;
 }
 if(['costs','cabinet','cut','cube','fit','wireframe','exploded'].includes(name)){
  const paths:Record<string,string>={costs:'M4 4h8l9 9-8 8-9-9V4Z M8 8h.01',cabinet:'M5 21V5h14v16M5 14h14M12 5v9M12 9h7M9 18h6',cut:'M5 9V4h14v5M5 15v5h14v-5M3 12h18',cube:'M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Zm-8 4.5 8 5 8-5M12 12.5V21',fit:'M3 8V4h4M17 4h4v4M3 16v4h4M17 20h4v-4M12 7 7 10v5l5 3 5-3v-5zM7 10l5 3 5-3M12 13v5',wireframe:'M5 3v18M12 3v18M19 3v18M3 5h18M3 12h18M3 19h18',exploded:'M4 9V4h5M4 4l5 5m6 0 5-5m-5 0h5v5M4 15v5h5m-5 0 5-5m6 0 5 5m-5 0h5v-5'};
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{fill:'none',strokeWidth:2}}><path d={paths[name]}/></svg>;
 }
 if(name==='rotate')return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{fill:'none',strokeWidth:2}}><path d="M19 10a7 7 0 1 0 0 6M19 4v6h-6"/></svg>;
 if(name==='door-open'||name==='door-close')return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{fill:'none',strokeWidth:2}}><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 16h16"/><path d={name==='door-open'?'m8 12 4-4 4 4Z':'m8 8 4 4 4-4Z'} fill="currentColor" stroke="none"/></svg>;
 // Cabinet-specific Evo extensions: paired leaves, stacked fronts and four feet.
 if(name==='element-door'||name==='element-drawer'||name==='element-foot'){
  const grid=size<=16?16:24,lo=grid===16?2:4,hi=grid===16?14:20,mid=grid/2;
  const a=grid===16?5:8,b=grid===16?11:16,dots=name==='element-door'?[a,b].flatMap(x=>[a,mid,b].map(y=>[x,y])):[a,mid,b].flatMap(x=>[a,b].map(y=>[x,y]));
  const footSize=grid===16?4:5;
  return <svg className={`icon icon--${grid}`} width={size} height={size} viewBox={`0 0 ${grid} ${grid}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{fill:'none',strokeWidth:2}} aria-hidden="true" focusable="false">{name==='element-foot'?[lo,hi-footSize].flatMap(x=>[lo,hi-footSize].map(y=><rect key={`${x}-${y}`} x={x} y={y} width={footSize} height={footSize} rx={.25}/>)):<><rect x={lo} y={lo} width={hi-lo} height={hi-lo} rx={.5}/><path d={name==='element-door'?`M${mid} ${lo}V${hi}`:`M${lo} ${mid}H${hi}`}/><g fill="currentColor" stroke="none">{dots.map(([x,y])=><circle key={`${x}-${y}`} cx={x} cy={y} r={grid===16?.65:.85}/>)}</g></>}</svg>;
 }
 // Element glyphs are a CAD extension on Evo's 24 px construction grid.
 if(name.startsWith('element-')){
  const grid=size<=16?16:24,lo=grid===16?2:4,hi=grid===16?14:20,mid=grid/2,step=4;
  const dotted=[];for(let x=lo;x<=hi;x+=step)for(let y=lo;y<=hi;y+=step)dotted.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={grid===16?.65:.85}/>);
  const member=name==='element-left'||name==='element-side'?`M${lo} ${lo}V${hi}`:name==='element-right'?`M${hi} ${lo}V${hi}`:name==='element-divider'?`M${mid} ${lo}V${hi}`:name==='element-shelf'||name==='element-adjustable'?`M${lo} ${mid}H${hi}`:name==='element-top'?`M${lo} ${lo}H${hi}`:name==='element-bottom'?`M${lo} ${hi}H${hi}`:name==='element-back'?`M${lo} ${lo}H${hi}V${hi}H${lo}Z`:'';
  return <svg className={`icon icon--${grid}`} width={size} height={size} viewBox={`0 0 ${grid} ${grid}`} aria-hidden="true" focusable="false"><g fill="currentColor" opacity={.55}>{dotted}</g>{member&&<path d={member} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{fill:'none',strokeWidth:2}}/>}{name==='element-adjustable'&&<path d={`M${lo} ${mid-3}H${hi}M${lo} ${mid+3}H${hi}`} stroke="currentColor" strokeWidth={1} strokeDasharray="1 3"/>}</svg>;
 }
 // CAD-specific extension: Evo 16/24px grid, 2px centred strokes, rounded ends.
 if(name==='move-horizontal'||name==='move-vertical'){
  const grid=size===16?16:24,path=grid===16?'M2 8h12M5 5 2 8l3 3m6-6 3 3-3 3':'M3 12h18M8 7l-5 5 5 5m8-10 5 5-5 5';
  return <svg className={`icon icon--${grid}`} width={grid} height={grid} viewBox={`0 0 ${grid} ${grid}`} fill="none" style={{fill:'none',strokeWidth:2}} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true"><path d={path} transform={name==='move-vertical'?`rotate(90 ${grid/2} ${grid/2})`:undefined}/></svg>;
 }
 const base=names[name as Exclude<IconName,ElementIcon|'door-open'|'door-close'|'rotate'>];const iconSize=base.startsWith('chevron')?size<=14?12:16:['checkmark','split-view'].includes(base)?24:size<=18?16:24;
 if(name==='close'||name==='delete')return <svg className={`icon icon--${size<=14?12:size<=18?16:size<=22?20:24}`} width={size} height={size} viewBox={`0 0 ${iconSize} ${iconSize}`} focusable="false" aria-hidden="true" dangerouslySetInnerHTML={{__html:actionSymbols[`icon-${base}-${iconSize}`]}}/>;
 return <svg className={`icon icon--${size<=14?12:size<=18?16:size<=22?20:24}`} width={size} height={size} viewBox={`0 0 ${iconSize} ${iconSize}`} focusable="false" aria-hidden="true" style={name==='redo'?{transform:'scaleX(-1)'}:undefined}><use href={`${import.meta.env.BASE_URL}assets/evo-icons.svg#icon-${base}-${iconSize}`}/></svg>;
}
