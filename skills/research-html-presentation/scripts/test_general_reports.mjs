#!/usr/bin/env node
import { readFile, writeFile, mkdtemp, mkdir, cp } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const scripts=path.join(skill,"scripts"), examples=path.join(skill,"examples","general-scroll-report");
const temporary=await mkdtemp(path.join(os.tmpdir(),"general-report-contract-"));
const checks=[];
const record=(name,passed,detail="")=>checks.push({name,passed,detail});
const run=(name,script,args,expected=0,token)=>{
 const result=spawnSync(process.execPath,[path.join(scripts,script),...args],{encoding:"utf8"});
 const output=(result.stdout??"")+(result.stderr??"");
 record(name,result.status===expected&&(!token||output.includes(token)),result.status===expected?"expected exit code "+expected:output.slice(-1600));
 return result;
};
for(const name of ["work-report","materials-review","mixed-report"]){
 const manifest=path.join(examples,name,"deck-manifest.json");
 run(name+" content/manifest", "validate_manifest.mjs",[manifest]);
 run(name+" citations", "validate_citations.mjs",[path.dirname(manifest)]);
 const content=JSON.parse(await readFile(path.join(examples,name,"report-content.json"),"utf8"));
 record(name+" genuine generic route",JSON.parse(await readFile(manifest,"utf8")).profile!=="dataset-report"&&content.sections.work.blocks.length>0);
}
for(const profile of ["work-report","literature-review","project-review"]){
 const project=path.join(temporary,profile);
 run(profile+" scaffold", "scaffold_project.mjs",["--mode","general-scroll-report","--profile",profile,"--output",project,"--no-authoring"]);
 const manifest=JSON.parse(await readFile(path.join(project,"deck-manifest.json"),"utf8"));
 record(profile+" form marker",manifest.outputMode==="scroll-report"&&manifest.outputFormVersion===1);
 record(profile+" no automatic analytical helpers",![manifest.analysisCompanion,manifest.dataHealth,manifest.analysisFlow].some(item=>item?.enabled));
 run(profile+" scaffold contract", "validate_manifest.mjs",[path.join(project,"deck-manifest.json")]);
}
const invalid=path.join(temporary,"invalid-progress");await cp(path.join(examples,"mixed-report"),invalid,{recursive:true});
const contentFile=path.join(invalid,"report-content.json"),content=JSON.parse(await readFile(contentFile,"utf8"));
const progress=content.sections.work.blocks.find(block=>block.type==="progress");progress.completed=progress.total+1;await writeFile(contentFile,JSON.stringify(content));
run("invalid progress is rejected", "validate_manifest.mjs",[path.join(invalid,"deck-manifest.json")],1,"completed progress exceeds its stated total");
const invalidTable=path.join(temporary,"invalid-comparison");await cp(path.join(examples,"materials-review"),invalidTable,{recursive:true});
const tableFile=path.join(invalidTable,"report-content.json"),tableContent=JSON.parse(await readFile(tableFile,"utf8"));
tableContent.sections.work.blocks.find(block=>block.type==="comparison").rows[0].cells.pop();await writeFile(tableFile,JSON.stringify(tableContent));
run("incomplete comparison is rejected", "validate_manifest.mjs",[path.join(invalidTable,"deck-manifest.json")],1,"different number of cells than columns");
const legacy=path.join(temporary,"legacy");await cp(path.join(skill,"fixtures","valid-minimal-deck"),legacy,{recursive:true});
const legacyFile=path.join(legacy,"deck-manifest.json"),legacyManifest=JSON.parse(await readFile(legacyFile,"utf8"));
delete legacyManifest.outputMode;delete legacyManifest.outputFormVersion;await writeFile(legacyFile,JSON.stringify(legacyManifest));
run("omitted legacy mode remains 16:9", "validate_manifest.mjs",[legacyFile],0,'"outputMode": "slide-deck"');
legacyManifest.outputFormVersion=1;await writeFile(legacyFile,JSON.stringify(legacyManifest));
run("new form marker requires explicit mode", "validate_manifest.mjs",[legacyFile],1,"outputMode");
const previousNewProject=path.join(temporary,"previous-new-project");
run("16:9 work profile scaffold", "scaffold_project.mjs",["--mode","research-deck","--profile","work-report","--output",previousNewProject,"--no-authoring"]);
const previousManifestFile=path.join(previousNewProject,"deck-manifest.json"),previousManifest=JSON.parse(await readFile(previousManifestFile,"utf8"));
delete previousManifest.outputMode;delete previousManifest.outputFormVersion;await writeFile(previousManifestFile,JSON.stringify(previousManifest));
run("pre-extension newProject marker also retains omitted-mode compatibility", "validate_manifest.mjs",[previousManifestFile],0,'"outputMode": "slide-deck"');
run("invalid general profile rejected", "scaffold_project.mjs",["--mode","general-scroll-report","--profile","dataset-report","--output",path.join(temporary,"wrong-profile")],2,"--profile must match");
run("dataset mode cannot disguise work report", "scaffold_project.mjs",["--mode","dataset-scroll-report","--profile","work-report","--output",path.join(temporary,"disguised")],2,"--profile must match");
const passed=checks.every(check=>check.passed);
console.log(JSON.stringify({passed,checks,temporary},null,2));process.exit(passed?0:1);
