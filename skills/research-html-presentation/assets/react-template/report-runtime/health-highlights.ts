import type { DataHealthReport } from "./DataHealth";
export type HealthHighlight = { title: string; detail: string; tab: number; rank: number; kind: "check" | "scope" | "not-run" };

/** Summarize registered diagnostics only; never infer missing checks as passes. */
export function healthHighlights(report: DataHealthReport): HealthHighlight[] {
  if (report.status !== "ready") return [];
  const result: HealthHighlight[] = [];
  const n = (value: number) => value.toLocaleString("zh-CN");
  if (typeof report.summary.duplicateExtraRecords === "number" && report.summary.duplicateExtraRecords > 0) result.push({ title: `声明键下有${n(report.summary.duplicateExtraRecords)}条额外重复记录`, detail: "先核对记录层级和唯一键，再决定如何处理；这里没有自动去重。", tab: 0, rank: 0, kind: "check" });
  if (typeof report.summary.incompleteKeyRecords === "number" && report.summary.incompleteKeyRecords > 0) result.push({ title: `${n(report.summary.incompleteKeyRecords)}条记录的键字段不完整`, detail: "涉及标识和重复判断，需核对这些记录能否可靠关联。", tab: 0, rank: 1, kind: "check" });
  for (const field of report.fields) {
    if (typeof field.invalid === "number" && field.invalid > 0) result.push({ title: `${field.label}有${n(field.invalid)}个无效值`, detail: "请查看字段规则；使用这个字段统计或分组前，先确认无效值的处理方式。", tab: 0, rank: 2, kind: "check" });
    if (typeof field.missing === "number" && field.missing > 0) result.push({ title: `${field.label}缺失${typeof field.records === "number" && field.records > 0 ? (field.missing / field.records * 100).toFixed(2) + "%" : n(field.missing) + "条"}`, detail: "相关分析需说明缺失如何处理，并核对使用的分母；不能把缺失直接当作零。", tab: 0, rank: 5 - (typeof field.records === "number" && field.records > 0 ? field.missing / field.records : 0), kind: "check" });
  }
  for (const coverage of report.coverage) if (typeof coverage.missingPeriods === "number" && coverage.missingPeriods > 0) result.push({ title: `${coverage.label}有${n(coverage.missingPeriods)}个预期时段缺口`, detail: "这里只表示该时段没有登记记录，不能当作指标为零；跨期比较前请核对。", tab: 1, rank: 3, kind: "scope" });
  const scope = report.limitations.find(text => /部分年度|未覆盖完整|观察窗口|截至|仅覆盖|不完整年度|非完整/.test(text));
  if (scope) result.push({ title: "时间与比较范围需要留意", detail: scope, tab: 1, rank: 3.5, kind: "scope" });
  for (const anomaly of report.anomalies) {
    if (anomaly.status === "insufficient") result.push({ title: `${anomaly.label}未完成异常筛查`, detail: "有效样本不足，不代表没有异常；可在异常值页签查看方法和状态。", tab: 2, rank: 6, kind: "not-run" });
    else if (typeof anomaly.flagged === "number" && anomaly.flagged > 0) result.push({ title: `${anomaly.label}标记了${n(anomaly.flagged)}个待复核值`, detail: "这是已登记规则的筛查结果，不等于错误记录，也没有自动删除。", tab: 2, rank: 2.5, kind: "check" });
  }
  if (!report.anomalies.length) result.push({ title: "本次未执行异常值筛查", detail: "没有登记适合本数据的筛查规则；未执行不表示没有异常。", tab: 2, rank: 7, kind: "not-run" });
  if (!report.usage.length || report.usage.some(usage => usage.status === "unregistered")) result.push({ title: "部分分析输入范围未登记", detail: "无法判断这些步骤实际用了多少条记录，可到分析使用范围页签核对。", tab: 3, rank: 6.5, kind: "not-run" });
  return result.sort((a, b) => a.rank - b.rank);
}
