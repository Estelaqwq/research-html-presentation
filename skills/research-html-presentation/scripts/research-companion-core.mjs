import { randomUUID } from "node:crypto";

const allowedKinds = new Set(["period-total", "annual-average", "single-year", "endpoint-change", "registered-finding", "method"]);
const number = (value, digits = 1) => Number(value.toFixed(digits));
const display = (value, digits = 1) => number(value, digits).toLocaleString("zh-CN", { maximumFractionDigits: digits });
const denied = (question, reason, status = "insufficient") => ({ status, question, answer: reason, transformIds: [], claimIds: [], sourceIds: [], limitations: [reason], answerStatus: "证据不足" });
const list = (value) => Array.isArray(value) ? value : [];

export function policyFor(evidence) {
  const policy = evidence.analysisCompanion?.toolPolicy;
  if (!policy) return null;
  return {
    allowedOperations: list(policy.allowedOperations).filter((id) => allowedKinds.has(id)),
    measureIds: list(policy.measureIds),
    analysisIds: list(policy.analysisIds),
    maxGroups: Math.min(Math.max(Number(policy.maxGroups) || 6, 1), 24),
    maxPeriods: Math.min(Math.max(Number(policy.maxPeriods) || 25, 1), 100),
  };
}

function mentionedGroups(question, measure) {
  const names = measure.groups.flatMap((group) => [group, ...list(measure.groupAliases?.[group])].map((alias) => ({ group, alias })));
  names.sort((a, b) => b.alias.length - a.alias.length);
  let remaining = question;
  const found = new Set();
  for (const { group, alias } of names) {
    if (remaining.includes(alias)) { found.add(group); remaining = remaining.replaceAll(alias, " "); }
  }
  return measure.groups.filter((group) => found.has(group));
}
function mentionedYears(question) {
  return [...question.matchAll(/(?:19|20)\d{2}/g)].map((match) => match[0]);
}
function mentionedMeasures(question, measures) {
  const query = question.toLocaleLowerCase();
  return measures.filter((measure) => [measure.label, ...list(measure.queryTerms)].some((term) => query.includes(term.toLocaleLowerCase())));
}

// Context is only a proposed scope. The server revalidates both the prior plan and the new plan.
export function resolveFollowup(question, context, evidence) {
  if (!/^(那|那么|同样|换成|如果换成)/.test(question) || !context?.plan || typeof context.question !== "string") return null;
  if (!validatePlan(context.plan, context.question, evidence).ok) return null;
  const previous = context.plan;
  const measure = evidence.analysisCompanion?.measures?.find((item) => item.id === previous.measureId);
  if (!measure || !["single-year", "period-total", "annual-average", "endpoint-change"].includes(previous.kind)) return null;
  const groups = mentionedGroups(question, measure);
  if (groups.length !== 1 || mentionedYears(question).length) return null;
  const group = groups[0];
  const term = measure.queryTerms?.[0] ?? measure.label;
  if (previous.kind === "single-year") return `${previous.year} 年${group}${term}是多少？`;
  const scope = `${previous.from}—${previous.to} 年${group}`;
  if (previous.kind === "period-total") return `${scope}${term}累计是多少？`;
  if (previous.kind === "annual-average") return `${scope}${term}平均每年是多少？`;
  return `${scope}${term}变化是多少？`;
}

export function mockPlan(question, evidence) {
  const policy = policyFor(evidence);
  const measures = evidence.analysisCompanion?.measures?.filter((item) => policy?.measureIds.includes(item.id)) ?? [];
  const matches = mentionedMeasures(question, measures);
  const measure = matches.length === 1 ? matches[0] : measures.length === 1 ? measures[0] : null;
  if (!policy || !measures.length) return { kind: "insufficient", reason: "未登记可用于自然语言分析的指标。" };
  const groups = measure ? mentionedGroups(question, measure) : [];
  const years = mentionedYears(question).filter((year) => measure?.periods?.includes(year));
  if (/原因|为什么|导致|因果|政策效果|预测/.test(question)) return { kind: "insufficient", reason: "现有数据只能描述变化和关联，不能证明原因、政策效果或预测结果。" };
  if (/观察单元|数据覆盖|样本范围|数据范围|覆盖哪些国家/.test(question)) {
    const analysisId = policy.analysisIds.find((id) => /scope|范围|样本/.test(id));
    return analysisId ? { kind: "registered-finding", analysisId } : { kind: "insufficient", reason: "没有登记对应的数据范围分析记录。" };
  }
  if (/增长最快|增幅最高/.test(question) && !/相对|百分比|绝对|增量/.test(question)) return { kind: "clarify", reason: "请明确比较相对增幅还是绝对增量；两者的排序可能不同。" };
  if (/口径|单位|统计范围|是什么指标/.test(question)) return measure ? { kind: "method", measureId: measure.id } : { kind: "clarify", reason: "请指出要查询口径的指标。" };
  if (/关联|相关|关系/.test(question)) {
    const analysisId = policy.analysisIds.find((id) => /association|关联/.test(id)) ?? policy.analysisIds[0];
    return analysisId ? { kind: "registered-finding", analysisId } : { kind: "insufficient", reason: "没有登记对应的横截面分析记录。" };
  }
  if (!measure) return { kind: "clarify", reason: matches.length > 1 ? "请一次指定一个指标，或明确询问已登记的指标关系。" : "请指出已登记的指标。" };
  if (measure.aggregation === "snapshot") {
    if (years.length !== 1 || mentionedYears(question).length !== 1) return { kind: "clarify", reason: "该指标只能查询指定的单一年份。" };
    return { kind: "single-year", measureId: measure.id, groups: groups.length ? groups : measure.groups, year: years[0] };
  }
  if (/相对|增幅|绝对|增量|增长|下降|变化|减少/.test(question)) {
    return { kind: "endpoint-change", measureId: measure.id, groups: /最快|最高|最大|排序/.test(question) ? measure.groups : groups.length ? groups : measure.groups, from: years[0] ?? measure.periods?.[0], to: years[1] ?? measure.periods?.at(-1) };
  }
  if (measure.aggregation === "sum") {
    if (years.length === 1 && !/范围|累计|期间/.test(question)) return { kind: "single-year", measureId: measure.id, groups: groups.length ? groups : measure.groups, year: years[0] };
    return { kind: /平均|年均/.test(question) ? "annual-average" : "period-total", measureId: measure.id, groups: groups.length ? groups : measure.groups, from: years[0] ?? measure.periods?.[0], to: years[1] ?? years[0] ?? measure.periods?.at(-1) };
  }
  return { kind: "insufficient", reason: "问题没有对应的核准指标或分析操作。" };
}

export function validatePlan(plan, question, evidence) {
  const policy = policyFor(evidence);
  if (!policy || !plan || typeof plan !== "object") return { ok: false, reason: "研究助手的分析权限未登记。" };
  if (plan.kind === "insufficient" || plan.kind === "clarify") return { ok: true, plan: { kind: plan.kind, reason: /原因|为什么|导致|因果|政策效果|预测/.test(question) ? "现有数据只能确认变化或描述关联，不能证明原因、政策效果或预测结果。" : plan.kind === "clarify" ? "请明确比较指标、国家、年份，或相对增幅与绝对增量。" : "现有已登记数据和操作不能回答这个问题。" } };
  if (!policy.allowedOperations.includes(plan.kind)) return { ok: false, reason: "请求的分析操作未获准。" };
  if (/关联|相关|关系/.test(question) && plan.kind !== "registered-finding") return { ok: false, reason: "指标关系问题只能引用已登记的描述性分析记录。" };
  const permittedMeasures = evidence.analysisCompanion?.measures?.filter((item) => policy.measureIds.includes(item.id)) ?? [];
  const namedMeasures = mentionedMeasures(question, permittedMeasures);
  if (plan.kind !== "registered-finding" && namedMeasures.length && (namedMeasures.length !== 1 || namedMeasures[0].id !== plan.measureId)) return { ok: false, reason: "分析计划使用了与问题不符的指标。" };
  if (/原因|为什么|导致|因果|政策效果|预测/.test(question)) return { ok: false, reason: "当前数据不能支持因果或预测结论。" };
  if (/增长最快|增幅最高/.test(question) && !/相对|百分比|绝对|增量/.test(question)) return { ok: false, reason: "请明确比较相对增幅还是绝对增量。" };
  const scopeAnalysisId = policy.analysisIds.find((id) => /scope|范围|样本/.test(id));
  if (scopeAnalysisId && /观察单元|数据覆盖|样本范围|数据范围|覆盖哪些国家/.test(question) && (plan.kind !== "registered-finding" || plan.analysisId !== scopeAnalysisId)) return { ok: false, reason: "数据范围问题必须引用已登记的数据范围分析记录。" };
  if (/平均|年均/.test(question) && plan.kind !== "annual-average") return { ok: false, reason: "年度均值问题必须使用年度均值操作。" };
  if (/增长|下降|变化|减少|增幅|增量/.test(question) && !/平均|年均/.test(question) && plan.kind !== "endpoint-change") return { ok: false, reason: "变化问题必须比较起止年度，不能用期间累计值回答。" };
  if (/累计|总和|合计/.test(question) && plan.kind !== "period-total") return { ok: false, reason: "期间累计问题必须对可加的年度指标求和。" };
  if (mentionedYears(question).length === 1 && !/范围|累计|期间|平均|年均|增长|下降|变化|减少|增幅|增量/.test(question) && plan.kind !== "single-year" && plan.kind !== "registered-finding" && plan.kind !== "method") return { ok: false, reason: "单年数值问题必须读取年度值。" };
  if (plan.kind === "registered-finding") {
    const analysis = evidence.analyses?.find((item) => item.analysisId === plan.analysisId);
    if (!policy.analysisIds.includes(plan.analysisId) || !analysis?.findingStatement) return { ok: false, reason: "分析记录未获准或不存在。" };
    if (namedMeasures.some((measure) => measure.fieldId && !analysis.outputFields?.includes(measure.fieldId))) return { ok: false, reason: "该分析记录不包含问题指定的指标。" };
    const requestedYears = mentionedYears(question);
    const fixedYear = String(analysis.parameters?.year ?? "");
    if (requestedYears.length && requestedYears.some((year) => year !== fixedYear)) return { ok: false, reason: "该分析记录不覆盖所问年份。" };
    return { ok: true, plan: { kind: plan.kind, analysisId: plan.analysisId } };
  }
  const measure = evidence.analysisCompanion?.measures?.find((item) => item.id === plan.measureId);
  if (!measure || !policy.measureIds.includes(plan.measureId)) return { ok: false, reason: "指标未获准或不存在。" };
  if (plan.kind === "method") return { ok: true, plan: { kind: plan.kind, measureId: measure.id } };
  if (measure.aggregation !== "sum" && !(measure.aggregation === "snapshot" && plan.kind === "single-year")) return { ok: false, reason: "该指标只能查询单年值，不能跨年累加。" };
  const groups = list(plan.groups);
  if (!groups.length || groups.length > policy.maxGroups || new Set(groups).size !== groups.length || groups.some((group) => !measure.groups.includes(group))) return { ok: false, reason: "分组超出核准范围。" };
  const named = mentionedGroups(question, measure);
  if (named.some((group) => !groups.includes(group))) return { ok: false, reason: "分析计划遗漏了问题中指定的国家。" };
  const periods = measure.periods ?? [];
  const inputYears = mentionedYears(question);
  if (inputYears.some((year) => !periods.includes(year))) return { ok: false, reason: "问题中的年份超出核准范围。" };
  if (plan.kind === "single-year") {
    if (!periods.includes(plan.year) || inputYears.some((year) => year !== plan.year)) return { ok: false, reason: "年份超出核准范围或与问题不符。" };
    return { ok: true, plan: { kind: plan.kind, measureId: measure.id, groups, year: plan.year } };
  }
  const fromIndex = periods.indexOf(plan.from), toIndex = periods.indexOf(plan.to);
  if (fromIndex < 0 || toIndex < fromIndex || toIndex - fromIndex + 1 > policy.maxPeriods) return { ok: false, reason: "年份范围超出核准范围。" };
  if (inputYears.some((year) => year !== plan.from && year !== plan.to)) return { ok: false, reason: "分析计划与问题中的年份不一致。" };
  return { ok: true, plan: { kind: plan.kind, measureId: measure.id, groups, from: plan.from, to: plan.to } };
}

function citationsFor(claimIds, citations) {
  return list(citations?.citations).filter((item) => item.url?.startsWith("https://") && item.claimIds?.some((id) => claimIds.includes(id))).map((item) => ({ citationId: item.citationId, title: item.title, url: item.url }));
}
function record(question, plan, method, values, measure, sourceIds, transformIds) {
  return { recordId: randomUUID(), createdAt: new Date().toISOString(), question, inputScope: { groups: plan.groups ?? [], from: plan.from, to: plan.to, year: plan.year }, parameters: plan, transforms: transformIds, method, results: values, unit: measure?.unit ?? null, sourceIds };
}
function baseResult(question, answer, facts, selection, measure, analysis, claimIds, sourceIds, citations, analysisRecord, limitations) {
  return { status: "answered", question, answer, answerStatus: "已核验数据计算", facts, selection, method: analysisRecord.method,
    datasetId: measure?.datasetId ?? analysis?.datasetId, analysisId: analysis?.analysisId ?? measure?.analysisId,
    transformIds: analysisRecord.transforms, findingId: analysis?.analysisId ?? measure?.analysisId,
    claimIds, sourceIds, visualId: measure?.visualId ?? null, limitations, citations: citationsFor(claimIds, citations), analysisRecord };
}

export function executePlan(question, plan, evidence, citations) {
  if (plan.kind === "clarify" || plan.kind === "insufficient") return denied(question, plan.reason, plan.kind);
  const companion = evidence.analysisCompanion;
  if (plan.kind === "registered-finding") {
    const analysis = evidence.analyses.find((item) => item.analysisId === plan.analysisId);
    const linkedVisuals = list(evidence.visuals).filter((item) => item.chartSpec?.dataRef?.analysisId === plan.analysisId);
    const boundQuestions = list(companion.questions).filter((item) => item.findingId === plan.analysisId);
    const claimIds = [...new Set([...linkedVisuals.flatMap((item) => list(item.claimLinks).map((link) => link.claimId)), ...boundQuestions.flatMap((item) => list(item.claimIds))])];
    const sourceIds = [...new Set([analysis.datasetId, ...boundQuestions.flatMap((item) => list(item.sourceIds))])];
    const selectedMetrics = list(analysis.supportingMetrics);
    const facts = selectedMetrics.map((metric, index) => ({ factId: `metric-${index + 1}`, label: metric.label, value: metric.value, unit: metric.unit ?? "", display: String(metric.value) }));
    const finding = analysis.findingStatement;
    const detail = /scope|范围|样本/.test(analysis.analysisId) ? "" : facts.map((fact) => `${fact.label}为 ${fact.display}${fact.unit}`).join("；");
    const linkedMeasure = companion.measures.find((item) => item.datasetId === analysis.datasetId && policyFor(evidence)?.measureIds.includes(item.id));
    const bounds = list(analysis.parameters?.years);
    const scope = bounds.length === 2 && linkedMeasure?.groups?.length ? `覆盖 ${linkedMeasure.groups.join("、")}，${bounds[0]}—${bounds[1]} 年。` : "";
    const answer = `${finding}${scope ? scope : ""}${detail ? `${detail}。` : ""}${/association|关联/.test(analysis.analysisId) ? "这只是描述性关联，不能据此推断因果。" : ""}`;
    const analysisRecord = record(question, plan, analysis.method, facts, null, sourceIds, analysis.transformIds ?? []);
    return baseResult(question, answer, facts, { year: analysis.parameters?.year }, null, analysis, claimIds, sourceIds, citations, analysisRecord, analysis.limitations ?? []);
  }
  const measure = companion.measures.find((item) => item.id === plan.measureId);
  const analysis = evidence.analyses.find((item) => item.analysisId === measure.analysisId);
  const cell = (group, period) => measure.cells.find((item) => item.group === group && item.period === period);
  const facts = [];
  let answer = "";
  let method = measure.method;
  const groups = plan.groups ?? [];
  if (plan.kind === "method") {
    answer = `${measure.label}的单位为 ${measure.unit}。${measure.method}`;
    method = measure.method;
  } else if (plan.kind === "single-year") {
    for (const group of groups) {
      const item = cell(group, plan.year);
      if (!item || !Number.isFinite(item.value)) return denied(question, "所选分组或年份没有可核验的指标值。");
      facts.push({ factId: `value-${facts.length + 1}`, label: `${group} ${plan.year} 年`, value: item.value, unit: measure.unit, display: display(item.value) });
    }
    answer = `${plan.year} 年${measure.aggregation === "sum" ? "单年" : ""}${measure.label}：${facts.map((fact) => `${fact.label} ${fact.display} ${fact.unit}`).join("；")}。`;
    method = `读取所选国家在所选年份的已登记${measure.label}；不跨年求和。`;
  } else {
    const periods = measure.periods.filter((period) => period >= plan.from && period <= plan.to);
    for (const group of groups) {
      const cells = periods.map((period) => cell(group, period));
      if (cells.some((item) => !item || !Number.isFinite(item.value))) return denied(question, "所选范围缺少可核验的完整年度单元，未进行插补。");
      const start = cells[0].value, end = cells.at(-1).value;
      if (plan.kind === "period-total" || plan.kind === "annual-average") {
        const total = cells.reduce((sum, item) => sum + item.value, 0);
        const value = plan.kind === "annual-average" ? total / cells.length : total;
        facts.push({ factId: `${plan.kind}-${facts.length + 1}`, label: group, value, unit: measure.unit, display: display(value), annualStart: start, annualEnd: end });
      } else {
        facts.push({ factId: `change-${facts.length + 1}`, label: group, value: end - start, unit: measure.unit, display: display(end - start), percent: (end / start - 1) * 100 });
      }
    }
    if (plan.kind === "period-total") {
      answer = `${plan.from}—${plan.to} 年期间累计${measure.label}：${facts.map((fact) => `${fact.label} ${fact.display} ${fact.unit}`).join("；")}。这是年度指标的期间求和，不是单年值。`;
      method = `对 ${plan.from}—${plan.to} 年每个已登记年度的${measure.label}求和，覆盖 ${periods.length} 个年度；未累加其他不可加指标。`;
    } else if (plan.kind === "annual-average") {
      answer = `${plan.from}—${plan.to} 年平均每年${measure.label}：${facts.map((fact) => `${fact.label} ${fact.display} ${fact.unit}/年`).join("；")}。`;
      method = `对 ${periods.length} 个年度的${measure.label}求和后除以年度数；这是年均值，不是期间累计值。`;
    } else {
      const wantsRelative = /相对|百分比|增幅/.test(question);
      const wantsAbsolute = /绝对|增量/.test(question);
      const ranked = [...facts].sort((a, b) => wantsRelative ? b.percent - a.percent : b.value - a.value);
      const relativeLeader = [...facts].sort((a, b) => b.percent - a.percent)[0];
      const absoluteLeader = [...facts].sort((a, b) => b.value - a.value)[0];
      const lines = wantsRelative && wantsAbsolute && /最快|最高|最大|排序/.test(question)
        ? [`相对增幅最高的是${relativeLeader.label}（${display(relativeLeader.percent)}%）`, `绝对增量最大的是${absoluteLeader.label}（${absoluteLeader.display} ${absoluteLeader.unit}）`]
        : facts.length === 1 || !/最快|最高|最大|排序/.test(question)
        ? facts.map((fact) => `${fact.label}${measure.label}${fact.value < 0 ? "减少" : "增加"} ${display(Math.abs(fact.value))} ${fact.unit}（相对变化 ${display(fact.percent)}%）`)
        : [`${ranked[0].label}${wantsRelative && !wantsAbsolute ? "相对增幅最高" : "绝对增量最大"}（${wantsRelative && !wantsAbsolute ? `${display(ranked[0].percent)}%` : `${ranked[0].display} ${ranked[0].unit}`}）`];
      answer = `${plan.from}—${plan.to} 年，${lines.join("；")}。相对变化以起点年度为分母，绝对变化是两端年度排放之差。`;
      method = `端点比较：绝对增量= ${plan.to} 年指标值−${plan.from} 年指标值；相对增幅=绝对增量÷${plan.from} 年指标值×100%。`;
    }
  }
  const analysisRecord = record(question, plan, method, facts, measure, measure.sourceIds, measure.transformIds);
  return baseResult(question, answer, facts, plan, measure, analysis, measure.claimIds, measure.sourceIds, citations, analysisRecord, measure.limitations);
}

function numericTokens(value) {
  return [...String(value).matchAll(/(?<![A-Za-z])[-−]?\d[\d,]*(?:\.\d+)?/g)].map((match) => Number(match[0].replace(/[−,]/g, "-").replace(/-/g, (m, i) => i === 0 ? "-" : ""))).filter(Number.isFinite);
}
export function verifyNarration(candidate, result) {
  if (!candidate || typeof candidate.answer !== "string" || !candidate.answer.trim() || candidate.answer.length > 1200) return false;
  if (!candidate.answer.trim().startsWith(result.answer)) return false;
  if (!Array.isArray(candidate.factIds) || candidate.factIds.some((id) => !result.facts.some((fact) => fact.factId === id)) || result.facts.some((fact) => !candidate.factIds.includes(fact.factId))) return false;
  if (!Array.isArray(candidate.citationIds) || candidate.citationIds.some((id) => !result.citations.some((citation) => citation.citationId === id)) || result.citations.some((citation) => !candidate.citationIds.includes(citation.citationId))) return false;
  if (/导致|造成|证明.*因果|说明.*原因|政策.*使/.test(candidate.answer)) return false;
  // Only an explanatory suffix is model-authored. The verified conclusion stays verbatim.
  const suffix = candidate.answer.trim().slice(result.answer.length).trim();
  if (numericTokens(suffix).length || /(高于|低于|多于|少于|超过|不及|更高|更低|最多|最少|最高|最低|最大|最小|上升|下降|增加|减少|增长|领先|落后|倍|比.{0,8}[高低多少大小])/.test(suffix)) return false;
  if ((result.analysisRecord?.inputScope?.groups ?? []).some((name) => suffix.includes(name))) return false;
  if (result.facts.length && numericTokens(result.answer).length && !numericTokens(candidate.answer).length) return false;
  const allowed = new Set([
    ...numericTokens(result.answer), ...numericTokens(result.method),
    ...result.facts.flatMap((fact) => [fact.value, fact.percent, fact.annualStart, fact.annualEnd].filter(Number.isFinite).flatMap((value) => [number(value, 0), number(value, 1), number(value, 2), number(value, 3)])),
  ].map((value) => number(value, 3)));
  if (numericTokens(candidate.answer).some((value) => !allowed.has(number(value, 3)))) return false;
  return true;
}
