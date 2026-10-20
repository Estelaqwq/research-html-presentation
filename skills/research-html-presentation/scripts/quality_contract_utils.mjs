const densitySeverity = (stage, value, prototypeHardFloor) => stage === "complete" || value < prototypeHardFloor ? "error" : "warning";

export function densityFindings({ contentOccupancy = 1, paintDensity = 1, paintToLayoutRatio = 1, internalOccupancy = 1, moduleInternalOccupancy = 1, lowerHalfCoverage = 1, dominantVisualRatio = "not-applicable", densityException = false, repeatedEqualRegionCount = 0, repeatedRegionsJustified = false, layoutClusterSize = 1, layoutFamilyClusterSize = 1, hasTypeA = false, plotOccupancy = "not-applicable", metricsFinite = true, stage = "complete" } = {}) {
  const findings = [];
  const blocking = stage === "complete";
  if (contentOccupancy < 0.70) findings.push({ type: "content-occupancy", severity: densitySeverity(stage, contentOccupancy, 0.45) });
  if (paintDensity < 0.38 && !densityException) findings.push({ type: "paint-density", severity: densitySeverity(stage, paintDensity, 0.24) });
  if (paintToLayoutRatio < 0.45 && !densityException) findings.push({ type: "paint-to-layout-ratio", severity: densitySeverity(stage, paintToLayoutRatio, 0.30) });
  if (internalOccupancy < 0.60) findings.push({ type: "evidence-wrapper-occupancy", severity: densitySeverity(stage, internalOccupancy, 0.25) });
  if (moduleInternalOccupancy < 0.30) findings.push({ type: "module-internal-occupancy", severity: densitySeverity(stage, moduleInternalOccupancy, 0.15) });
  if (lowerHalfCoverage < 0.45 && !densityException) findings.push({ type: "lower-half-coverage", severity: densitySeverity(stage, lowerHalfCoverage, 0.20) });
  if (!metricsFinite) findings.push({ type: "metric-integrity", severity: "error" });
  if (repeatedEqualRegionCount >= 3 && !repeatedRegionsJustified) findings.push({ type: "repeated-equal-regions", severity: blocking ? "error" : "warning" });
  if (repeatedEqualRegionCount >= 3 && repeatedRegionsJustified && moduleInternalOccupancy < 0.50) findings.push({ type: "justified-equal-regions-underfilled", severity: blocking ? "error" : "warning" });
  if (hasTypeA && Number.isFinite(dominantVisualRatio) && dominantVisualRatio < 0.40) findings.push({ type: "decisive-visual-too-small", severity: blocking ? "error" : "warning" });
  if (layoutClusterSize > 2) findings.push({ type: "cross-page-layout-repetition", severity: blocking ? "error" : "warning" });
  if (layoutFamilyClusterSize > 2) findings.push({ type: "cross-page-layout-family-repetition", severity: blocking ? "error" : "warning" });
  if (plotOccupancy !== "not-applicable" && Number.isFinite(plotOccupancy) && plotOccupancy < 0.5) findings.push({ type: "chart-plot-occupancy", severity: blocking ? "error" : "warning" });
  return findings;
}

export function processBoardFindings({ widthRatio = 1, heightRatio = 1, nodeOccupancy = 1, minimumLabelPx = 24, supportGapPx = 0 } = {}) {
  const findings = [];
  const severity = "error";
  if (widthRatio < 0.80) findings.push({ type: "process-flow-too-narrow", severity });
  if (heightRatio < 0.28) findings.push({ type: "process-flow-too-short", severity });
  if (nodeOccupancy < 0.30) findings.push({ type: "process-node-occupancy", severity });
  if (minimumLabelPx < 18) findings.push({ type: "process-label-too-small", severity });
  if (supportGapPx > 36) findings.push({ type: "process-support-gap", severity });
  return findings;
}

export function titleFindings({ lineCount = 1, mode = "single-line", orphan = false, collision = false, clipped = false, stage = "complete" } = {}) {
  const findings = [];
  const severity = stage === "complete" ? "error" : "warning";
  if (lineCount > 2) findings.push({ type: "title-more-than-two-lines", severity });
  if (mode === "single-line" && lineCount > 1) findings.push({ type: "title-unexpected-wrap", severity });
  if (orphan) findings.push({ type: "orphan-title-line", severity });
  if (collision) findings.push({ type: "title-geometry-overlap", severity });
  if (clipped) findings.push({ type: "title-clipped", severity });
  return findings;
}

export function interactionFindings({ titleBasisMetrics = [], mustShowMetrics = [], defaultVisibleMetrics = [], resetVisibleMetrics = [], printVisibleMetrics = [], stage = "complete" } = {}) {
  const severity = stage === "complete" ? "error" : "warning";
  const defaults = new Set(defaultVisibleMetrics);
  const reset = new Set(resetVisibleMetrics);
  const print = new Set(printVisibleMetrics);
  const findings = [];
  for (const metric of [...titleBasisMetrics, ...mustShowMetrics]) if (!defaults.has(metric)) findings.push({ type: "interactive-evidence-hidden", metric, severity });
  for (const metric of [...titleBasisMetrics, ...mustShowMetrics]) if (!reset.has(metric)) findings.push({ type: "interactive-evidence-reset-hidden", metric, severity });
  for (const metric of [...new Set([...titleBasisMetrics, ...mustShowMetrics])]) if (!print.has(metric)) findings.push({ type: "interactive-evidence-print-hidden", metric, severity });
  return findings;
}

export function narrativeMappingFindings({ pages = [], narrativeUnits = [], stage = "complete" } = {}) {
  const severity = stage === "complete" ? "error" : "warning";
  const known = new Set(narrativeUnits.map((unit) => unit.id));
  const seen = new Set();
  const findings = [];
  for (const page of pages) {
    const id = page.narrativeUnitId;
    if (!id || !known.has(id)) findings.push({ type: "narrative-unit-missing", page: page.id, severity });
    if (seen.has(id)) findings.push({ type: "narrative-unit-reuse", page: page.id, narrativeUnitId: id, severity });
    seen.add(id);
  }
  return findings;
}
