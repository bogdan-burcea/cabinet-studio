import type { Cabinet, Mounting } from '../domain/cabinet';
// Suspension releases floor support explicitly, retaining all foot/plinth intent for reuse.
export function changeMounting(c: Cabinet, mounting: Mounting): Cabinet {
  return { ...c, installation: { ...c.installation, mounting, type: mounting.mode === 'suspended-concept' ? 'unassigned' : c.installation.type } };
}
