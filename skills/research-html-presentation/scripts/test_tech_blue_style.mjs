#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {withDeckPage} from './browser_helpers.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.resolve(process.argv[2]??path.join(root,'examples/tech-blue-reference-prototype'));
const typography=JSON.parse(await readFile(path.join(target,'asset-provenance.json'),'utf8')).coverTypography;
const checks=[];
function check(name,condition,detail=''){checks.push({name,passed:!!condition,detail});assert.ok(condition,`${name}: ${detail}`)}
await withDeckPage(target,async({page,baseUrl})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(baseUrl+'#/1',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 const cover=await page.evaluate(family=>{const t=document.querySelector('.refresh-cover .tech-cover-title'),i=document.querySelector('.concept-backdrop'),accent=t.querySelector('em');return{font:parseFloat(getComputedStyle(t).fontSize),accentFont:parseFloat(getComputedStyle(accent).fontSize),weight:getComputedStyle(t).fontWeight,imageWidth:i.getBoundingClientRect().width,imageTop:i.getBoundingClientRect().top,titleOverflow:t.scrollWidth>t.clientWidth+2,fontLoaded:document.fonts.check(`150px "${family}"`,'数智研析'),editableTitle:t.getAttribute('data-edit-id')}},typography.cssFamily);
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const {root:dom}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:dom.nodeId,selector:'.refresh-cover .tech-cover-title'});
 const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});await cdp.detach();
 check('cover uses the declared project font in actual rendered glyphs',cover.fontLoaded&&fonts.some(f=>f.isCustomFont&&f.glyphCount>0&&f.familyName===typography.renderedFamily),JSON.stringify(fonts));
 check('headline scale is reduced from rejected 180px while retaining hierarchy',cover.font<180&&cover.font>cover.accentFont*1.5&&cover.weight==='400',JSON.stringify(cover));
 check('custom title stays editable HTML',cover.editableTitle==='cover.title');
 check('cover subject canvas is reduced from rejected full width',cover.imageWidth<=1600*.8&&cover.imageTop>150,JSON.stringify(cover));
 check('cover text remains unclipped',!cover.titleOverflow);
 await page.goto(baseUrl+'#/2',{waitUntil:'networkidle'});
 const geometry=await page.evaluate(()=>{
  const active=document.querySelector('.slide.is-active'),body=active.querySelector('[data-slide-body]'),shelf=active.querySelector('.verification-shelf');
  const b=n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]};
  const inputs=[...active.querySelectorAll('.map-source')].map(n=>({position:getComputedStyle(n).position,box:b(n)}));
  const contours=[...body.querySelectorAll('[data-tech-shape]')].map(n=>{const s=getComputedStyle(n);return{role:n.getAttribute('data-tech-shape'),clip:s.clipPath,radius:s.borderRadius,background:s.backgroundImage,alpha:s.opacity}});
  return{inputs,shelf:b(shelf),contours,mainFill:getComputedStyle(active.querySelector('.map-associate')).backgroundImage,bodyOverflow:body.scrollWidth>body.clientWidth+1,text:[...active.querySelectorAll('.source-copy b,.source-copy>span,.map-associate p,.verification-copy p')].map(n=>({size:parseFloat(getComputedStyle(n).fontSize),opacity:getComputedStyle(n).opacity})),hint:b(document.querySelector('.control-discovery-hint')),takeaway:b(active.querySelector('.takeaway'))};
 });
 check('content uses distinct painted contours rather than only relabelled rectangles',new Set(geometry.contours.map(s=>s.clip+'|'+s.radius)).size>=4,JSON.stringify(geometry.contours));
 check('capsule nodes stay absolutely positioned above the shared shelf',geometry.inputs.length===4&&geometry.inputs.every(n=>n.position==='absolute'&&n.box[3]<geometry.shelf[1]),JSON.stringify(geometry.inputs));
 check('source nodes keep even model spacing',geometry.inputs.slice(1).every((n,i)=>Math.abs(n.box[1]-geometry.inputs[i].box[1]-78)<1));
 check('all ordinary node/support copy stays readable and opaque',geometry.text.every(n=>n.size>=18&&Number(n.opacity)===1),JSON.stringify(geometry.text));
 check('primary surface is translucent blue',/rgba\(/.test(geometry.mainFill),geometry.mainFill);
 check('no body overflow',!geometry.bodyOverflow);
 check('control hint stays below conclusion',geometry.hint[1]>=geometry.takeaway[3]);
 check('all model nodes and edges are rendered',await page.locator('.slide.is-active [data-flow-node]').count()===7&&await page.locator('.slide.is-active [data-flow-from]').count()===7);
 const labels=await page.locator('.slide.is-active [data-flow-node]').allTextContents();
 await page.emulateMedia({reducedMotion:'reduce'});
 check('reduced motion keeps the full relationship map',JSON.stringify(labels)===JSON.stringify(await page.locator('.slide.is-active [data-flow-node]').allTextContents()));
 await page.goto(baseUrl+'#/3',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/放大：本轮包含/}).click();
 check('actual current render can be enlarged',await page.locator('.lightbox img').getAttribute('src')==='./after-method.png');
 await page.keyboard.press('Escape');
 check('zoom returns to reading state',await page.locator('.lightbox').count()===0);
 const printUrl=new URL(baseUrl);printUrl.searchParams.set('print','1');
 await page.goto(printUrl.href,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.documentElement.dataset.deckReady==='true');
 await page.evaluate(()=>document.fonts.ready);
 const printCdp=await page.context().newCDPSession(page);await printCdp.send('DOM.enable');await printCdp.send('CSS.enable');
 const {root:printDom}=await printCdp.send('DOM.getDocument');const {nodeId:printNode}=await printCdp.send('DOM.querySelector',{nodeId:printDom.nodeId,selector:'.print-slide .tech-cover-title'});
 const printFonts=await printCdp.send('CSS.getPlatformFontsForNode',{nodeId:printNode});await printCdp.detach();
 check('deterministic print uses the same embedded cover font',printFonts.fonts.some(f=>f.isCustomFont&&f.glyphCount>0&&f.familyName===typography.renderedFamily),JSON.stringify(printFonts));
 check('print retains three pages and full relationship map',await page.locator('.print-slide').count()===3&&await page.locator('.print-slide [data-flow-node]').count()===7);
 check('print retains actual before/after renders',await page.locator('.print-slide img[src="./previous-method.png"]').count()===1&&await page.locator('.print-slide img[src="./after-method.png"]').count()===1);
 check('no application errors',errors.length===0,errors.join('\n'));
 const base=await readFile(path.join(root,'assets/react-template/presentation-core.css'),'utf8'),dark=await readFile(path.join(root,'assets/react-template/visual-styles/tech-engineering-dark.css'),'utf8');
 for(const style of ['academic-light',null]){
  const marker=style?` data-visual-style="${style}"`:'';
  await page.setContent(`<html${marker}><head><style>${base}</style></head><body><main${marker}><section class="slide is-active"><header class="slide-header"><h2 class="slide-title">科研证据</h2></header><p class="slide-lead">比较基线与结果</p></section><div class="report-runtime"><section class="report-section"><h2>研究材料</h2><p>来源与解释</p></section></div></main></body></html>`);
  const sample=()=>page.evaluate(()=>['.slide','.slide-title','.slide-header','.slide-lead','.report-runtime','.report-section h2'].map(q=>{const s=getComputedStyle(document.querySelector(q));return[s.color,s.backgroundImage,s.backgroundColor,s.fontSize,s.borderRadius,s.left,s.right,s.top,s.lineHeight]}));
  const before=await sample();await page.addStyleTag({content:dark});const after=await sample();
  check(style?'explicit light deck/report remains unchanged':'omitted-style deck/report remains unchanged',JSON.stringify(before)===JSON.stringify(after));
 }
});
const report={passed:checks.every(c=>c.passed),target,checks,note:'This is a design-prototype regression, not user approval, real research validation or final PDF approval.'};
await mkdir(path.join(target,'.deck-render'),{recursive:true});await writeFile(path.join(target,'.deck-render/tech-blue-regression.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
