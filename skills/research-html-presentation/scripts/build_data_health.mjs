#!/usr/bin/env node
// Local-only audit. Input rows never become browser assets.
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const hash = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const missing = v => v === null || v === undefined || (typeof v === 'string' && !v.trim());
const get = (row, field) => field.split('.').reduce((v, k) => v?.[k], row);
export function quantile(values, p) { const a = [...values].sort((a,b) => a-b); const n = (a.length-1)*p; return a[Math.floor(n)] + (a[Math.ceil(n)]-a[Math.floor(n)])*(n-Math.floor(n)); }
const valid = (v,f) => !missing(v) && (f.type === 'number' ? typeof v === 'number' && Number.isFinite(v) && (f.minimum === undefined || v >= f.minimum) && (f.maximum === undefined || v <= f.maximum) : f.type === 'boolean' ? typeof v === 'boolean' : typeof v === 'string');
export function profileRows(rows, config) {
  if (!Array.isArray(rows) || rows.some(r => !r || Array.isArray(r) || typeof r !== 'object')) throw Error('rows must be an array of objects');
  if (config.privacy?.publicAggregates !== true) throw Error('Explicit privacy clearance publicAggregates=true is required; raw rows remain local');
  const floor = config.privacy.minCellSize ?? 1;
  if (!Number.isInteger(floor) || floor < 1) throw Error('minCellSize must be a positive integer');
  const count = n => n === 0 || n >= floor ? n : null;
  const fields = config.fields;
  if (!fields?.length || new Set(fields.map(f=>f.id)).size !== fields.length || fields.some(f => !f.id || !f.path || !f.label || !['number','string','boolean'].includes(f.type))) throw Error('Declare unique field IDs, paths, labels and types');
  if ((config.keyFields ?? []).some(k => !fields.some(f => f.path === k))) throw Error('keyFields must use declared field paths');
  const keys = new Map(); let incompleteKeys = 0;
  for (const row of rows) {
    if (!config.keyFields?.length) break;
    const parts = config.keyFields.map(k=>get(row,k));
    if (parts.some(missing)) { incompleteKeys++; continue; }
    const key = JSON.stringify(parts); keys.set(key,(keys.get(key) ?? 0)+1);
  }
  const duplicates = [...keys.values()].filter(n=>n>1);
  const anomalies = [];
  const fieldResults = fields.map(f => {
    const values = rows.map(r=>get(r,f.path));
    const usable = values.filter(v=>valid(v,f));
    const blanks = values.filter(missing).length;
    if (f.anomaly && f.anomaly !== 'iqr') throw Error('Only explicit level IQR is supported by this generic profiler');
    if (f.anomaly === 'iqr') {
      if (f.type !== 'number') throw Error('IQR requires a numerical field');
      // Aggregated count only: never expose row identifiers or outlier values.
      if (usable.length >= Math.max(8,floor)) {
        const q1 = quantile(usable,.25), q3 = quantile(usable,.75), spread=q3-q1;
        const lower=q1-1.5*spread, upper=q3+1.5*spread, tolerance=Math.max(1,Math.abs(q1),Math.abs(q3))*1e-10;
        anomalies.push({ fieldId:f.id, label:f.label, method:'数值水平 IQR：线性插值四分位数，低于 Q1−1.5×IQR 或高于 Q3+1.5×IQR；至少 8 个有效值。', checked:count(usable.length), flagged:count(usable.filter(v=>v<lower-tolerance || v>upper+tolerance).length), status:'checked' });
      } else anomalies.push({fieldId:f.id,label:f.label,method:'数值水平 IQR；至少 8 个有效值。',checked:count(usable.length),flagged:null,status:'insufficient'});
    }
    return {id:f.id,label:f.label,unit:f.unit ?? '',type:f.type,records:count(rows.length),valid:count(usable.length),missing:count(blanks),invalid:count(values.length-blanks-usable.length)};
  });
  const coverage=[];
  if (config.time) {
    const {fieldId,periods,groupFieldId,groups} = config.time;
    const timeField=fields.find(f=>f.id===fieldId), groupField=fields.find(f=>f.id===groupFieldId);
    if (!timeField || !periods?.length || new Set(periods).size!==periods.length || (groupFieldId && (!groupField || !groups?.length))) throw Error('time coverage needs a declared time field, unique expected periods and declared groups');
    for(const group of groupField ? groups : [{id:'all',label:'全部记录'}]) {
      if (!group.id || !group.label) throw Error('groups require display IDs and approved labels');
      const subset=groupField ? rows.filter(r=>get(r,groupField.path)===group.value) : rows;
      const observed=new Set(subset.map(r=>get(r,timeField.path)));
      coverage.push({groupId:group.id,label:group.label,periods:periods.map(p=>({period:String(p),records:count(subset.filter(r=>get(r,timeField.path)===p).length)})),outsidePeriods:count(subset.filter(r=>!periods.includes(get(r,timeField.path))).length),missingPeriods:count(periods.filter(p=>!observed.has(p)).length)});
    }
  }
  const usage=(config.usage ?? []).map(u=>{
    if(!u.analysisId || !u.label || !u.scope || !u.reason) throw Error('usage requires analysisId, label, scope and reason');
    const indices=u.rowIndices;
    if(indices !== undefined && (!Array.isArray(indices) || new Set(indices).size!==indices.length || indices.some(i=>!Number.isInteger(i)||i<0||i>=rows.length))) throw Error('usage rowIndices must be unique local input row indices');
    return {analysisId:u.analysisId,label:u.label,scope:u.scope,reason:u.reason,status:indices === undefined ? 'unregistered' : 'registered',used:indices === undefined ? null : count(indices.length),notSelected:indices === undefined ? null : count(rows.length-indices.length),...(u.sectionId ? {sectionId:u.sectionId}: {})};
  });
  return {schemaVersion:1,status:'ready',title:config.title ?? '数据体检',summary:{records:count(rows.length),duplicateExtraRecords:config.keyFields?.length ? count(duplicates.reduce((n,k)=>n+k-1,0)):null,duplicateKeyGroups:config.keyFields?.length ? count(duplicates.length):null,incompleteKeyRecords:config.keyFields?.length ? count(incompleteKeys):null},fields:fieldResults,coverage,anomalies,usage,limitations:['完整覆盖不能证明每个数值准确。','异常提示不是错误判定，不自动填补、删除或重新分析。','各分析可能重复使用同一记录，使用数量不可相加。',...(floor>1 ? [`小于 ${floor} 的非零计数已隐藏；“未公开”不等于零。`] : []),...(config.limitations ?? [])]};
}

export async function localPath(root, relative) {
  if(typeof relative !== 'string' || !relative || path.isAbsolute(relative)) throw Error('Paths must be project-relative');
  const base=await realpath(root), target=path.resolve(base,relative);
  if(!target.startsWith(base+path.sep)) throw Error('Path escapes project');
  // Also reject symlink escapes, including output parent directories.
  const existing=await realpath(target).catch(()=>realpath(path.dirname(target)));
  if(existing!==base && !existing.startsWith(base+path.sep)) throw Error('Symlink escapes project');
  return target;
}
export async function buildDataHealth(root, configPath='data-health.config.json', {write=true}={}) {
  root=await realpath(root);
  const manifest=JSON.parse(await readFile(path.join(root,'deck-manifest.json'),'utf8'));
  if(manifest.profile!=='dataset-report' || manifest.outputMode!=='scroll-report' || manifest.dataHealth?.enabled!==true) throw Error('Enable dataHealth only in a dataset scroll report');
  const config=JSON.parse(await readFile(await localPath(root,configPath),'utf8'));
  const registry=JSON.parse(await readFile(await localPath(root,manifest.evidenceRegistry ?? 'evidence-visuals.json'),'utf8'));
  const dataset=registry.datasets?.find(d=>d.datasetId===config.datasetId);
  if(!dataset || dataset.privacyReview!=='cleared') throw Error('Dataset must exist in Shared Evidence Core and have privacyReview=cleared');
  const citations=JSON.parse(await readFile(await localPath(root,manifest.citationRegistry ?? 'citations.json'),'utf8'));
  if(!config.sourceIds?.length || config.sourceIds.some(id=>!citations.citations?.some(c=>c.citationId===id))) throw Error('sourceIds must reference existing CitationRegistry IDs');
  const rawPath=await localPath(root,config.rawPath), rowsPath=await localPath(root,config.rowsPath);
  for(const p of [rawPath,rowsPath]) if(['public','src','dist','build'].includes(path.relative(root,p).split(path.sep)[0])) throw Error('Raw/audit inputs must stay outside browser source and public directories');
  const raw=await readFile(rawPath); if(hash(raw)!==dataset.sourceHash) throw Error('Raw source hash does not match dataset registry');
  const input=await readFile(rowsPath);
  if(hash(input)!==config.rowsHash) throw Error('Audit rows hash mismatch; regenerate the local input manifest');
  if(config.rawPath!==dataset.sourceRef) throw Error('rawPath must use the existing dataset sourceRef');
  if(config.rawPath!==config.rowsPath && (!config.transformIds?.length || config.transformIds.some(id=>!registry.transforms?.some(t=>t.transformId===id && t.datasetId===config.datasetId)))) throw Error('Normalized rows require existing transform IDs');
  if(config.usage?.some(u=>!registry.analyses?.some(a=>a.analysisId===u.analysisId && a.datasetId===config.datasetId))) throw Error('Unknown AnalysisRecord ID');
  const report=profileRows(JSON.parse(input),config);
  report.provenance={datasetId:config.datasetId,sourceIds:config.sourceIds,sourceHash:dataset.sourceHash,rowsHash:hash(input),transformIds:config.transformIds ?? [],generatedAt:new Date().toISOString()};
  const output=await localPath(root,manifest.dataHealth.report);
  const protectedPaths=[rawPath,rowsPath,await localPath(root,configPath),path.join(root,'deck-manifest.json'),await localPath(root,manifest.evidenceRegistry ?? 'evidence-visuals.json'),await localPath(root,manifest.citationRegistry ?? 'citations.json')];
  if(protectedPaths.includes(output) || !output.endsWith('.json')) throw Error('Output cannot overwrite input or evidence and must be JSON');
  if(write) await writeFile(output,JSON.stringify(report,null,2)+'\n'); return report;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const r=await buildDataHealth(path.resolve(process.argv[2] ?? '.'),process.argv[3]);console.log(JSON.stringify({passed:true,status:r.status,fields:r.fields.length}));}
  catch(e){console.error(e.message);process.exitCode=1;}
}
