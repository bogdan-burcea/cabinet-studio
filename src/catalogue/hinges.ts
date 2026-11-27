import {defaultCustomHinge,validCustomHinge} from './custom-hinge';
import type {SlabDoor} from '../domain/cabinet';
/** Blum MA-679 110° screw-on family. Articles follow the mounting application.
 * Cup pattern is manufacturer-sized; screw pilot choice is application policy.
 * These dimensions do not specify the proprietary linkage or certify a load. */
export const blumClip110={id:'blum-clip-110',revision:'blum-1',name:'Blum CLIP top BLUMOTION 110°',overlay:'71B3550',dual:'71B3650',inset:'71B3750',plate:'173H7100',cupDiameter:35,cupDepth:13,screwPitch:45,screwOffset:9.5,plateLine:37,platePitch:32,maxAngle:110,softClose:true} as const;

/** Blum TD-091 155° screw-on family. Inset uses the half-cranked arm and a 9 mm plate. */
export const blumClip155={
 ...blumClip110,
 id:'blum-clip-155',name:'Blum CLIP top BLUMOTION 155°',
 overlay:'71B7550',dual:'71B7650',inset:'71B7650',
 plate:'175H7100',insetPlate:'175H7190',
 cupDepth:11.7,maxAngle:155,extraPlateSetback:26,
} as const;
/** Blum 2024/2025 pp.104–105; EXPANDO T, no 35 mm cup. */
export const blumThin110={...blumClip110,id:'blum-thin-110',name:'Blum CLIP top BLUMOTION 110° · EXPANDO T · 8–14 mm',overlay:'71B453T',dual:'71B453T',inset:'71B453T',cupDiameter:0,cupDepth:0,screwPitch:32,screwOffset:0,
 fixingDiameter:10,fixingDepth:6,minimumThickness:8,maximumThickness:14,source:'https://publications.blum.com/2024/catalogue/en/105/'} as const;
export const isThinHinge=(id:string)=>id===blumThin110.id;
export const isThinHingeArticle=(article:string)=>article===blumThin110.inset;
export const thinPlateHeight=(side:number,front:number)=>side-front>=5?0:side-front>=2?3:6;
/** Häfele Metalla+ brochure pp.6,16: screw-on 45/9.5, H=0 cam plate.
 * Articles and drilling are manufacturer data. Motion below is a provisional
 * clearance study, not supplier linkage CAD or a certified inset assembly. */
export const hafeleMetalla155={...blumClip110,id:'hafele-metalla-155',revision:'metalla-1',name:'Häfele Metalla+ 310 SM 155°',overlay:'311.63.730',dual:'311.63.733',inset:'311.63.736',plate:'311.70.610',cupDepth:12,maxAngle:155,
 source:'https://sklep.domator.eu/files/HPL_Broszura_Metalla_310_SM.pdf'} as const;
export const hafeleMetalla110={...hafeleMetalla155,id:'hafele-metalla-110',name:'Häfele Metalla+ 310 SM 110°',overlay:'311.04.248',dual:'311.04.251',inset:'311.04.254',maxAngle:110} as const;
export const hafeleMetalla155D4={...hafeleMetalla155,id:'hafele-metalla-155-d4',plate:'311.70.614',name:'Häfele Metalla+ 310 SM 155° · 4 mm plate'} as const;
export const metallaPlateDistance=(id:string)=>id===hafeleMetalla155D4.id?4:0;
export const isMetalla=(id:string)=>id===hafeleMetalla155.id||id===hafeleMetalla110.id||id===hafeleMetalla155D4.id;
export const isMetallaArticle=(article:string)=>([hafeleMetalla155.overlay,hafeleMetalla155.dual,hafeleMetalla155.inset,hafeleMetalla110.overlay,hafeleMetalla110.dual,hafeleMetalla110.inset] as string[]).includes(article);
/** Minimum square-edge gap, brochure p.6. Round upwards between table entries. */
export function metallaMinimumGap(thickness:number,cup:number){
 const rows=[[.5,1.2,2,3,3.9],[.5,1.3,2.2,3.2,4.2],[.5,1.4,2.3,3.4,4.3],[.7,1.5,2.5,3.5,4.6],[.8,1.7,2.8,3.7,5],[1,1.9,2.9,3.8,5.1],[1.2,2.2,3,4,5.2],[1.3,2.3,3.3,4.2,5.3],[1.5,2.4,3.5,4.5,5.5],[1.7,2.7,3.7,4.8,5.6]];
 return rows[Math.max(0,Math.min(9,Math.ceil(thickness)-15))][Math.max(0,Math.min(4,Math.ceil(cup)-3))];
}
/** Signed inward door-edge distance from the support face at the centre setting. */
export const metallaNominalEdge=(kind:'overlay'|'dual'|'inset',cup:number,angle=155)=>angle===110?(kind==='inset'?7-cup:-(cup+(kind==='overlay'?11:2))):kind==='inset'?cup-4:-(cup+(kind==='overlay'?15:3));
export const customHinge={...blumClip110,...defaultCustomHinge,id:'custom-hinge',revision:'custom-1',name:'Custom soft-close hinge',overlay:defaultCustomHinge.article,dual:defaultCustomHinge.article,inset:defaultCustomHinge.article} as const;
export const hingeProfiles={ [blumClip110.id]:blumClip110, [blumClip155.id]:blumClip155, [blumThin110.id]:blumThin110, [hafeleMetalla155.id]:hafeleMetalla155, [hafeleMetalla110.id]:hafeleMetalla110, [hafeleMetalla155D4.id]:hafeleMetalla155D4, [customHinge.id]:customHinge };
/** Retired EXPANDO files remain readable; new selections exclude this fitting. */
export const selectableHinges=Object.values(hingeProfiles).filter(p=>!isThinHinge(p.id));
export function resolveHinge(h:NonNullable<SlabDoor['hinge']>){
 if(h.id==='custom-hinge'){if(!validCustomHinge(h.custom))throw Error('Custom hinge mounting details are invalid. Enter the dimensions from the hinge spec sheet.');return {...customHinge,...h.custom,overlay:h.custom.article,dual:h.custom.article,inset:h.custom.article};}
 if(h.custom!==undefined)throw Error('Custom mounting details require the custom hinge option.');
 return Object.hasOwn(hingeProfiles,h.id)?hingeProfiles[h.id]:undefined;
}
export type HingeId=keyof typeof hingeProfiles;

export const defaultHinge=(id:HingeId=blumClip110.id):NonNullable<SlabDoor['hinge']>=>({id,revision:hingeProfiles[id].revision,count:2,endOffset:100,cupDistance:isThinHinge(id)?25:5,...id==='custom-hinge'?{custom:{...defaultCustomHinge}}:{}});
export const cupSetbackMax=(id:HingeId,inset:boolean)=>id==='custom-hinge'?30:isThinHinge(id)?46:id===blumClip155.id&&!inset?8:7;

/** Published clearance anchors, not measured linkage joint coordinates.
 * Blum Catalogue 2024/2025 p.85 (90°); Concealed Hinges 2025 p.13 (full open).
 * Intermediate rigid poses interpolate these anchors as an application model. */
export const clip155Motion={
 source:'https://publications.blum.com/2024/catalogue/en/85/',
 fullOpenSource:'https://d2.blum.com/services/BEC003/concealedhinges_ep_dok_bus_%24sen-us_%24aof_%24v18.pdf',
 overlay:{protrusion90:-2.3,protrusion155:2.3,fixingDistance:11},
 dual:{protrusion90:7.2,protrusion155:7.2,fixingDistance:1.5},
 inset:{protrusion90:16.2,protrusion155:16.2,fixingDistance:7.5},
 advance90:32,
} as const;
