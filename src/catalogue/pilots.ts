/** Application wood-screw pilot policy, independent of manufacturer fitting bores. */
export const woodPilotDiameter=2.5;

import type {Cabinet} from '../domain/cabinet';
export function pilotDiameter(c:Cabinet){return c.carcass.machining?.pilotDiameter??woodPilotDiameter;}
