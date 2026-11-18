import type { Cabinet, Installation } from '../domain/cabinet';
export function changeInstallation(cabinet: Cabinet, installation: Installation): Cabinet {
  return { ...cabinet, installation: structuredClone(installation) };
}
