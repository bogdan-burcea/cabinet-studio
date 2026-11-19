export type IconName='add'|'remove'|'chevron-up'|'move-horizontal'|'move-vertical'|'move'|'information'|'attention'|'cabinet'|'undo'|'redo'|'save'|'open'|'cube'|'fit'|'chevron'|'panel'|'sun'|'moon'|'check'|'help'|'close'|'arrow'|'eye'|'transparent'|'wireframe'|'exploded'|'new';
// Application actions map to unmodified icons from the official eBay Evo library.
const names:Record<IconName,string>={add:'add',remove:'remove','chevron-up':'chevron-up','move-horizontal':'move','move-vertical':'move',move:'move',information:'information',attention:'attention',cabinet:'home',undo:'undo',redo:'undo',save:'download',open:'folder',cube:'medium-box',fit:'full-view',chevron:'chevron-down',panel:'split-view',sun:'brightness',moon:'moon',check:'checkmark',help:'help',close:'close',arrow:'arrow-right',eye:'eye',transparent:'eye',wireframe:'grid-view',exploded:'arrows-expand',new:'file'};
export function Icon({name,size=20}:{name:IconName;size?:number}){
 // CAD-specific extension: Evo 16/24px grid, 2px centred strokes, rounded ends.
 if(name==='move-horizontal'||name==='move-vertical'){
  const grid=size===16?16:24,path=grid===16?'M2 8h12M5 5 2 8l3 3m6-6 3 3-3 3':'M3 12h18M8 7l-5 5 5 5m8-10 5 5-5 5';
  return <svg className={`icon icon--${grid}`} width={grid} height={grid} viewBox={`0 0 ${grid} ${grid}`} fill="none" style={{fill:'none',strokeWidth:2}} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true"><path d={path} transform={name==='move-vertical'?`rotate(90 ${grid/2} ${grid/2})`:undefined}/></svg>;
 }
 const base=names[name];const iconSize=base.startsWith('chevron')?size<=14?12:16:['checkmark','split-view'].includes(base)?24:size<=18?16:24;
 return <svg className={`icon icon--${size<=14?12:size<=18?16:size<=22?20:24}`} width={size} height={size} viewBox={`0 0 ${iconSize} ${iconSize}`} focusable="false" aria-hidden="true" style={name==='redo'?{transform:'scaleX(-1)'}:undefined}><use href={`${import.meta.env.BASE_URL}assets/evo-icons.svg#icon-${base}-${iconSize}`}/></svg>;
}
