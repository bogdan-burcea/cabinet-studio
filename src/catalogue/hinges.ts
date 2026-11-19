import type {SlabDoor} from '../domain/cabinet';
/** Blum MA-679 110° screw-on family. Articles follow the mounting application.
 * Cup pattern is manufacturer-sized; screw pilot choice is application policy.
 * These dimensions do not specify the proprietary linkage or certify a load. */
export const blumClip110={id:'blum-clip-110',revision:'blum-1',name:'Blum CLIP top BLUMOTION 110°',overlay:'71B3550',dual:'71B3650',inset:'71B3750',plate:'173H7100',cupDiameter:35,cupDepth:13,screwPitch:45,screwOffset:9.5,plateLine:37,platePitch:32,maxAngle:110,softClose:true} as const;
export const defaultHinge=():NonNullable<SlabDoor['hinge']>=>({id:blumClip110.id,revision:blumClip110.revision,count:2,endOffset:100,cupDistance:5});
