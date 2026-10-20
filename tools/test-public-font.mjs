import {spawnSync} from 'node:child_process';
import {readFile,mkdtemp,access} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(root,'skills/research-html-presentation/scripts/scaffold_project.mjs');
const base=await mkdtemp(path.join(tmpdir(),'public-skill-font-'));
function scaffold(name,font){const target=path.join(base,name);const args=[script,'--mode','research-deck','--visual-style','tech-engineering-dark','--output',target];if(font)args.push('--display-font',font);const result=spawnSync(process.execPath,args,{encoding:'utf8',env:{...process.env,RESEARCH_HTML_PRESENTATION_FONT:''}});assert.equal(result.status,0,result.stderr);return target;}
const fallback=scaffold('fallback');
const css=await readFile(path.join(fallback,'src/poster-title.css'),'utf8');
assert.ok(!css.includes('@font-face'));
assert.ok(css.includes('KaiTi,serif'));
await assert.rejects(access(path.join(fallback,'public/fonts/shangwei-full.woff')));
let configured=false;
if(process.argv[2]){const licensed=scaffold('configured',path.resolve(process.argv[2]));const bytes=await readFile(path.join(licensed,'public/fonts/shangwei-full.woff'));assert.deepEqual(bytes,await readFile(path.resolve(process.argv[2])));assert.ok((await readFile(path.join(licensed,'src/poster-title.css'),'utf8')).includes('@font-face'));configured=true;}
console.log(JSON.stringify({passed:true,fallback:true,configured,base}));
