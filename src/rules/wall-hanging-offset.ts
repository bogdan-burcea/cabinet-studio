import type {Cabinet} from '../domain/cabinet';
export const SIDE_NOTCH_DEPTH=8;
/** A side notch is a local access cut. Rear construction datums are independent. */
export function wallHangingRearOffset(_c:Cabinet){return 0;}
