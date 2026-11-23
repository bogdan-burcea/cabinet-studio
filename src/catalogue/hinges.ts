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
export const hingeProfiles={ [blumClip110.id]:blumClip110, [blumClip155.id]:blumClip155, [blumThin110.id]:blumThin110 };
export type HingeId=keyof typeof hingeProfiles;

export const defaultHinge=(id:HingeId=blumClip110.id):NonNullable<SlabDoor['hinge']>=>({id,revision:hingeProfiles[id].revision,count:2,endOffset:100,cupDistance:isThinHinge(id)?25:5});
export const cupSetbackMax=(id:HingeId,inset:boolean)=>isThinHinge(id)?46:id===blumClip155.id&&!inset?8:7;

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
