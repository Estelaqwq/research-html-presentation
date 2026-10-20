export function chartSemanticFailures(title, chartForm) {
  const copy = String(title ?? "").toLowerCase();
  const form = String(chartForm ?? "").toLowerCase();
  const failures = [];
  if (/pearson|相关|关联/.test(copy) && !/(scatter|correlation-dot-plot|heatmap)/.test(form)) failures.push("correlation-form-mismatch");
  if (/排名.{0,12}错位|名次.{0,12}错位|rank.*mismatch/i.test(copy) && !/(slope|dumbbell)/.test(form)) failures.push("ranking-mismatch-form");
  if (/位次重排|排名变化|rank.*change|reorder/i.test(copy) && !/(bump|slope)/.test(form)) failures.push("rank-change-form");
  return failures;
}
