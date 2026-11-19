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
export const hingeProfiles={ [blumClip110.id]:blumClip110, [blumClip155.id]:blumClip155 };
export type HingeId=keyof typeof hingeProfiles;

export const defaultHinge=(id:HingeId=blumClip110.id):NonNullable<SlabDoor['hinge']>=>({id,revision:hingeProfiles[id].revision,count:2,endOffset:100,cupDistance:5});
export const cupSetbackMax=(id:HingeId,inset:boolean)=>id===blumClip155.id&&!inset?8:7;
