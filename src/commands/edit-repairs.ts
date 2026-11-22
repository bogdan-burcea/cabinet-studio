import {railFastenerFitRepairs} from './rail-fastener-fit';
import {railCollisionRepairs} from './rail-collision-repairs';
import {resolveConstruction} from '../rules/construction';
import {drawerRepairs} from './drawer-repairs';
import {cupSetbackMax} from '../catalogue/hinges';
import {resizeCabinet} from './dimensions';
import {resolveFronts} from '../rules/fronts';
import {corrections} from './corrections';
import {removeDoor} from './fronts';
import {shelfHoleBounds} from '../rules/shelf-pattern';
import {backPilotLimits} from '../rules/applied-back';
import {shelfHoleMaximum} from '../rules/shelf-drilling';
import type {Cabinet} from '../domain/cabinet';
import {evaluate} from '../geometry/evaluate';
import {stock} from '../catalogue/materials';
import {cnc} from '../rules/cnc';
import {setCnc} from './cnc';
import {setBackPanel,setBackFastener} from './back-panel';
import {setStockThickness} from './stock';
import {setCabineo} from './cabineo';
import {resolveInteriors} from '../rules/interiors';
import {moveDivision,removeDivisionTree} from './interiors';
export interface EditRepair {label:string;cabinet:Cabinet}
export function editError(c:Cabinet):string|null {try{evaluate(c);return null;}catch(e){return (e as Error).message;}}
/** Repairs are whole-candidate evaluations, never exceptions to geometry/fitting rules.
 * Search from the requested value in whole mm: the first valid result is the
 * smallest readable adjustment in that direction. Keep the user's edited field. */
export function editRepairs(candidate:Cabinet,previous:Cabinet):EditRepair[]{
 const message=editError(candidate);if(!message)return [];
 if(message.startsWith('Divider-to-rail Cabineos')){const fitted=railFastenerFitRepairs(candidate);if(fitted.length)return fitted;}
 const options:EditRepair[]=/Drawer|drawer/.test(message)?drawerRepairs(candidate,previous):[],settings=cnc(candidate),old=cnc(previous);
 if(/Notch interior corner/.test(message)){
  const bit=cnc(candidate).bitDiameter;
  const patch=(h:import('../domain/cabinet').SlabDoor['handle']|undefined)=>h?.kind==='notch'?{...h,cornerDiameter:Math.max(h.cornerDiameter??8,bit)}:h;
  const wider={...candidate,fronts:candidate.fronts.map(d=>({...d,handle:patch(d.handle)!})),drawers:candidate.drawers?.map(d=>({...d,...d.handle?{handle:patch(d.handle)}:{}}))};
  if(!editError(wider))options.push({label:`Use Ø${bit} mm interior corners`,cabinet:wider});
  const diameters=[...candidate.fronts.map(d=>d.handle),...(candidate.drawers??[]).map(d=>d.handle)].filter(h=>h?.kind==='notch').map(h=>h!.cornerDiameter??8);
  const smaller=Math.floor(Math.min(...diameters));if(smaller>=1&&smaller<bit){const fitted=setCnc(candidate,{bitDiameter:smaller});if(!editError(fitted))options.push({label:`Use a Ø${smaller} mm cutter`,cabinet:fitted});}
 }
 function add(label:string,c:Cabinet){if(!editError(c)&&!options.some(o=>JSON.stringify(o.cabinet)===JSON.stringify(c)))options.push({label,cabinet:c});}
 function search(from:number,to:number,step:number,make:(n:number)=>Cabinet,label:(n:number)=>string){for(let n=from;step>0?n<=to:n>=to;n+=step){try{const c=make(n);if(!editError(c)){add(label(n),c);break;}}catch{/* Invalid alternatives are never offered. */}}}
 if(message.includes('continuous supporting panels')){
  const c=structuredClone(candidate),t=stock(c,'carcass').thickness,b=stock(c,'back').thickness,interior=resolveInteriors(c,t,b,stock(c,'interior').thickness);
  const supports=[...resolveConstruction(c,t,b).panels.filter(p=>p.orientation==='xz'),...interior.divisions.filter(d=>d.axis==='horizontal')];
  function clear(n:Cabinet['compartments']){if(n.kind==='split'){if(n.axis==='vertical'&&n.joint){const d=interior.divisions.find(d=>d.id===n.featureId);if(d&&[d.origin[1],d.origin[1]+d.size[1]].some((edge,i)=>!supports.some(p=>Math.abs(p.origin[1]+(i===0?p.size[1]:0)-edge)<.001&&p.origin[0]<=d.origin[0]+.001&&p.origin[0]+p.size[0]>=d.origin[0]+d.size[0]-.001&&p.origin[2]<=d.origin[2]+.001&&p.origin[2]+p.size[2]>=d.origin[2]+d.size[2]-.001)))delete n.joint;}n.children.forEach(clear);}}clear(c.compartments);add('Use butt joints on dividers without full top support',c);
 }
 if(message.includes('Front reinforcement must leave')){
  for(const side of ['top','bottom'] as const){const c=structuredClone(candidate),r=c.carcass.frontRails!;
   const other=side==='top'?'bottom':'top',available=Math.floor(c.envelope.height-2*stock(c,'carcass').thickness-60-(r[other].enabled?r[other].width:0));
   if(r[side].enabled&&available>=20&&available<r[side].width){r[side].width=available;add(`Use a ${available} mm ${side} front rail`,c);}
  }
 }
 if(message.includes('Rails with a panel require'))add('Keep rails with a panel and remove incompatible Ixconnect fixings',setBackFastener(candidate,false));
 if(message.includes('Blum wall hanging')&&candidate.carcass.back.mode!=='full')add('Keep the open back and remove wall hanging',{...candidate,installation:{...candidate.installation,mounting:{...candidate.installation.mounting,mode:'none'}}});
 if(/Plinth height/.test(message)){
  const height=40+candidate.installation.plinth.topGap+candidate.installation.plinth.bottomGap;
  add(`Raise feet to ${height} mm for a 40 mm plinth`,{...candidate,installation:{...candidate.installation,feet:{...candidate.installation.feet,height}}});
 }
 if(candidate.fronts.length){
  if(message.includes('cup setback'))add('Fit cup setbacks to the selected hinge application',{
   ...candidate,fronts:candidate.fronts.map(d=>d.hinge&&d.hinge.cupDistance>cupSetbackMax(d.hinge.id,d.placement==='inset')?
    {...d,hinge:{...d.hinge,cupDistance:cupSetbackMax(d.hinge.id,d.placement==='inset')}}:d),
  });
  if(/Blum (110|155)° hinges require/.test(message))add('Use 16 mm stock for the hinge assembly',setStockThickness(candidate,16));
  if(/Hinge positions/.test(message)){
   try{const shapes=previous.fronts.length?evaluate(previous).fronts.doors:[];add('Fit hinge setbacks to the door height',{...candidate,fronts:candidate.fronts.map(d=>{const shape=shapes.find(p=>p.id===d.id);return d.hinge&&shape?{...d,hinge:{...d.hinge,endOffset:Math.max(35,Math.min(d.hinge.endOffset,Math.floor((shape.size[1]-45*(d.hinge.count-1))/2)))}}:d;})});}catch{}
  }
  if(/hinge|Hinge|Blum/.test(message)&&candidate.fronts.some(d=>d.hinge)&&previous.fronts.some(d=>d.hinge))add('Keep this edit and remove hinge drilling',{...candidate,fronts:candidate.fronts.map(d=>{const {hinge,...rest}=d;return rest;})});

  if(message.includes('handle envelope')){
   try{const bad=new Set(resolveFronts(candidate).issues.filter(i=>i.message.includes('handle envelope')).map(i=>i.featureId));const without={...candidate,fronts:candidate.fronts.map(d=>({...d,handle:{...d.handle,kind:'none' as const}}))},shapes=evaluate(without).fronts.doors;
    const fitted={...candidate,fronts:candidate.fronts.map(d=>{if(!bad.has(d.id)||!['hole','knob'].includes(d.handle.kind))return d;const body=shapes.find(p=>p.id===d.id)!;const diameter=Math.min(d.handle.diameter??(d.handle.kind==='hole'?30:24),d.handle.kind==='hole'?100:80,Math.floor(Math.min(body.size[0],body.size[1])-10)),xMax=Math.floor(body.size[0]-diameter-5),yMax=Math.floor(body.size[1]-diameter-5);return {...d,handle:{...d.handle,diameter,...xMax<10?{horizontal:'centre' as const}:{edgeOffset:Math.min(d.handle.edgeOffset,xMax)},...yMax<10?{height:'centre' as const}:{endOffset:Math.min(d.handle.endOffset,yMax)}}};})};
    add('Fit hole / knob to the door with minimal offset changes',fitted);
   }catch{}
  }
  try{for(const correction of corrections(candidate))add(correction.label,correction.cabinet);}catch{/* Other repair types remain available. */}
  if(message.includes('coverage overlaps')){const added=candidate.fronts.filter(d=>!previous.fronts.some(old=>old.id===d.id)),old=candidate.fronts.filter(d=>previous.fronts.some(before=>before.id===d.id)&&added.some(n=>d.region.left<n.region.right&&d.region.right>n.region.left&&d.region.bottom<n.region.top&&d.region.top>n.region.bottom));if(old.length)add('Replace the overlapping doors',old.reduce((next,d)=>removeDoor(next,d.id),candidate));}
 }
 if(/foot|feet|plinth/i.test(message)&&candidate.installation.type==='feet-concept'){
  const i=candidate.installation,t=stock(candidate,'plinth').thickness,side=i.plinth.enabled&&(i.plinth.leftReturn||i.plinth.rightReturn)?35+t:30,front=i.plinth.enabled?(i.plinth.footGap===undefined?35+t+i.plinth.frontSetback:30+t+i.plinth.footGap):30;
  const fitted={...candidate,installation:{...i,feet:{...i.feet,sideInset:Math.max(side,Math.min(i.feet.sideInset,Math.floor((candidate.envelope.width-60)/2))),frontInset:Math.max(front,Math.min(i.feet.frontInset,candidate.envelope.depth-90)),rearInset:Math.max(30,Math.min(i.feet.rearInset,candidate.envelope.depth-60-Math.max(front,Math.min(i.feet.frontInset,candidate.envelope.depth-90))))}}};
  add('Fit foot positions to the body and plinth clearance',fitted);
  if(i.plinth.leftReturn||i.plinth.rightReturn)add('Keep the front plinth without side returns',{...candidate,installation:{...i,plinth:{...i.plinth,leftReturn:false,rightReturn:false}}});
  const depth=Math.ceil(Math.max(front,i.feet.frontInset)+i.feet.rearInset+60),width=Math.ceil(2*Math.max(side,i.feet.sideInset)+60);
  if(depth>candidate.envelope.depth&&depth<=1200)add(`Increase body depth to ${depth} mm for the feet`,resizeCabinet(candidate,'depth',depth));
  if(width>candidate.envelope.width&&width<=2400)add(`Increase body width to ${width} mm for the feet`,resizeCabinet(candidate,'width',width));
 }
 const joint=candidate.carcass.back.joint,prior=previous.carcass.back.joint;
 if(message.includes('Applied-back pilots')){
  const limits=backPilotLimits(candidate,joint?.pilots?.diameter),diameter=Math.min(joint?.pilots?.diameter??3,limits.maxDiameter),spacing=Math.max(20,Math.min(2000,joint?.pilots?.spacing??200));
  add(`Fit pilot holes to stock · Ø${diameter} mm`,setBackPanel(candidate,{pilots:{revision:'back-pilot-1',diameter,spacing}}));
 }
 if(/adjustment holes|support level leaves/.test(message)){
  const openings=resolveInteriors(candidate,stock(candidate,'carcass').thickness,stock(candidate,'back').thickness,stock(candidate,'interior').thickness).openings;
  const contents=candidate.contents.map(s=>{const opening=openings.find(o=>o.id===s.openingId);if(!opening||!s.drilling)return s;
   if(s.drilling.anchor){const bounds=shelfHoleBounds(candidate,opening),wholeMax=Math.floor((bounds.max-bounds.min)/32)+1,max=s.drilling.anchor==='centre'?shelfHoleMaximum(candidate,opening,s):wholeMax;if(max<1)return s;const count=Math.min(s.drilling.count,max),half=(count-1)*16,center=s.drilling.anchor==='centre'?opening.size[1]/2:Math.round(Math.max(bounds.min+half,Math.min(bounds.max-half,s.drilling.center!))*10)/10;return {...s,level:Math.min(s.level-s.drilling.firstLevel,count-1),drilling:{...s.drilling,count,firstLevel:0,center}};}
   const max=shelfHoleMaximum(candidate,opening);return max>0?{...s,level:Math.min(s.level,max-1),drilling:{...s.drilling,count:Math.min(s.drilling.count,max),firstLevel:Math.max(0,Math.min(s.drilling.firstLevel,max-Math.min(s.drilling.count,max)))}}:s;});
  add('Fit adjustable shelf levels and hole counts to the opening',{...candidate,contents});
 }

 if(joint&&/back seat depth|back engagement/.test(message)&&joint.depth===prior?.depth)search(Math.max(1,Math.ceil(joint.depth)),Math.floor(stock(candidate,'carcass').thickness-3),1,n=>setBackPanel(candidate,{depth:n}),n=>`Increase back seat depth to ${n} mm`);
 if(joint&&message.includes('back seat depth')&&joint.depth===prior?.depth)search(Math.floor(joint.depth),1,-1,n=>setBackPanel(candidate,{depth:n}),n=>`Reduce back seat depth to ${n} mm`);
 if(joint&&joint.mode===prior?.mode&&/back seat depth|back engagement/.test(message))add('Use an inset back without routed seats',setBackPanel(candidate,{mode:'inset',depth:1}));
 if(joint&&message.includes('behind it')&&joint.inset===prior?.inset)search(Math.ceil(joint.inset),100,1,n=>setBackPanel(candidate,{inset:n}),n=>`Move back groove inward · rear inset ${n} mm`);
 if(/Cabineo|Ixconnect/.test(message)){
  try{for(const option of railCollisionRepairs(candidate))add(option.label,option.cabinet);}catch{}
  if(stock(candidate,'carcass').thickness===stock(previous,'carcass').thickness)search(Math.ceil(stock(candidate,'carcass').thickness),24,1,n=>setStockThickness(candidate,n),n=>`Increase stock thickness to ${n} mm`);
  if(message.includes('Cabineo')){
   if(candidate.hardware[0]?.id==='cabineo-12')add('Use Cabineo 8',setCabineo(candidate,'cabineo-8'));
   if(settings.cabineoPerSide===old.cabineoPerSide){const counts=Array.from({length:20},(_,i)=>i+1).sort((a,b)=>Math.abs(a-(settings.cabineoPerSide||2))-Math.abs(b-(settings.cabineoPerSide||2)));for(const n of counts){const c=setCnc(candidate,{cabineoPerSide:n});if(!editError(c)){add(`Adjust Cabineo count · ${n} per side`,c);break;}}}
   add('Remove incompatible Cabineo fasteners',setCabineo(candidate,''));
  }
  if(message.includes('Ixconnect')||message.includes('back connectors')){
   if(joint?.fastener&&message.includes('hanger notches'))search(joint.fastener.perSide-1,1,-1,n=>setBackPanel(candidate,{fastener:{...joint.fastener!,perSide:n}}),n=>`Fit ${n} back connectors per side below the hanger notches`);
   if(joint?.fastener&&message.includes('hanger access notch')){
    const start=joint.fastener.offset??0;
    for(const direction of [-1,1])search(start+direction,direction*Math.floor(candidate.envelope.width/2-50),direction,n=>setBackPanel(candidate,{fastener:{...joint.fastener!,offset:n}}),n=>`Set back fixing offset to ${n} mm`);
   }
   if(joint?.fastener&&joint.fastener.perSide===prior?.fastener?.perSide)search(joint.fastener.perSide-1,1,-1,n=>setBackPanel(candidate,{fastener:{...joint.fastener!,perSide:n}}),n=>`Reduce back connectors to ${n} per side`);
   add('Remove incompatible back fasteners',setBackFastener(candidate,false));
  }
 }
 if(message.includes('clear on both sides')){
  // Clamp only displaced parts; leave still-valid positions and centre anchors alone.
  let next=candidate;
  for(let pass=0;pass<64;pass++){
   const layout=resolveInteriors(next,stock(next,'carcass').thickness,stock(next,'back').thickness,stock(next,'interior').thickness),issue=layout.issues.find(i=>i.code==='division-position');if(!issue)break;
   const match=issue.message.match(/centre must be ([\d.]+)–([\d.]+)/);if(!match)break;
   const low=Math.ceil(+match[1]),high=Math.floor(+match[2]);if(low>high)break;
   const before=next.compartments;const find=(n:typeof before):number|undefined=>n.kind==='opening'?undefined:n.featureId===issue.featureId?n.position:find(n.children[0])??find(n.children[1]);
   next=moveDivision(next,issue.featureId,Math.min(high,Math.max(low,Math.round(find(before)??low))));
  }
  if(JSON.stringify(next)!==JSON.stringify(candidate))add('Move affected interiors to the nearest fitting position',next);
  let reduced=candidate,removed=0;
  for(let pass=0;pass<64;pass++){
   const layout=resolveInteriors(reduced,stock(reduced,'carcass').thickness,stock(reduced,'back').thickness,stock(reduced,'interior').thickness),issue=layout.issues.find(i=>i.code==='division-position');if(!issue)break;
   const count=(node:Cabinet['compartments']):number=>node.kind==='opening'?0:1+node.children.reduce((sum,n)=>sum+count(n),0);
   const before=count(reduced.compartments);reduced=removeDivisionTree(reduced,issue.featureId);removed+=before-count(reduced.compartments);
  }
  if(removed)add(`Remove ${removed} interior part${removed===1?'':'s'} that no longer fit`,reduced);
 }
 return options;
}
