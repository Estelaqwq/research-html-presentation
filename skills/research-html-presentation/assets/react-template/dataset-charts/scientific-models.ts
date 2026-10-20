/** Renderer inputs are precomputed in the project's Shared Evidence Core.
 * These checks validate geometry; they never infer tests, intervals or sample sizes. */
export type FigureProfile = "slide" | "manuscript";
export type IntervalDefinition = { kind: "CI" | "SD" | "SE" | "prediction"; level?: number; method: string; samplingUnit: string };
export type EstimateRow = { label: string; estimate: number; lower: number; upper: number; n: number; decisive?: boolean };
export type Observation = { id: string; group: string; value: number | null };
export type BoxSummary = { group: string; low: number; q1: number; median: number; q3: number; high: number; n: number };
export type PairedObservation = { id: string; before: number | null; after: number | null };
export type TrendPoint = { time: string; estimate: number | null; lower: number | null; upper: number | null; n: number };
export type RegressionObservation = { id: string; x: number; y: number; fitted: number; residual: number };
export type FitPoint = { x: number; estimate: number; lower: number; upper: number };

export function finite(value: number, name: string) {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}
export function sampleSize(n: number) {
  if (!Number.isInteger(n) || n < 1) throw new Error("n must be a positive integer of the declared sampling unit");
}
export function intervalDefinition(definition: IntervalDefinition) {
  if (!definition.method.trim() || !definition.samplingUnit.trim()) throw new Error("Declare interval method and independent sampling unit");
  if (["CI", "prediction"].includes(definition.kind) && !(typeof definition.level === "number" && definition.level > 0 && definition.level < 1)) throw new Error("CI/prediction interval needs level in (0,1)");
}
export function intervalGeometry(estimate: number, lower: number, upper: number) {
  [estimate, lower, upper].forEach(v => finite(v, "interval"));
  if (lower > estimate || estimate > upper) throw new Error("Interval must satisfy lower <= estimate <= upper");
}
export function uniqueIds(rows: Array<{ id: string }>) {
  if (rows.some(r => !r.id.trim()) || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error("Observation IDs must be present and unique");
}
export function intervalLabel(d: IntervalDefinition) { return `${d.level ? `${Math.round(d.level * 100)}% ` : ""}${d.kind}`; }
/** Stable, non-random display jitter. Never modifies the quantitative value. */
export function jitterForId(id: string, width = .16) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (((hash >>> 0) % 1001) / 1000 - .5) * width * 2;
}
export function distributionValue(bins: Array<{ bin: string; count: number | null; group?: string }>, bin: string, group: string, policy: "gap" | "zero" = "gap") {
  const match = bins.find(item => item.bin === bin && (item.group ?? "总体") === group);
  return match ? match.count : policy === "zero" ? 0 : null;
}
export function slopeAxis(valueMode: "numeric" | "rank" = "numeric") { return { type: "value", inverse: valueMode === "rank", minInterval: valueMode === "rank" ? 1 : undefined }; }
