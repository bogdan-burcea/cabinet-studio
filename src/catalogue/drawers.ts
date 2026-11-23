import type {MetalDrawer,ProductPin} from '../domain/cabinet';
/** Pinned planning data. K550 profiles use supplied assembly CAD; other variants adapt it for display. */
export const antaroM500 = {
 id:'blum-antaro-m-500-blumotion-sw',revision:'catalogue-2024-1',manufacturer:'Blum',name:'TANDEMBOX antaro M · 500 mm · BLUMOTION',
 family:'antaro' as const,configuration:'m' as 'm'|'k',colour:'SW · silk white',nominalLength:500,sideHeight:83.6,minimumHeight:98.5,minimumDepth:503,boardThickness:16,
 bottomWidthDeduction:75,bottomLengthDeduction:24,backWidthDeduction:87,backHeight:84,
 manufacturerDynamicLoadKg:30,verification:'drawing-checked; physical trial pending',
 sources:[
  {url:'https://publications.blum.com/2024/catalogue/en/296/',edition:'Catalogue 2024/2025',page:296,scope:'Matched articles, side height and 30 kg runner rating'},
  {url:'https://publications.blum.com/2024/catalogue/en/297/',edition:'Catalogue 2024/2025',page:297,scope:'16 mm bottom/back deductions and installation references'},
  {url:'https://publications.blum.com/2024/catalogue/en/334/',edition:'Catalogue 2024/2025',page:334,scope:'Runner fastening: Ø4 × 15 chipboard screws or 661.1450.HG system screws'},
  {url:'https://d2.blum.com/services/BEC003/me57421162_ep_dok_bau_%24sen-ca_%24aof_%24v1.pdf',edition:'EP-613/1 EN-CA/03.23',page:44,scope:'503 mm depth and 98.5 mm space envelope; pp.45/66 planning cross-check'}
 ],
 components:[
  {article:'578.5001M',quantity:1,unit:'left/right pair',description:'500 mm BLUMOTION cabinet profiles · 30 kg'},
  {article:'378M5002SA',quantity:1,unit:'left/right set · SW',description:'83.6 mm M sides; includes two Blum cover caps'},
  {article:'Z30M000S.04',quantity:1,unit:'left/right pair · SW',description:'16 mm chipboard-back fixings'},
  {article:'ZSF.35A2',quantity:2,unit:'pieces',description:'Screw-on front fixing brackets'}
 ],
 // Screw diameters/lengths are specified where evidenced; unresolved choices are never invented.
 fastening:'Runner fixing: Ø4 × 15 mm chipboard screws, or Ø6 × 14.5 mm system screw 661.1450.HG (Ø5 bore). Front/back/base screw articles and quantities require the regional assembly instruction before manufacture.',
 limitations:'External M drawer, 500 mm, BLUMOTION, SW, 16 mm chipboard bottom/back only. No TIP-ON, SERVO-DRIVE, steel back, inner drawer or high-front gallery. Fitting solids are simplified envelopes. No machining output, cabinet load rating or physically verified assembly.'
} as const;

function configuredPack(height:'M'|'K',length:number){
 const k=height==='K';
 return {...antaroM500,id:`blum-antaro-${height.toLowerCase()}-${length}-blumotion-sw`,
  configuration:k?'k' as const:'m' as const,name:`TANDEMBOX antaro ${height} · ${length} mm · BLUMOTION`,
  nominalLength:length,manufacturerDynamicLoadKg:length===650?65:30,minimumDepth:length+3,sideHeight:k?115.6:83.6,backHeight:k?116:84,
  minimumHeight:k?130.5:98.5,
  sources:[...antaroM500.sources,...k?[{url:'https://publications.blum.com/2024/catalogue/en/300/',edition:'Catalogue 2024/2025',page:300,scope:'K matched articles and runner lengths'},{url:'https://publications.blum.com/2024/catalogue/en/301/',edition:'Catalogue 2024/2025',page:301,scope:'K front/back fixing positions and cutting dimensions'}]:[]],
  components:[
   {...antaroM500.components[0],article:`${length===650?576:578}.${length}1M`,description:`${length} mm BLUMOTION cabinet profiles · ${length===650?65:30} kg`},
   {...antaroM500.components[1],article:`378${height}${length}2SA`,description:`${k?115.6:83.6} mm ${height} sides with cover caps`},
   {...antaroM500.components[2],article:k?'Z30K000S':'Z30M000S.04'},
   antaroM500.components[3],
  ],
 };
}
export const drawerLengths=[270,300,350,400,450,500,550,600,650];
const antaroPacks=[antaroM500,...(['M','K'] as const).flatMap(h=>drawerLengths.filter(n=>h!=='M'||n!==500).map(n=>configuredPack(h,n)))];
export type DrawerConfiguration='m'|'k'|'e-gallery'|'e-closed';
export const merivoLengths=[270,300,350,400,450,500,550,600];
function merivoPack(configuration:'m'|'e-gallery'|'e-closed',length:number,load:40|70){
 const tall=configuration!=='m',gallery=configuration==='e-gallery';
 return {...antaroM500,family:'merivobox' as const,configuration,
  id:`blum-merivobox-${configuration}-${length}-${load}-blumotion-sw`,revision:'catalogue-2024-1',
  name:`MERIVOBOX ${tall?'E · '+(gallery?'gallery':'BOXCAP'):'M'} · ${length} mm · ${load} kg · BLUMOTION`,colour:'SW-M · silk white matt',
  nominalLength:length,manufacturerDynamicLoadKg:load,sideHeight:91,minimumHeight:tall?209:108,minimumDepth:length+3,
  bottomWidthDeduction:51,bottomLengthDeduction:26,backWidthDeduction:51,backHeight:tall?184:83,
  sources:[{url:'https://publications.blum.com/2024/catalogue/en/256/',edition:'Catalogue 2024/2025',page:256,scope:'M sides, runners and front fixings'},
   {url:`https://publications.blum.com/2024/catalogue/en/${tall?gallery?264:268:257}/`,edition:'Catalogue 2024/2025',page:tall?gallery?264:268:257,scope:'Matched construction and 16 mm cutting rules'},
   {url:'https://d2.blum.com/services/BEC003/me25532842_ep_dok_bau_%24sen_%24aof_%24v5.pdf',edition:'MERIVOBOX planning v5',page:58,scope:'40/70 kg fixing stations; pp.14–15 front/back/base preparation'}],
  components:[
   {article:`${load===70?453:450}.${length}1B`,quantity:1,unit:'left/right pair',description:`${length} mm BLUMOTION runners · ${load} kg`},
   {article:`470M${length}2S`,quantity:1,unit:'left/right set · SW-M',description:'91 mm M base sides, branding elements and cover caps'},
   {article:tall?'ZB4E000S':'ZB4M000S',quantity:1,unit:'left/right pair',description:`${tall?184:83} mm chipboard-back fixings`},
   {article:'ZF4.1002',quantity:2,unit:'pieces',description:'Screw-on front fixing brackets'},
   ...tall?[
    {article:'ZF4.5002',quantity:2,unit:'pieces',description:'Screw-on upper front fixings'},
    {article:gallery?`ZR4.${length}RS.E`:`ZL4.${length}S.E`,quantity:1,unit:'left/right pair',description:gallery?'E longside gallery rails':'E closed metal BOXCAP sides'},
    ...gallery?[{article:'ZB4E00AK',quantity:2,unit:'pieces',description:'E chipboard-back fixing cover caps'}]:[],
   ]:[],
  ],fastening:'Ø4 × 15 runner screws; Ø3.5 × 15 flat-head back/base screws. Pilot diameters and blind pilot depths are application policy.',
  limitations:'BLUMOTION, screw-on front fixings, 16 mm wood bottom/back. MERIVOBOX fitting shapes are schematic profiles, not manufacturer CAD. No TIP-ON, SERVO-DRIVE, glass fronts or waste-bin over-extension is implied.'};
}
export const merivoPacks=(['m','e-gallery','e-closed'] as const).flatMap(kind=>merivoLengths.flatMap(n=>([40,70] as const).filter(load=>load===40||n>=450).map(load=>merivoPack(kind,n,load))));
export const drawerPacks=[...antaroPacks,...merivoPacks];
export type DrawerPack=typeof drawerPacks[number];
export const matchingDrawerPacks=(pack:DrawerPack)=>drawerPacks.filter(p=>p.family===pack.family&&p.configuration===pack.configuration&&(pack.family==='antaro'||p.manufacturerDynamicLoadKg===pack.manufacturerDynamicLoadKg));
export function chooseDrawerPack(current:ProductPin,patch:{family?:'antaro'|'merivobox';configuration?:DrawerConfiguration;length?:number;load?:number}):ProductPin{
 const old=drawerPack(current),family=patch.family??old.family;
 const configuration=patch.configuration??(family===old.family?old.configuration:'m');
 const choices=drawerPacks.filter(p=>p.family===family&&p.configuration===configuration&&(family==='antaro'||p.manufacturerDynamicLoadKg===(patch.load??(old.family==='merivobox'?old.manufacturerDynamicLoadKg:40))));
 const wanted=patch.length??old.nominalLength;
 const selected=choices.find(p=>p.nominalLength===wanted)??[...choices].sort((a,b)=>Math.abs(a.nominalLength-wanted)-Math.abs(b.nominalLength-wanted)||a.nominalLength-b.nominalLength)[0];
 if(!selected)throw Error('No matched drawer configuration is available.');return {id:selected.id,revision:selected.revision};
}
export function drawerPack(pin:ProductPin){
 const pack=drawerPacks.find(p=>p.id===pin.id&&p.revision===pin.revision);
 if(!pack)throw new Error('Unavailable Blum drawer pack revision.');
 return pack;
}
export const antaroPin:ProductPin={id:antaroM500.id,revision:antaroM500.revision};

/** ANTARO M inner front: Blum 2024/2025 pp.298–299; Workshop planning cross-check.
 * Front/body envelopes are schematic; the purchased profile is cut to LW − 132. */
export const antaroInner={revision:'antaro-inner-1' as const,minimumHeight:106,defaultSetback:60,minimumSetback:55,frontWidthDeduction:132,frontStockLength:1036,
 source:'https://publications.blum.com/2024/catalogue/en/298/',
 components:[
  {article:'ZIF.71M0',quantity:1,unit:'left/right set',description:'M inner front fixings with locking piece'},
  {article:'Z31L1036A',quantity:1,unit:'piece',description:'Aluminium inner front · cut to internal width − 132 mm'},
  {article:'ZIF.80M5',quantity:1,unit:'piece',description:'Inner drawer handle · without door latch'},
 ]};
export const merivoInner={revision:'merivobox-inner-1' as const,minimumHeight:106,frontWidthDeduction:126,frontStockLength:1042};
export function innerDrawerSpec(pack:DrawerPack){return pack.family==='merivobox'?{...merivoInner,minimumHeight:pack.configuration==='m'?106:207}:antaroInner;}
export function drawerComponents(d:MetalDrawer){
 const pack=drawerPack(d.pack);if(!d.internal)return pack.components;
 if(pack.family==='antaro')return [...pack.components.slice(0,3),...antaroInner.components];
 const tall=pack.configuration!=='m';
 return [...pack.components.filter(p=>!p.article.startsWith('ZF4.')),
  {article:tall?'ZI4.2ES1':'ZI4.0MS1',quantity:1,unit:'left/right set',description:'Inner front fixings, internal caps and locking piece'},
  {article:'ZV4.1042M',quantity:1,unit:'piece',description:'Inner front profile · cut to internal width − 126 mm'},
  ...tall?[{article:'ZR4.1059U',quantity:1,unit:'piece',description:'Inner cross gallery · cut to internal width − 111 mm'}]:[],
 ];
}
