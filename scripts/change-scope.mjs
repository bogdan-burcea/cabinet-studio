import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync,readlinkSync} from 'node:fs';
import path from 'node:path';
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();process.chdir(root);
const statePath='work/change-scope.json';
const excluded=p=>['work/','mockups/','dist/','node_modules/'].some(prefix=>p.startsWith(prefix));
function snapshot(){const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(p=>p&&!excluded(p));return Object.fromEntries([...new Set(files)].filter(existsSync).sort().map(file=>[file,createHash('sha256').update(lstatSync(file).isSymbolicLink()?readlinkSync(file):readFileSync(file)).digest('hex')]));}
const [command,name,...paths]=process.argv.slice(2);
if(command==='start'){
 if(!name||!(/^[a-z0-9_-]+$/i.test(name))||!paths.length)throw Error('Usage: npm run scope -- start task-name path/to/file [more exact files]');
 if(existsSync(statePath))throw Error('An active scope exists. Check it, then finish it before starting another task.');
 const allowed=paths.map(p=>{const value=path.relative(root,path.resolve(p)).split(path.sep).join('/');if(!value||value.startsWith('../')||path.isAbsolute(value))throw Error('Allow exact repository files only.');return value;});
 mkdirSync('work',{recursive:true});writeFileSync(statePath,JSON.stringify({task:name,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),allowed,files:snapshot()},null,2));console.log(`Started ${name}; ${allowed.length} allowed files. Existing local changes are included in the baseline.`);
}else if(command==='check'||command==='finish'){
 const state=JSON.parse(readFileSync(statePath,'utf8')),now=snapshot(),changed=[...new Set([...Object.keys(state.files),...Object.keys(now)])].filter(p=>state.files[p]!==now[p]),outside=changed.filter(p=>!state.allowed.includes(p));
 if(outside.length){console.error(`Scope violation (${state.task}):\n${outside.join('\n')}`);process.exitCode=1;}else{console.log(`Scope passed (${state.task}): ${changed.length} changed files, all allowed.`);if(command==='finish'){const {renameSync}=await import('node:fs');renameSync(statePath,`work/change-scope-${state.task}-completed.json`);}}
}else throw Error('Use start, check or finish. The baseline includes pre-existing dirty files and never modifies Git or source files.');
