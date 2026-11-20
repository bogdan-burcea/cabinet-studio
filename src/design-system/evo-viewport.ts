import {viewportThemes,type ThemeName,type ViewportTheme} from './themes';
/** Canvas colours use the same resolved Evo semantic tokens as the HTML UI. */
export function evoViewportTheme(theme:ThemeName):ViewportTheme{
 if(typeof document==='undefined')return viewportThemes[theme];
 const css=getComputedStyle(document.documentElement),fallback=viewportThemes[theme];
 const color=(token:string,backup:string)=>css.getPropertyValue(token).trim()||backup;
 const foreground=color('--color-foreground-primary',fallback.wire),secondary=color('--color-foreground-secondary',fallback.edge),accent=color('--color-foreground-accent',fallback.selected);
 return {edgeOpacity:theme==='graphite'?1:.85,selectedEdge:theme==='graphite'?'#081526':undefined,stockEdge:secondary,background:color('--color-background-secondary',fallback.background),grid:color('--color-border-subtle',secondary),panel:color(theme==='graphite'?'--color-foreground-secondary':'--color-background-tertiary',fallback.panel),edge:theme==='graphite'?'#080a0d':'#555b61',wire:foreground,selected:accent,ghost:accent,handle:accent,support:secondary,mounting:secondary,frontHandle:foreground};
}
