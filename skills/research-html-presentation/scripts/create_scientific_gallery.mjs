#!/usr/bin/env node
import {cp,mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const args=process.argv.slice(2),output=args[args.indexOf('--output')+1];
if(args.includes('--help')){console.log('Usage: node create_scientific_gallery.mjs --output <new-directory>');process.exit(0);}
if(!args.includes('--output')||!output){console.error('--output is required');process.exit(2);}
const root=path.resolve(output),skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{await stat(root);throw new Error(`Refusing existing output: ${root}`);}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(root,{recursive:true});
await cp(path.join(skill,'assets/scientific-plot-gallery'),root,{recursive:true});
await cp(path.join(skill,'assets/react-template'),path.join(root,'runtime'),{recursive:true});
await cp(path.join(skill,'assets/branding/zuel-logo.png'),path.join(root,'zuel-logo.png'));
await writeFile(path.join(root,'main.tsx'),"import React from 'react';import {createRoot} from 'react-dom/client';import App from './App';createRoot(document.getElementById('root')!).render(<App/>);");
await writeFile(path.join(root,'index.html'),'<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>科研绘图升级 · 六组对照图库</title></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>');
await writeFile(path.join(root,'package.json'),JSON.stringify({private:true,type:'module',scripts:{dev:'vite --host 127.0.0.1',build:'tsc --noEmit && vite build'},dependencies:{react:'^18.3.1','react-dom':'^18.3.1',echarts:'^6.1.0'},devDependencies:{vite:'^5.4.14',typescript:'^5.7.2','@types/react':'^18.3.12','@types/react-dom':'^18.3.1'}},null,2));
await writeFile(path.join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',lib:['ES2022','DOM','DOM.Iterable'],skipLibCheck:true,esModuleInterop:true,strict:true,module:'ESNext',moduleResolution:'Bundler',resolveJsonModule:true,isolatedModules:true,noEmit:true,jsx:'react-jsx'},include:['App.tsx','main.tsx']},null,2));
await writeFile(path.join(root,'vite.config.mjs'),"import {defineConfig} from 'vite';export default defineConfig({base:'./',build:{assetsInlineLimit:1000000,cssCodeSplit:false,rollupOptions:{output:{inlineDynamicImports:true}}}});");
console.log(`Created source gallery: ${root}\nUse local dependencies or install package.json dependencies, then npm run build. No dependencies were downloaded.`);
