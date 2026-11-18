export type ThemeName = 'graphite' | 'linen';
export interface ViewportTheme { background: string; grid: string; panel: string; edge: string; selected: string; ghost: string; handle: string }
// Display colours belong to presentation. These never modify material identity.
export const viewportThemes: Record<ThemeName, ViewportTheme> = {
  graphite: { background: '#242b2e', grid: '#536065', panel: '#d9cdb9', edge: '#766c5e', selected: '#ddb979', ghost: '#90b8ab', handle: '#eec389' },
  linen: { background: '#eeede7', grid: '#b7b8ad', panel: '#c9b497', edge: '#6a6053', selected: '#356e61', ghost: '#4f9c8a', handle: '#356e61' }
};
