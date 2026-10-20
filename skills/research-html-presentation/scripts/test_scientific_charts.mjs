#!/usr/bin/env node
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let esbuild;for(const name of [process.env.ESBUILD_PATH,path.join(process.cwd(),'node_modules/esbuild'),'esbuild'].filter(Boolean)){try{esbuild=require(name);break;}catch{}}
if(!esbuild){try{const local=createRequire(path.join(process.cwd(),'package.json'));esbuild=local(local.resolve('esbuild',{paths:[local.resolve('vite')]}));}catch{}}
if(!esbuild)throw new Error('Use a project with local esbuild/Vite dependencies or set ESBUILD_PATH. No download is performed.');
const dir=await mkdtemp(path.join(tmpdir(),'scientific-chart-test-'));
try{
 const entry=path.join(root,'assets/react-template/dataset-charts');
 await esbuild.build({stdin:{contents:`export * from ${JSON.stringify(path.join(entry,'scientific-options.ts'))};export * from ${JSON.stringify(path.join(entry,'scientific-models.ts'))};export * from ${JSON.stringify(path.join(root,'assets/react-template/chart-adapters/academic-theme.ts'))};`,resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'models.mjs')});
 const m=await import(pathToFileURL(path.join(dir,'models.mjs')));
 const bins=[{bin:'A',group:'g',count:0},{bin:'B',group:'g',count:null}];
 assert.equal(m.distributionValue(bins,'A','g'),0);assert.equal(m.distributionValue(bins,'B','g'),null);assert.equal(m.distributionValue(bins,'C','g'),null);assert.equal(m.distributionValue(bins,'C','g','zero'),0);assert.equal(m.distributionValue(bins,'B','g','zero'),null);
 assert.equal(m.slopeAxis().inverse,false);assert.equal(m.slopeAxis('rank').inverse,true);assert.equal(m.slopeAxis().minInterval,undefined);
 const interval={kind:'CI',level:.95,method:'supplied validated model',samplingUnit:'person'};
 const rows=[{label:'A',estimate:2,lower:1,upper:3,n:20}];
 for(const style of ['academic-light','tech-engineering-dark']){
  const c=m.coefficientOption({rows,interval,xLabel:'effect',reference:0,visualStyle:style});assert.deepEqual(c.series[0].data,[[0,1,3,2]]);assert.equal(c.series[1].markLine.data[0].xAxis,0);
  const p=m.chartPaletteForVisualStyle(style);assert.equal(p.diverging.length,3);assert.notEqual(p.diverging[0],p.diverging[2]);assert.notDeepEqual(p.diverging,p.sequential);
 }
 assert.throws(()=>m.coefficientOption({rows:[{...rows[0],lower:3}],interval,xLabel:'x',reference:0}),/Interval/);
 assert.throws(()=>m.coefficientOption({rows:[{...rows[0],lower:0}],interval,xLabel:'x',reference:1,scale:'log'}),/positive/);
 assert.throws(()=>m.coefficientOption({rows,interval:{...interval,method:''},xLabel:'x',reference:0}),/Declare/);
 const point=(time,v)=>({time,estimate:v,lower:v===null?null:v-1,upper:v===null?null:v+1,n:v===null?0:10});
 const trend=m.trendOption({points:[point('1',2),point('2',3),point('3',null),point('4',6)],interval,yLabel:'y'});
 assert.equal(trend.series[0].data.length,1);assert.deepEqual(trend.series[1].data,[2,3,null,6]);assert.equal(trend.series[1].connectNulls,false);
 assert.throws(()=>m.trendOption({points:[{...point('1',2),upper:null}],interval,yLabel:'y'}),/Missing/);
 const paired=m.pairedOption({observations:[{id:'1',before:0,after:1},{id:'2',before:2,after:null}],labels:['before','after'],yLabel:'y'});assert.equal(paired.series.length,1);assert.deepEqual(paired.series[0].data,[0,1]);
 assert.throws(()=>m.pairedOption({observations:[{id:'1',before:0,after:1},{id:'1',before:2,after:3}],labels:['a','b'],yLabel:'y'}),/unique/);
 assert.equal(m.jitterForId('stable'),m.jitterForId('stable'));assert.ok(Math.abs(m.jitterForId('stable'))<=.16);
 assert.throws(()=>m.distributionOption({observations:[{id:'a',group:'A',value:1}],summaries:[{group:'A',low:1,q1:1,median:1,q3:1,high:1,n:2}],yLabel:'y'}),/match/);
 assert.throws(()=>m.regressionOption({observations:[{id:'a',x:1,y:4,fitted:2,residual:9}],fit:[],interval,xLabel:'x',yLabel:'y'}),/Residual/);
 console.log('PASS: missing/zero, numeric/rank orientation, semantic palettes, interval/log geometry, CI metadata, missing trend segments, complete pairs, IDs/n and residual integrity.');
}finally{await rm(dir,{recursive:true,force:true});}
