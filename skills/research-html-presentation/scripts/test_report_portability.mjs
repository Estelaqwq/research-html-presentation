#!/usr/bin/env node
// Runs only in isolated browser contexts; never writes the project's patch.
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {withDeckPage} from './browser_helpers.mjs';

const root=path.resolve(process.argv[2] ?? '.');
const out=path.join(root,'.report-render','portability');
await mkdir(out,{recursive:true});
const ready=async p=>{
  await p.waitForFunction(()=>document.documentElement.dataset.reportReady==='true');
  await p.waitForFunction(()=>Number(document.querySelector('[data-editor-registry-field-count]')?.getAttribute('data-editor-registry-field-count'))>1);
  await p.waitForTimeout(200);
};
const checks=[];
await withDeckPage(root,async({page,baseUrl})=>{
  page.on('dialog',d=>d.accept());
  await page.goto(baseUrl);await ready(page);
  const copy=page.locator('p[data-edit-id]').filter({has:page.locator('strong')}).first();
  assert.ok(await copy.count(),'Fixture must contain an editable paragraph with inline emphasis');
  const id=await copy.getAttribute('data-edit-id');
  const original=await copy.textContent();
  const strongs=await copy.locator('strong').allTextContents();
  const edited=original.replace(strongs[0],strongs[0]+'（核对）')+' 已复核。';
  await page.locator('[data-editor-toggle]').click();
  await copy.fill(edited);
  await page.locator('[data-editor-action=save]').click();
  await page.getByRole('status').filter({hasText:'已保存'}).waitFor();
  assert.equal(await copy.textContent(),edited);
  assert.equal(await copy.locator('strong').count(),strongs.length);
  await page.reload();await ready(page);
  const reopened=page.locator(`[data-edit-id="${id}"]`).first();
  assert.equal(await reopened.textContent(),edited);
  assert.equal(await reopened.locator('strong').count(),strongs.length);
  checks.push('native plain-text edit preserves emphasis before and after reload');
  await page.locator('[data-editor-toggle]').click();
  await page.getByRole('button',{name:'撤销',exact:true}).click(); // reload has empty history
  const jsonDownload=page.waitForEvent('download');
  await page.locator('[data-editor-action=export-changes]').click();
  const jsonFile=path.join(out,'changes.json');await (await jsonDownload).saveAs(jsonFile);
  const htmlDownload=page.waitForEvent('download');
  await page.locator('[data-editor-action=export-html]').click();
  const htmlFile=path.join(out,'modified.html');await (await htmlDownload).saveAs(htmlFile);
  const browser=page.context().browser();
  const ctx=await browser.newContext();await ctx.setOffline(true);
  const fresh=await ctx.newPage();fresh.on('dialog',d=>d.accept());
  const fileUrl=pathToFileURL(htmlFile).href;
  for(const suffix of ['', '?print=1','?presenter=1']){
    await fresh.goto(fileUrl+suffix);await ready(fresh);
    const target=fresh.locator(`[data-edit-id="${id}"]`).first();
    await assert.doesNotReject(()=>target.filter({hasText:edited}).waitFor());
    assert.equal(await target.textContent(),edited);
    assert.equal(await target.locator('strong').count(),strongs.length);
    if(suffix)assert.equal(await fresh.locator('[data-editor-toggle]').count(),0);
  }
  checks.push('downloaded HTML carries edited text and emphasis into fresh offline reading/print/presenter contexts');
  const blocked=await browser.newContext();
  await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('disabled','SecurityError')}}));
  await blocked.setOffline(true);const bp=await blocked.newPage();await bp.goto(fileUrl);await ready(bp);
  assert.equal(await bp.locator(`[data-edit-id="${id}"]`).first().textContent(),edited);
  await blocked.close();checks.push('embedded edits load when browser storage is unavailable');
  const imported=await browser.newContext();const ip=await imported.newPage();ip.on('dialog',d=>d.accept());
  await ip.goto(baseUrl);await ready(ip);await ip.locator('[data-editor-toggle]').click();
  await ip.getByLabel('选择报告修改文件').setInputFiles(jsonFile);
  await ip.getByRole('status').filter({hasText:'修改已导入'}).waitFor();
  assert.equal(await ip.locator(`[data-edit-id="${id}"]`).first().textContent(),edited);
  const bad=JSON.parse(await readFile(jsonFile,'utf8'));bad.projectId+='-wrong';
  const badFile=path.join(out,'wrong-project.json');await writeFile(badFile,JSON.stringify(bad));
  await ip.getByLabel('选择报告修改文件').setInputFiles(badFile);
  await ip.getByRole('status').filter({hasText:'未导入'}).waitFor();
  assert.equal(await ip.locator(`[data-edit-id="${id}"]`).first().textContent(),edited);
  checks.push('JSON transfer works and wrong-project imports leave current text untouched');
  await ctx.close();await imported.close();
});
console.log(JSON.stringify({passed:true,checks},null,2));
