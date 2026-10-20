#!/usr/bin/env node
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {validateAgainstContractSchema,resolveProjectContractPath} from './validate_schema_contracts.mjs';
import {buildDataHealth} from './build_data_health.mjs';
import {withDeckPage} from './browser_helpers.mjs';
const root=path.resolve(process.argv[2] ?? '.');
try {
  const manifest=JSON.parse(await readFile(path.join(root,'deck-manifest.json'),'utf8'));
  if(!manifest.dataHealth?.enabled){console.log(JSON.stringify({passed:true,status:'disabled'}));process.exit(0);}
  assert.equal(manifest.outputMode,'scroll-report');assert.equal(manifest.profile,'dataset-report');
  const report=JSON.parse(await readFile(resolveProjectContractPath(root,manifest.dataHealth.report),'utf8'));
  const result=await validateAgainstContractSchema('data-health.schema.json',report);assert.ok(result.passed,result.failures.join('\n'));
  if(report.status==='pending') assert.equal(manifest.scaffoldPlaceholder,true,'Pending diagnostics are allowed only in scaffold placeholders');
  else {
    const recomputed=await buildDataHealth(root,'data-health.config.json',{write:false});
    recomputed.provenance.generatedAt=report.provenance.generatedAt;
    assert.deepEqual(report,recomputed,'Stored health diagnostics differ from declared local inputs');
    for(const u of report.usage) if(u.sectionId)assert.ok(manifest.sections.some(s=>s.id===u.sectionId),'Unknown usage section');
  }
  if(process.argv.includes('--runtime')) await withDeckPage(root,async({page,baseUrl})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(baseUrl);await page.emulateMedia({reducedMotion:'reduce'});
    const storage=await page.evaluate(()=>JSON.stringify(localStorage));
    const open=page.getByRole('button',{name:'查看数据体检 ↗',exact:true});await open.click();
    const dialog=page.getByRole('dialog',{name:report.title});await assert.doesNotReject(()=>dialog.waitFor({state:'visible'}));
    const tabs=dialog.getByRole('tab');assert.equal(await tabs.count(),4);
    for(let i=0;i<4;i++){await tabs.nth(i).click();assert.equal(await tabs.nth(i).getAttribute('aria-selected'),'true');}
    if(report.status==='ready') {
      await tabs.nth(0).click();assert.equal(await dialog.locator('.data-health-stats dd').first().textContent(),report.summary.records===null?'未公开／未登记':report.summary.records.toLocaleString('zh-CN'));
      await tabs.nth(3).click();
      const jump=dialog.locator('a[href^="#"]').first();
      if(await jump.count()){const href=await jump.getAttribute('href');await jump.click();assert.equal(await dialog.isVisible(),false);assert.equal(new URL(page.url()).hash,href);await open.click();}
      const external=dialog.locator('a[href^="http"]').first();
      if(await external.count()){
        await page.context().route('https://example.org/**',route=>route.fulfill({status:200,body:'test source'}));
        const [popup]=await Promise.all([page.waitForEvent('popup'),external.click()]);assert.ok(popup.url().startsWith('http'));await popup.close();
        await external.focus();await page.keyboard.press('Tab');assert.equal(await dialog.getByRole('button',{name:'关闭数据体检'}).evaluate(n=>n===document.activeElement),true);
      }
    }
    if(process.argv.includes('--screenshots')){await mkdir(path.join(root,'.report-render'),{recursive:true});await tabs.nth(0).click();await page.screenshot({path:path.join(root,'.report-render/data-health-desktop.png')});}
    await tabs.nth(0).focus();await page.keyboard.press('ArrowRight');assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');
    await page.keyboard.press('End');assert.equal(await tabs.nth(3).getAttribute('aria-selected'),'true');
    await page.keyboard.press('Escape');assert.equal(await open.evaluate(n=>n===document.activeElement),true);
    for(const width of [390,320]) {
      await page.setViewportSize({width,height:844});await open.click();await tabs.nth(1).click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflow');
      assert.ok(await dialog.evaluate(n=>n.getBoundingClientRect().left>=0 && n.getBoundingClientRect().right<=innerWidth),'Dialog overflow');
      if(process.argv.includes('--screenshots') && width===390)await page.screenshot({path:path.join(root,'.report-render/data-health-mobile.png')});
      await page.keyboard.press('Escape');
    }
    await open.click();await page.emulateMedia({media:'print'});assert.equal(await dialog.isVisible(),false);
    await page.emulateMedia({media:'screen'});await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),storage,'Health inspection changed notes/authoring storage');
    await page.goto(baseUrl+'?print=1');assert.equal(await page.locator('[data-data-health]').count(),0);
    assert.deepEqual(errors,[]);
  });
  console.log(JSON.stringify({passed:true,status:report.status,runtime:process.argv.includes('--runtime')}));
} catch(e) {console.error(JSON.stringify({passed:false,error:e.message}));process.exitCode=1;}
