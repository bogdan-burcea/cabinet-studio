import {readFileSync,writeFileSync} from 'node:fs';
const base=new URL('../node_modules/@ebay/skin/',import.meta.url);
const version=JSON.parse(readFileSync(new URL('package.json',base),'utf8')).version;
// Preserve official values verbatim; scope the published dark-mode tokens to our theme toggle.
const dark=readFileSync(new URL('dist/tokens/evo-dark.css',base),'utf8');
const declarations=dark.match(/--[\w-]+\s*:[\s\S]*?;/g);
if(!declarations?.length)throw new Error('Missing eBay dark tokens');
writeFileSync(new URL('../src/design-system/evo-dark.generated.css',import.meta.url),`/* Generated from @ebay/skin ${version}; run node scripts/sync-ebay-design.mjs. */\n:root[data-theme="graphite"] {\n${declarations.map(d=>'  '+d).join('\n')}\n}\n`);
const names=['settings','checkbox-checked','checkbox-unchecked','radio-checked','radio-unchecked','add','remove','delete','move','information','attention','attention-filled','home','medium-box','full-view','undo','download','folder','file','arrows-3d','arrows-expand','split-view','brightness','moon','checkmark','help','close','arrow-right','eye','grid-view','zoom-in'];
let symbols='';
for(const name of names){for(const size of [12,16,20,24]){
 try{const svg=readFileSync(new URL(`dist/svg/icon/icon-${name}-${size}.svg`,base),'utf8');const box=svg.match(/viewBox="([^"]+)"/)[1];const content=svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');symbols+=`<symbol id="icon-${name}-${size}" viewBox="${box}">${content}</symbol>\n`;}catch(error){if(error.code!=='ENOENT')throw error;}
}}
for(const name of ['chevron-down','chevron-up','chevron-right'])for(const size of [12,16,20,24]){
 const svg=readFileSync(new URL(`dist/svg/icon/icon-${name}-${size}.svg`,base),'utf8');const box=svg.match(/viewBox="([^"]+)"/)[1];symbols+=`<symbol id="icon-${name}-${size}" viewBox="${box}">${svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'')}</symbol>\n`;
}
writeFileSync(new URL('../public/assets/evo-icons.svg',import.meta.url),`<!-- eBay Evo icons, @ebay/skin ${version}, MIT; original paths unchanged. -->\n<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>\n`);
