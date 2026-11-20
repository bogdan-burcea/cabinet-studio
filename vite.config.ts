import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,dirname} from 'node:path';
import {defineConfig} from 'vite';

const require = createRequire(import.meta.url);

// Relative URLs support GitHub Pages' /cabinet-studio/ path and local previews.
export default defineConfig({
  base:'./',
  optimizeDeps:{include:['replicad','replicad-opencascadejs','jspdf','qrcode']},
  plugins:[{
    name:'cnc-cad-notices',
    apply:'build',
    generateBundle(){
      for(const pack of ['replicad','replicad-opencascadejs']){
        const entry=pack==='replicad'?join(dirname(require.resolve(pack)),'..','package.json'):require.resolve(pack+'/package.json');
        this.emitFile({type:'asset',fileName:`licenses/${pack}.txt`,source:readFileSync(join(dirname(entry),'LICENSE'))});
      }
    },
  }],
});
