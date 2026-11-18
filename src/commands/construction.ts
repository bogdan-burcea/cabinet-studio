import type { Cabinet, Carcass } from '../domain/cabinet';
// Construction is a reviewed intent replacement. Compartment/product intent is never rewritten.
export function changeConstruction(cabinet: Cabinet, carcass: Carcass): Cabinet {
  return { ...cabinet, carcass: structuredClone(carcass) };
}
