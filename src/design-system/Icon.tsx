export type IconName = 'cabinet' | 'undo' | 'redo' | 'save' | 'open' | 'cube' | 'fit' | 'chevron' | 'panel' | 'sun' | 'moon' | 'check' | 'help' | 'close' | 'arrow' | 'eye';
const paths: Record<IconName, string> = {
  cabinet: 'M4 3h16v18H4z M12 3v18 M9 11v3 M15 11v3',
  undo: 'M9 5 4 10l5 5 M4 10h10a6 6 0 0 1 0 12', redo: 'm15 5 5 5-5 5 M20 10H10a6 6 0 0 0 0 12',
  save: 'M5 3h12l4 4v14H3V3z M7 3v6h10V3 M7 21v-8h10v8', open: 'M3 7V4h7l3 3h8v4 M3 7h6l3 4h10l-3 10H3z',
  cube: 'm12 2 10 5v10l-10 5-10-5V7z M2 7l10 5 10-5 M12 12v10',
  fit: 'M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6 M8 8h8v8H8z',
  chevron: 'm9 5 7 7-7 7', panel: 'M4 3h16v18H4z M8 3v18',
  sun: 'M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11', check: 'm5 12 4 4L19 6', help: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4 M12 17v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  close: 'm5 5 14 14 M5 19 19 5', arrow: 'M3 12h18 m-6-6 6 6-6 6', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'
};
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
