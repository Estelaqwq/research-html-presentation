#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { withDeckPage } from './browser_helpers.mjs';

const root = path.resolve(process.argv[2] ?? process.cwd());
const manifest = JSON.parse(await readFile(path.join(root, 'deck-manifest.json'), 'utf8'));
if (!manifest.analysisCompanion?.llm?.enabled) { console.log(JSON.stringify({ skipped: true, reason: 'model API is disabled' })); process.exit(0); }
const evidence = JSON.parse(await readFile(path.join(root, 'evidence-visuals.json'), 'utf8'));
const citations = JSON.parse(await readFile(path.join(root, 'citations.json'), 'utf8'));
const { createResearchCompanionServer } = await import(pathToFileURL(path.join(root, 'scripts', 'research-companion-server.mjs')));
const { executePlan, mockPlan, validatePlan, verifyNarration } = await import(pathToFileURL(path.join(root, 'scripts', 'research-companion-core.mjs')));
const policy = evidence.analysisCompanion?.toolPolicy;
const measure = evidence.analysisCompanion?.measures?.find((item) => policy?.measureIds?.includes(item.id) && item.cells?.length && item.groups?.length && item.periods?.length);
if (!measure) { console.log(JSON.stringify({ skipped: true, reason: 'scaffold has no registered analysis cells' })); process.exit(0); }
const failures = [], checks = [];
const check = (value, name) => { checks.push({ name, passed: Boolean(value) }); if (!value) failures.push(name); };
const year = measure.periods.at(-1), group = measure.groups[0], term = measure.queryTerms?.[0] ?? measure.label;
const question = `${year} 年${group}${term}是多少？`;
const plan = { kind: 'single-year', measureId: measure.id, groups: [group], year };
check(validatePlan(plan, question, evidence).ok, 'registered single-year lookup');
check(!validatePlan({ ...plan, groups: ['unregistered-group'] }, question, evidence).ok, 'unregistered group rejected');
check(!validatePlan({ ...plan, year: '1900' }, question, evidence).ok, 'unregistered year rejected');
check(!validatePlan({ kind: 'execute-code', code: '1+1' }, question, evidence).ok, 'unregistered operation rejected');
const direct = executePlan(question, plan, evidence, citations);
check(direct.status === 'answered' && direct.analysisRecord?.createdAt && direct.analysisRecord?.sourceIds?.length && direct.citations?.length, 'calculation record and citations');
check(!verifyNarration({ answer: `${direct.answer} 99999999`, factIds: direct.facts.map((item) => item.factId), citationIds: direct.citations.map((item) => item.citationId) }, direct), 'invented model value rejected');
if (measure.aggregation === 'snapshot' && measure.periods.length > 1) {
  const from = measure.periods[0];
  check(!validatePlan({ kind: 'period-total', measureId: measure.id, groups: [group], from, to: year }, `${from}—${year} 年${group}${term}累计是多少？`, evidence).ok, 'snapshot cannot be summed across years');
}
const { server } = await createResearchCompanionServer({ root, providerMode: 'mock' });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const apiPath = manifest.analysisCompanion.llm.apiPath;
const ask = async (text, context) => { const response = await fetch(`${origin}${apiPath}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: text, ...(context ? { context } : {}) }) }); return { http: response.status, body: await response.json() }; };
try {
  const first = await ask(question);
  check(first.http === 200 && first.body.status === 'answered' && first.body.answerStatus.includes('离线模拟') && first.body.plan?.kind === 'single-year', 'offline mock answer');
  if (measure.groups.length > 1) {
    const secondGroup = measure.groups[1];
    const follow = await ask(`那${secondGroup}呢？`, { question: first.body.resolvedQuestion, plan: first.body.plan });
    check(follow.body.status === 'answered' && follow.body.analysisRecord?.inputScope?.groups?.includes(secondGroup) && follow.body.plan?.year === year, 'validated follow-up');
    const forged = await ask(`那${secondGroup}呢？`, { question: first.body.resolvedQuestion, plan: { ...first.body.plan, year: '1900' } });
    check(forged.body.status !== 'answered', 'forged context rejected');
  }
  const invalidOrigin = await fetch(`${origin}${apiPath}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.example' }, body: JSON.stringify({ question }) });
  check(invalidOrigin.status === 403, 'same-origin boundary');
  const tooLong = await ask('x'.repeat(401));
  check(tooLong.http === 400, 'question length bound');
  await withDeckPage(root, async ({ page, baseUrl }) => {
    await page.route(`**${apiPath}**`, async (route) => {
      const suffix = route.request().url().endsWith('/status') ? '/status' : '';
      const response = await fetch(`${origin}${apiPath}${suffix}`, { method: route.request().method(), headers: { 'Content-Type': 'application/json' }, body: route.request().postData() || undefined });
      await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
    });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const toggle = page.getByRole('button', { name: '研究助手' });
    check(await toggle.getAttribute('aria-expanded') === 'false', 'collapsed by default');
    await toggle.click();
    await page.getByLabel('输入有关本报告的问题').fill(question);
    await page.getByRole('button', { name: '查询证据' }).click();
    await page.locator('.analysis-companion-result[data-companion-status="answered"]').waitFor();
    check(await page.locator('.analysis-companion-citations a').count() > 0, 'browser source link');
    await page.getByRole('button', { name: '保存到笔记' }).click();
    check(await page.locator('.analysis-companion-notebook summary').innerText().then((value) => value.includes('（1）')), 'personal notebook');
    await page.getByRole('button', { name: '恢复报告口径' }).click();
    check(await page.locator('.analysis-companion-result').count() === 0, 'restore default');
    await page.keyboard.press('Escape');
    check(await toggle.getAttribute('aria-expanded') === 'false', 'keyboard close');
    await page.setViewportSize({ width: 390, height: 844 });
    await toggle.click();
    check(await page.locator('.analysis-companion-panel').isVisible() && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'narrow viewport');
    await page.goto(`${baseUrl}?print=1`, { waitUntil: 'networkidle' });
    check(await page.locator('[data-analysis-companion]').count() === 0, 'formal print isolation');
  });
} finally { await new Promise((resolve) => server.close(resolve)); }
console.log(JSON.stringify({ passed: failures.length === 0, checks, failures }, null, 2));
process.exit(failures.length ? 1 : 0);
