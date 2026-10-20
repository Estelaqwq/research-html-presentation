#!/usr/bin/env node
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root=path.resolve(process.argv[2] ?? process.cwd());
const at=process.argv.indexOf("--output");
const output=at>=0?path.resolve(process.argv[at+1]):path.join(root,"offline","index.html");
const manifest=JSON.parse(await readFile(path.join(root,"deck-manifest.json"),"utf8"));
if(manifest.outputMode!=="scroll-report")throw Error("Offline report export requires explicit outputMode=scroll-report");
if(manifest.analysisCompanion?.llm?.enabled)throw Error("Server model Q&A cannot run offline. Disable its server option before exporting; the report content remains unchanged.");
if(output===path.join(root,"index.html"))throw Error("Do not replace the source HTML entry; use offline/index.html or another explicit output");
await access(path.join(root,"src","main.tsx"));
const projectRequire=createRequire(path.join(root,"package.json"));
let vite;
try { vite=await import(pathToFileURL(projectRequire.resolve("vite")).href); }
catch { throw Error("Install the project's declared Vite dependencies before exporting; no global install is performed."); }
const api=typeof vite.build==="function"?vite:vite.default;
if(typeof api?.build!=="function")throw Error("The installed Vite package does not expose its public build API");
const result=await api.build({root,configFile:path.join(root,"vite.config.ts"),mode:"production",define:{"process.env.NODE_ENV":JSON.stringify("production")},build:{write:false,copyPublicDir:false,cssCodeSplit:false,assetsInlineLimit:Number.MAX_SAFE_INTEGER,lib:{entry:path.join(root,"src","main.tsx"),name:"AcademicReport",formats:["iife"]},rollupOptions:{output:{inlineDynamicImports:true}}}});
const outputs=(Array.isArray(result)?result:[result]).flatMap(item=>item.output ?? []);
let js=outputs.filter(item=>item.type==="chunk").map(item=>item.code).join("\n");
let css=outputs.filter(item=>item.type==="asset"&&item.fileName.endsWith(".css")).map(item=>String(item.source)).join("\n");
if(!js)throw Error("The shared report entry produced no JavaScript bundle");
const mime={".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".gif":"image/gif",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".avif":"image/avif"};
async function inlinePublic(directory,relative=""){
 let entries;try{entries=await readdir(directory,{withFileTypes:true})}catch{return}
 for(const item of entries){
  const rel=path.posix.join(relative,item.name),file=path.join(directory,item.name);
  if(item.isDirectory()){await inlinePublic(file,rel);continue}
  const type=mime[path.extname(item.name).toLowerCase()];if(!type)continue;
  const forms=[rel,"./"+rel,"/"+rel];
  const used=forms.some(form=>js.includes(JSON.stringify(form))||css.includes(form));if(!used)continue;
  const data="data:"+type+";base64,"+(await readFile(file)).toString("base64");
  for(const form of forms){js=js.split(JSON.stringify(form)).join(JSON.stringify(data));css=css.split(`url("${form}")`).join(`url("${data}")`).split(`url('${form}')`).join(`url("${data}")`).split(`url(${form})`).join(`url("${data}")`)}
 }
}
await inlinePublic(path.join(root,"public"));
const escape=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const html=`<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="offline-report" content="shared-source"><title>${escape(manifest.title)}</title><style>${css.replace(/<\/style/gi,"<\\/style")}</style></head><body><div id="root"></div><script>${js.replace(/<\/script/gi,"<\\/script")}</script></body></html>\n`;
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,html,"utf8");
// The ordinary static preview can download this same immutable offline base.
// Never copy raw data or a browser's live edited DOM into the distribution.
const previewBase=path.join(root,"dist","offline.html");
let hasPreview = false;
try { await access(path.join(root,"dist","index.html")); hasPreview = true; } catch { /* standalone export can run without an ordinary build */ }
if(hasPreview && path.resolve(output)!==previewBase) await writeFile(previewBase,html,"utf8");

console.log(JSON.stringify({output,bytes:Buffer.byteLength(html),entry:"src/main.tsx",runtime:"ReportRuntime",source:"same sections and components",authoring:manifest.authoring?.enabled===true?"browser-local fallback":"disabled"}));
