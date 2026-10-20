import type { CompanionEvidence, CompanionMeasure, CompanionResult } from "./analysis-companion";

export type GuidedOperation = "single-year" | "period-total" | "endpoint-change" | "sensitivity";
export type GuidedPlan = { operation: GuidedOperation; measureId: string; groups: string[]; from: string; to: string; alternateTo?: string };
const fmt = (value: number) => Number(value.toFixed(1)).toLocaleString("zh-CN", { maximumFractionDigits: 1 });
const unavailable = (question: string, reason: string): CompanionResult => ({ status: "insufficient", question, answer: reason, answerStatus: "证据不足", claimIds: [], sourceIds: [], transformIds: [], limitations: [reason] });

export function guidedQuestion(plan: GuidedPlan, measure: CompanionMeasure) {
  const groups = plan.groups.join("与");
  if (plan.operation === "single-year") return `${plan.to} 年${groups}${measure.label}是多少？`;
  if (plan.operation === "period-total") return `${plan.from}—${plan.to} 年${groups}${measure.label}累计是多少？`;
  if (plan.operation === "endpoint-change") return `${plan.from}—${plan.to} 年${groups}${measure.label}变化多少？`;
  return `${plan.from} 年为起点，终点改为 ${plan.alternateTo} 年后，${measure.label}增幅排序是否改变？`;
}

export function runGuidedAnalysis(evidence: CompanionEvidence, plan: GuidedPlan): CompanionResult {
  const measure = evidence.measures.find((item) => item.id === plan.measureId);
  if (!measure) return unavailable("临时分析", "指标未登记。");
  const question = guidedQuestion(plan, measure);
  const periods = measure.periods ?? [];
  if (!plan.groups.length || new Set(plan.groups).size !== plan.groups.length || plan.groups.some((group) => !measure.groups.includes(group))) return unavailable(question, "分组超出已登记范围。");
  if (!periods.includes(plan.to) || !periods.includes(plan.from) || plan.from > plan.to) return unavailable(question, "年份超出已登记范围，或起止顺序错误。");
  if (measure.aggregation === "snapshot" && (plan.operation !== "single-year" || plan.from !== plan.to)) return unavailable(question, "该指标只能查询单年值，不能跨年累加。");
  if (measure.aggregation !== "sum" && plan.operation !== "single-year") return unavailable(question, "该操作仅适用于已登记的可加年度指标。");
  if (plan.operation === "sensitivity" && (!plan.alternateTo || !periods.includes(plan.alternateTo) || plan.alternateTo <= plan.from || plan.groups.length < 2)) return unavailable(question, "敏感性检验需要已登记的两个终点和至少两个分组。");
  const cell = (group: string, year: string) => measure.cells.find((item) => item.group === group && item.period === year)?.value;
  const selectedYears = periods.filter((year) => year >= plan.from && year <= plan.to);
  const facts: NonNullable<CompanionResult["facts"]> = [];
  let answer = "", method = "";
  if (plan.operation === "single-year") {
    for (const group of plan.groups) {
      const value = cell(group, plan.to);
      if (!Number.isFinite(value)) return unavailable(question, "所选分组和年份缺少可核验值，未进行插补。");
      facts.push({ factId: `value-${facts.length + 1}`, label: group, value: value!, display: fmt(value!), unit: measure.unit });
    }
    answer = `${plan.to} 年${measure.label}：${facts.map((fact) => `${fact.label} ${fact.display} ${fact.unit}`).join("；")}。`;
    method = `读取${plan.to} 年已登记的年度值；不跨年求和。`;
  } else if (plan.operation === "period-total") {
    for (const group of plan.groups) {
      const values = selectedYears.map((year) => cell(group, year));
      if (values.some((value) => !Number.isFinite(value))) return unavailable(question, "年份范围内存在缺失值，未进行插补。");
      const value = values.reduce<number>((sum, item) => sum + item!, 0);
      facts.push({ factId: `total-${facts.length + 1}`, label: group, value, display: fmt(value), unit: measure.unit });
    }
    answer = `${plan.from}—${plan.to} 年期间累计${measure.label}：${facts.map((fact) => `${fact.label} ${fact.display} ${fact.unit}`).join("；")}。`;
    method = `对${selectedYears.length}个年度的${measure.label}求和；结果不是单年值。`;
  } else if (plan.operation === "endpoint-change") {
    for (const group of plan.groups) {
      const first = cell(group, plan.from), last = cell(group, plan.to);
      if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return unavailable(question, "端点缺少可核验值，或起点为零，无法计算相对变化。");
      const value = last! - first!;
      facts.push({ factId: `change-${facts.length + 1}`, label: group, value, display: fmt(value), unit: measure.unit, percent: value / first! * 100 });
    }
    answer = `${plan.from}—${plan.to} 年${measure.label}变化：${facts.map((fact) => `${fact.label}绝对${fact.value < 0 ? "减少" : "增加"} ${fmt(Math.abs(fact.value))} ${fact.unit}，相对变化 ${fmt(fact.percent!)}%`).join("；")}。`;
    method = `绝对变化=终点值−起点值；相对变化=绝对变化÷${plan.from} 年值×100%。`;
  } else {
    const rank = (end: string) => {
      const rows = plan.groups.map((group) => { const first = cell(group, plan.from), last = cell(group, end); return { group, first, last, absolute: last! - first!, relative: (last! - first!) / first! * 100 }; });
      if (rows.some((row) => !Number.isFinite(row.first) || !Number.isFinite(row.last) || row.first === 0)) return null;
      return { relative: [...rows].sort((a, b) => b.relative - a.relative), absolute: [...rows].sort((a, b) => b.absolute - a.absolute) };
    };
    const base = rank(plan.to), alternate = rank(plan.alternateTo!);
    if (!base || !alternate) return unavailable(question, "敏感性检验需要完整的起点和两个终点值，未进行插补。");
    for (const [label, rows] of [[plan.to, base.relative], [plan.alternateTo!, alternate.relative]] as const) rows.forEach((row) => {
      facts.push({ factId: `relative-${label}-${row.group}`, label: `${row.group} ${label} 相对变化`, value: row.relative, display: fmt(row.relative), unit: "%" });
      facts.push({ factId: `absolute-${label}-${row.group}`, label: `${row.group} ${label} 绝对变化`, value: row.absolute, display: fmt(row.absolute), unit: measure.unit });
    });
    const relativeStable = base.relative[0].group === alternate.relative[0].group;
    const absoluteStable = base.absolute[0].group === alternate.absolute[0].group;
    answer = `以${plan.from}年为起点，终点从${plan.to}年改为${plan.alternateTo}年：相对增幅第一位${relativeStable ? "保持为" : "由"}${base.relative[0].group}${relativeStable ? "" : `变为${alternate.relative[0].group}`}；绝对增量第一位${absoluteStable ? "保持为" : "由"}${base.absolute[0].group}${absoluteStable ? "" : `变为${alternate.absolute[0].group}`}。这是终点年份敏感性检验，不解释变化原因。`;
    method = `分别计算${plan.from}—${plan.to}年与${plan.from}—${plan.alternateTo}年的绝对增量和相对增幅，并比较已选分组的排序；不改变正式报告结论。`;
  }
  const citations = evidence.citations?.filter((item) => item.claimIds.some((id) => measure.claimIds.includes(id))).map(({ citationId, title, url }) => ({ citationId, title, url })) ?? [];
  const record = { recordId: crypto.randomUUID(), createdAt: new Date().toISOString(), question, inputScope: { groups: plan.groups, from: plan.from, to: plan.to, ...(plan.alternateTo ? { alternateTo: plan.alternateTo } : {}) }, parameters: { ...plan }, transforms: measure.transformIds, method, results: facts, unit: measure.unit, sourceIds: measure.sourceIds };
  return { status: "answered", question, answer, answerStatus: "已核验数据计算", method, selection: { groups: plan.groups, from: plan.from, to: plan.to }, datasetId: measure.datasetId, analysisId: measure.analysisId, findingId: measure.analysisId, visualId: measure.visualId, transformIds: measure.transformIds, claimIds: measure.claimIds, sourceIds: measure.sourceIds, limitations: measure.limitations, citations, facts, analysisRecord: record, plan: { kind: plan.operation, measureId: measure.id, groups: plan.groups, from: plan.from, to: plan.to, ...(plan.alternateTo ? { alternateTo: plan.alternateTo } : {}) }, resolvedQuestion: question };
}
