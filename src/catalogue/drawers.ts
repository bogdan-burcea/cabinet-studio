import type {ProductPin} from '../domain/cabinet';
/** Pinned planning data. K550 profiles use supplied assembly CAD; other variants adapt it for display. */
export const antaroM500 = {
 id:'blum-antaro-m-500-blumotion-sw',revision:'catalogue-2024-1',manufacturer:'Blum',name:'TANDEMBOX antaro M · 500 mm · BLUMOTION',
 colour:'SW · silk white',nominalLength:500,sideHeight:83.6,minimumHeight:98.5,minimumDepth:503,boardThickness:16,
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
  name:`TANDEMBOX antaro ${height} · ${length} mm · BLUMOTION`,
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
export const drawerPacks=[antaroM500,...(['M','K'] as const).flatMap(h=>drawerLengths.filter(n=>h!=='M'||n!==500).map(n=>configuredPack(h,n)))];
export function drawerPack(pin:ProductPin){
 const pack=drawerPacks.find(p=>p.id===pin.id&&p.revision===pin.revision);
 if(!pack)throw new Error('Unavailable TANDEMBOX pack revision.');
 return pack;
}
export const antaroPin:ProductPin={id:antaroM500.id,revision:antaroM500.revision};
