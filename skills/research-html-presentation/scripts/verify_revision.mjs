#!/usr/bin/env node
import {readFile,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(process.argv[2]??process.cwd());
const args=process.argv.slice(3),kind=args[args.indexOf('--kind')+1];
if(!args.includes('--kind')||!['copy','layout','interaction','data'].includes(kind)){console.error('Usage: verify_revision.mjs <project> --kind copy|layout|interaction|data [--plan]');process.exit(2)}
const scripts=path.dirname(fileURLToPath(import.meta.url));
const manifestFile=path.join(root,'deck-manifest.json');
const manifest=JSON.parse(await readFile(manifestFile,'utf8'));
const scroll=manifest.outputMode==='scroll-report',steps=[];
const exists=file=>access(file).then(()=>true).catch(()=>false);
const add=(label,script,args=[])=>steps.push({label,script,args});
if(kind==='data')add('full verification after analysis refresh','verify_project.mjs',[root,'--runtime','--render']);
else{
 add('manifest','validate_manifest.mjs',[manifestFile]);
 add('audience copy','validate_audience_copy.mjs',[root,manifestFile]);
 if(await exists(path.join(root,'presentation-edit-patch.json')))add('edit patch','validate_edit_patch.mjs',[root]);
 if(manifest.authoring?.enabled)add('editor save/reload','validate_editor_runtime.mjs',[root]);
 if(kind==='interaction'){
  if(!scroll)add('output runtime','validate_runtime_contract.mjs',[root,manifestFile]);
  if(scroll&&manifest.analysisFlow?.enabled)add('analysis flow','validate_analysis_flow.mjs',[root,'--runtime']);
  if(scroll&&manifest.dataHealth?.enabled)add('data health','validate_data_health.mjs',[root,'--runtime']);
 }
 add('layout','audit_layout.mjs',[root]);
 if(kind==='layout'||kind==='interaction')add('render',scroll?'render_report.mjs':'render_deck.mjs',[root]);
 if(scroll)add('report runtime and deterministic print','validate_report_runtime_contract.mjs',[root,manifestFile]);
}
const plan={project:root,purpose:'local-revision-check',formalRelease:false,kind,steps,notes:kind==='data'?['Recompute affected analyses from registered source data before running this verifier.']:['Build the changed project first. Reuse only unchanged, previously verified analysis results.','Copy changes that alter a claim, number, unit, denominator, source, method or interpretation require evidence rechecking and the data/full path.','Formal publication, final export and changed scientific evidence still require the full mode-aware verifier.']};
if(args.includes('--plan')){console.log(JSON.stringify(plan,null,2));process.exit(0)}
const results=[];
for(const step of steps){
 const result=await new Promise(resolve=>{
  const child=spawn(process.execPath,[path.join(scripts,step.script),...step.args],{cwd:root,stdio:['ignore','pipe','pipe']});let detail='';
  child.stdout.on('data',chunk=>detail+=chunk);child.stderr.on('data',chunk=>detail+=chunk);
  child.on('error',error=>resolve({label:step.label,status:'unavailable',detail:error.message}));
  child.on('close',code=>resolve({label:step.label,status:code===0?'passed':'failed',detail:detail.trim().slice(-6000)}));
 });results.push(result);
}
const passed=results.every(result=>result.status==='passed');
console.log(JSON.stringify({...plan,steps:results,passed},null,2));process.exit(passed?0:1);
