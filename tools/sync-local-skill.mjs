#!/usr/bin/env node
import {cp, access} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source=path.join(root,'skills/research-html-presentation');
const destination=path.join(process.env.CODEX_HOME || path.join(homedir(),'.codex'),'skills/research-html-presentation');
await access(path.join(source,'SKILL.md'));
if(path.resolve(source)===path.resolve(destination)) throw Error('Source and installed directory must differ');
await cp(source,destination,{recursive:true,force:true,filter:entry=>!entry.split(path.sep).some(part=>['node_modules','.git','dist','__pycache__'].includes(part))});
console.log(JSON.stringify({source,destination,preserved:'Private local files absent from the repository are retained.'},null,2));
