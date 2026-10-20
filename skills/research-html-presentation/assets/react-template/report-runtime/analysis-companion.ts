export type CompanionCell = { group: string; period?: string; value: number; numerator?: number; denominator?: number };
export type CompanionMeasure = {
  id: string; label: string; unit: string; datasetId: string; analysisId: string;
  transformIds: string[]; sourceIds: string[]; claimIds: string[]; visualId?: string;
  method: string; limitations: string[]; aggregation: "sum" | "weighted-rate" | "snapshot"; displayMultiplier?: number;
  groups: string[]; groupAliases?: Record<string, string[]>; queryTerms?: string[]; fieldId?: string; periods?: string[]; cells: CompanionCell[];
};
export type CompanionQuestion = {
  id: string; findingId: string; prompt: string;
  action: "lookup" | "group-compare" | "time-range" | "sensitivity" | "method" | "registered-finding";
  measureId: string; claimIds: string[]; sourceIds: string[];
  sectionIds?: string[]; defaultSelection?: { group: string; from?: string; to?: string };
};
export type CompanionEvidence = { measures: CompanionMeasure[]; questions: CompanionQuestion[]; analyses?: Array<{ analysisId: string; datasetId: string; transformIds: string[]; findingStatement?: string; method: string; parameters?: Record<string, unknown>; supportingMetrics?: Array<{ label: string; value: number; unit?: string }>; limitations?: string[] }>; citations?: Array<{ citationId: string; title: string; url: string; claimIds: string[] }> };
export type CompanionSelection = { measureId: string; group: string; from?: string; to?: string };
export type CompanionResult = {
  status: "answered" | "insufficient" | "clarify"; question: string; answer: string;
  value?: number; unit?: string; selection?: CompanionSelection | { groups: string[]; from?: string; to?: string; year?: string }; method?: string;
  datasetId?: string; analysisId?: string; transformIds: string[];
  findingId?: string; claimIds: string[]; sourceIds: string[]; visualId?: string; limitations: string[];
  answerStatus?: string; fallbackReason?: string; aiExplanation?: string;
  plan?: Record<string, unknown>; resolvedQuestion?: string;
  facts?: Array<{ factId: string; label: string; value: number; unit: string; display: string; percent?: number }>;
  citations?: Array<{ citationId: string; title: string; url: string }>;
  analysisRecord?: { recordId: string; createdAt: string; question: string; inputScope: { groups?: string[]; from?: string; to?: string; year?: string }; parameters: Record<string, unknown>; transforms: string[]; method: string; results: unknown[]; unit?: string | null; sourceIds: string[] };
};

const insufficient = (question: string, reason: string): CompanionResult => ({
  status: "insufficient", question, answer: reason, transformIds: [], claimIds: [], sourceIds: [], limitations: [],
});
const citationsFor = (evidence: CompanionEvidence, claimIds: string[]) => evidence.citations?.filter((citation) => citation.claimIds.some((id) => claimIds.includes(id))).map(({ citationId, title, url }) => ({ citationId, title, url })) ?? [];

export function availableQuestions(evidence: CompanionEvidence, findingIds: string[], sectionId?: string) {
  const measures = new Map(evidence.measures.map((measure) => [measure.id, measure]));
  return evidence.questions.filter((question) => findingIds.includes(question.findingId) && (!sectionId || !question.sectionIds?.length || question.sectionIds.includes(sectionId)) && measures.has(question.measureId) && (question.action !== "registered-finding" || evidence.analyses?.some((analysis) => analysis.analysisId === question.findingId && analysis.findingStatement)));
}

export function answerQuestion(evidence: CompanionEvidence, questionId: string, selection?: CompanionSelection): CompanionResult {
  const question = evidence.questions.find((entry) => entry.id === questionId);
  if (!question) return insufficient(questionId, "未找到已登记的追问，无法提供有依据的回答。");
  const measure = evidence.measures.find((entry) => entry.id === question.measureId);
  if (!measure) return insufficient(question.prompt, "该问题缺少可验证的分析指标。");
  if (question.action === "registered-finding") {
    const analysis = evidence.analyses?.find((entry) => entry.analysisId === question.findingId);
    if (!analysis?.findingStatement) return insufficient(question.prompt, "该追问尚未绑定可复核的分析记录。");
    const metrics = analysis.supportingMetrics ?? [];
    const facts = metrics.map((metric, index) => ({ factId: `metric-${index + 1}`, label: metric.label, value: metric.value, unit: metric.unit ?? "", display: String(metric.value) }));
    const years = Array.isArray(analysis.parameters?.years) ? analysis.parameters.years : [];
    const scope = years.length === 2 && measure.groups.length ? `覆盖 ${measure.groups.join("、")}，${years[0]}—${years[1]} 年。` : "";
    const metricText = /scope|范围|样本/.test(analysis.analysisId) ? "" : facts.map((fact) => `${fact.label}为 ${fact.display}${fact.unit}`).join("；");
    return {
      status: "answered", question: question.prompt,
      answer: `${analysis.findingStatement}${scope ? scope : ""}${metricText ? `${metricText}。` : ""}${question.findingId === "finding-association-2024" ? "这只是描述性关联，不能据此推断因果。" : ""}`,
      method: analysis.method, datasetId: analysis.datasetId, analysisId: analysis.analysisId, findingId: question.findingId,
      transformIds: analysis.transformIds, claimIds: question.claimIds, sourceIds: question.sourceIds,
      limitations: analysis.limitations ?? [], facts,
      citations: citationsFor(evidence, question.claimIds),
    };
  }
  if (question.action === "method") return {
    status: "answered", question: question.prompt, answer: measure.method,
    method: measure.method, datasetId: measure.datasetId, analysisId: measure.analysisId, findingId: question.findingId,
    transformIds: measure.transformIds, claimIds: question.claimIds, sourceIds: question.sourceIds,
    visualId: measure.visualId, limitations: measure.limitations,
    citations: citationsFor(evidence, question.claimIds),
  };
  const chosen = selection ?? { measureId: measure.id, group: question.defaultSelection?.group ?? measure.groups[0], ...(question.defaultSelection?.from ? { from: question.defaultSelection.from } : {}), ...(question.defaultSelection?.to ? { to: question.defaultSelection.to } : {}) };
  if (chosen.measureId !== measure.id || !measure.groups.includes(chosen.group)) return insufficient(question.prompt, "筛选条件不在预先核准的分析范围内。");
  if (chosen.from && !measure.periods?.includes(chosen.from) || chosen.to && !measure.periods?.includes(chosen.to) || chosen.from && chosen.to && chosen.from > chosen.to) return insufficient(question.prompt, "时间范围不在预先核准的分析范围内。");
  const compute = (group: string) => {
    const cells = measure.cells.filter((cell) => cell.group === group && (!chosen.from || (cell.period ?? "") >= chosen.from) && (!chosen.to || (cell.period ?? "") <= chosen.to));
    if (!cells.length) return null;
    if (measure.aggregation === "snapshot") return cells.length === 1 ? cells[0].value : null;
    if (measure.aggregation === "sum") return cells.reduce((sum, cell) => sum + cell.value, 0);
    const numerator = cells.reduce((sum, cell) => sum + (cell.numerator ?? 0), 0);
    const denominator = cells.reduce((sum, cell) => sum + (cell.denominator ?? 0), 0);
    return denominator > 0 ? numerator / denominator * (measure.displayMultiplier ?? 1) : null;
  };
  const compare = question.action === "group-compare" || question.action === "sensitivity";
  const groups = compare ? measure.groups : [chosen.group];
  const values = groups.map((group) => ({ group, value: compute(group) }));
  if (values.some((item) => item.value === null || !Number.isFinite(item.value))) return insufficient(question.prompt, measure.aggregation === "snapshot" ? "请选择一个有数据的单一年份；人均指标和预期寿命不能跨年累加。" : "该筛选范围缺少可计算的汇总单元，或分母为零。");
  const value = values[0].value!;
  const scope = chosen.from && chosen.to ? `${chosen.from}—${chosen.to}` : chosen.from ? `${chosen.from}起` : chosen.to ? `截至${chosen.to}` : "全时段";
  const answer = compare ? `${scope}：${measure.label}分别为 ${values.map((item) => `${item.group} ${Number(item.value!.toPrecision(6))} ${measure.unit}`).join("；")}。` : `${chosen.group} · ${scope}：${measure.label}为 ${Number(value.toPrecision(6))} ${measure.unit}。`;
  return {
    status: "answered", question: question.prompt, answer,
    value, unit: measure.unit, selection: chosen, method: measure.method,
    datasetId: measure.datasetId, analysisId: measure.analysisId, transformIds: measure.transformIds,
    findingId: question.findingId, claimIds: question.claimIds, sourceIds: question.sourceIds, visualId: measure.visualId, limitations: measure.limitations,
    citations: citationsFor(evidence, question.claimIds),
  };
}

export function answerText(evidence: CompanionEvidence, text: string): CompanionResult {
  const query = text.trim();
  if (!query) return insufficient("", "请输入问题。");
  const exact = evidence.questions.find((question) => question.prompt === query);
  if (exact) return answerQuestion(evidence, exact.id);
  const matches = evidence.questions.filter((question) => question.prompt.includes(query) || query.includes(question.prompt));
  if (matches.length === 1) return answerQuestion(evidence, matches[0].id);
  return insufficient(query, matches.length > 1 ? "找到多个可能的问题，请从建议追问中选择具体问题。" : "当前证据未登记这个问题。请从建议追问中选择，或补充经核查的分析记录。");
}
