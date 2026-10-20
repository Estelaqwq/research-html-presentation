#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { loadPlaywright } from "./browser_helpers.mjs";

const file=path.resolve(process.argv[2] ?? "offline/index.html");
const {chromium}=loadPlaywright();
const executablePath=process.env.BROWSER_EXECUTABLE ?? (process.platform==="win32"?path.join(process.env["ProgramFiles(x86)"]??"C:/Program Files (x86)","Microsoft","Edge","Application","msedge.exe"):undefined);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const failures=[],checks=[];
const check=(value,name)=>{checks.push({name,passed:Boolean(value)});if(!value)failures.push(name)};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.context().setOffline(true);
 const requests=[];page.on("request",request=>{if(/^https?:/i.test(request.url()))requests.push(request.url())});page.on("pageerror",error=>failures.push(error.message));
 await page.goto(pathToFileURL(file).href);await page.waitForFunction(()=>document.documentElement.dataset.reportReady==="true");
 check(await page.locator("[data-report-runtime='ReportRuntime']").count()===1,"shared ReportRuntime renders offline");
 check(await page.locator("[data-report-section]").count()>1,"substantive sections are present");
 check(await page.locator("img").evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)),"all images render without a server");
 const nav=page.locator("[data-report-nav-item]");if(await nav.count()>1){await nav.nth(1).click();check((await page.evaluate(()=>location.hash)).length>1,"offline chapter navigation")}
 const tab=page.locator(".general-report-tabs [role=tab]");if(await tab.count()>1){await tab.nth(1).click();check(await tab.nth(1).getAttribute("aria-selected")==="true","offline method/example switching")}
 const cases=page.locator(".general-report-case-selector button");if(await cases.count()>1){await cases.nth(1).click();check(await cases.nth(1).getAttribute("aria-pressed")==="true","offline case selection")}
 const reset=page.locator("[data-report-action=reset]");if(await reset.count()){await reset.click();if(await tab.count())check(await tab.first().getAttribute("aria-selected")==="true","offline reset")}
 const editor=page.locator("[data-editor-toggle='true']");
 if(await editor.count()){
  await page.evaluate(()=>scrollTo(0,0));await editor.click();
  const title=page.locator("h1[data-edit-id]").first();await title.waitFor({state:"visible"});
  const original=await title.textContent();await title.click();await title.fill("离线编辑功能验证");
  await page.locator("[data-editor-action='save']").click();
  await page.getByRole("status").filter({hasText:"已保存"}).waitFor({state:"visible"});
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.reportReady==="true");
  check(await page.locator("h1[data-edit-id]").first().textContent()==="离线编辑功能验证","offline text save survives reload");
  await page.locator("[data-editor-toggle='true']").click();
  const editTitle=page.locator("h1[data-edit-id]").first();await editTitle.click();await editTitle.fill("离线撤销重做验证");await editTitle.blur();
  await page.getByRole("button",{name:"撤销",exact:true}).click();check(await editTitle.textContent()==="离线编辑功能验证","offline undo");
  await page.getByRole("button",{name:"重做",exact:true}).click();check(await editTitle.textContent()==="离线撤销重做验证","offline redo");
  await editTitle.click();await editTitle.fill(original??"");await page.locator("[data-editor-action='save']").click();
  await page.getByRole("status").filter({hasText:"已保存"}).waitFor({state:"visible"});await editor.click();
 }
 await page.setViewportSize({width:390,height:844});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"offline mobile layout");
 await page.goto(pathToFileURL(file).href+"?print=1");await page.waitForFunction(()=>document.documentElement.dataset.reportReady==="true");
 check(await page.locator("[data-report-toolbar]:visible,[data-editor-control]:visible").count()===0,"print omits presentation/editor controls");
 check(requests.length===0,"no HTTP requests while rendering or interacting offline");
 check((await readFile(file,"utf8")).includes('name="offline-report"'),"self-contained export marker");
 console.log(JSON.stringify({file,passed:failures.length===0,checks,failures},null,2));
}catch(error){failures.push(error.message);console.log(JSON.stringify({file,passed:false,checks,failures},null,2))}finally{await browser.close()}
process.exit(failures.length?1:0);
