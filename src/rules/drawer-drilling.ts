import {pilotDiameter} from '../catalogue/pilots';
import {resolveHandle} from './handles';
import type {Cabinet,Vec3} from '../domain/cabinet';
import type {CabineoBore} from './cabineo';
import type {Panel} from '../geometry/evaluate';
import {resolveDrawers} from './drawers';
import {drawerPack} from '../catalogue/drawers';

// Two chipboard-screw fixing stations from Blum catalogue p.334 / Workshop.
// Ø2.5 × 10 pilot is application policy for the specified Ø4 × 15 screw,
// not a factory pre-drilling specification. INSERTA machining is not inferred.
export function drawerDrilling(c:Cabinet,panels:Panel[]):CabineoBore[]{
 const bores:CabineoBore[]=[];
 for(const drawer of resolveDrawers(c).drawers){
  const {origin:[x,low,z],size:[width]}=drawer.allocation,pack=drawerPack(drawer.intent.pack);
  const front=z+pack.minimumDepth;
  for(const side of ['left','right'] as const){
   const left=side==='left',face=left?x:x+width;
   const panel=panels.find(p=>p.orientation==='yz'&&Math.abs(p.center[0]+(left?1:-1)*p.size[0]/2-face)<.001&&p.center[1]-p.size[1]/2<=low&&p.center[1]+p.size[1]/2>=low+pack.minimumHeight);
   if(!panel)continue;
   const merivo=pack.family==='merivobox';
   // MERIVOBOX MD-053/5 p.3: populated fixing holes, measured from the front.
   const stations=merivo?(pack.manufacturerDynamicLoadKg===70?[19,28,37,261,275,293,...pack.nominalLength===600?[389,403,421]:[]]:[19,37,69,...pack.nominalLength<=350?[197,229]:[261,293]]):pack.nominalLength===270?[37,133]:pack.nominalLength<=350?[37,165]:pack.nominalLength===400?[37,229]:pack.nominalLength===650?[37,165,261,293]:pack.nominalLength===600?[37,293]:[37,261];
   for(const station of stations){
    const point:Vec3=[face,low+(merivo?54:33),front-station];
    const id=`${drawer.id}/runner-${side}/pilot-${station}`;
    bores.push({id,group:id,panelId:panel.id,kind:'pilot',point,axis:0,sign:left?-1:1,diameter:pilotDiameter(c),depth:10});
   }
  }
  const part=(key:string)=>drawer.parts.find(p=>p.id===drawer.id+'/'+key)!;
  const bore=(key:string,side:string,station:number,point:Vec3,axis:0|1|2,sign:1|-1)=>{
   const id=`${drawer.id}/${key}/pilot-${side}-${station}`;
   bores.push({id,group:id,panelId:part(key).id,kind:'pilot',point,axis,sign,diameter:pilotDiameter(c),depth:10});
  };
  const back=part('back'),frontPart=part('front'),base=part('bottom');
  if(!drawer.intent.internal&&drawer.intent.handle)bores.push(...resolveHandle(drawer.intent.handle,frontPart).bores);
  if(pack.family==='merivobox'){
   const tall=pack.configuration!=='m';
   if(!drawer.intent.internal)for(const [side,xx] of [['left',x+20.5],['right',x+width-20.5]] as const)
    for(const height of tall?[33.5,65.5,193.5]:[33.5,65.5])bore('front',side,height,[xx,low+height,frontPart.center[2]-frontPart.size[2]/2],2,1);
   for(const [side,xx] of [['left',x+36.5],['right',x+width-36.5]] as const)
    for(const end of tall?[10,42,106,138]:[10,42])bore('back',side,end,[xx,back.center[1]+back.size[1]/2-end,back.center[2]-8],2,1);
   const distance=pack.nominalLength<=300?128:256;
   for(const [side,xx] of [['left',x+34.5],['right',x+width-34.5]] as const)bore('bottom',side,distance,[xx,base.center[1]-8,front-distance],1,1);
   continue;
  }
  if(!drawer.intent.internal)for(const [side,xx] of [['left',x+15.5],['right',x+width-15.5]] as const){
   for(const height of pack.sideHeight>100?[47.5,79.5,111.5]:[47.5,79.5])bore('front',side,height,[xx,low+height,frontPart.center[2]-frontPart.size[2]/2],2,1);
  }
  for(const [side,xx] of [['left',x+52.5],['right',x+width-52.5]] as const){
   for(const end of pack.sideHeight>100?[22,54,86]:[20,52])bore('back',side,end,[xx,back.center[1]+back.size[1]/2-end,back.center[2]-8],2,1);
  }
  // Slot centres measured from the supplied K550 side CAD. The same profile
  // adaptation as the display is used at other lengths, explicitly provisional.
  const delta=550-pack.nominalLength;
  const distances=[17.65,174.65,287.65,433.65].flatMap(n=>delta>=0?(n>420?[n-delta]:n<420-delta?[n]:[]):[n>420?n-delta:n]);
  for(const [side,xx] of [['left',x+46],['right',x+width-46]] as const)
   for(const distance of distances)if(distance<base.size[2]-3)bore('bottom',side,distance,[xx,base.center[1]-8,front-distance],1,1);
 }
 return bores;
}
