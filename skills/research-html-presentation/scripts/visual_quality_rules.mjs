export function visualMetricFailures(metrics, { hasTypeA = false, hasDensityException = false, repeatedRegionsJustified = false, outputMode = "slide-deck" } = {}) {
  const failures = [];
  if (!metrics || typeof metrics !== "object") return ["browser-metrics-missing"];
  if (outputMode === "slide-deck" && metrics.contentOccupancy < .70) failures.push("content-occupancy");
  if (typeof metrics.paintDensity === "number" && metrics.paintDensity < .38 && !hasDensityException) failures.push("paint-density");
  if (typeof metrics.paintToLayoutRatio === "number" && metrics.paintToLayoutRatio < .45 && !hasDensityException) failures.push("paint-to-layout-ratio");
  if (typeof metrics.internalOccupancy === "number" && metrics.internalOccupancy < .60) failures.push("internal-occupancy");
  if (metrics.moduleInternalOccupancy === "not-applicable" && metrics.measurableModuleCount > 0) failures.push("module-measurement-missing");
  if (typeof metrics.moduleInternalOccupancy === "number" && metrics.moduleInternalOccupancy < .30) failures.push("module-internal-occupancy");
  if (outputMode === "slide-deck" && metrics.lowerHalfCoverage < .45 && !hasDensityException) failures.push("lower-half-coverage");
  if (metrics.repeatedEqualRegionCount >= 3 && !repeatedRegionsJustified) failures.push("repeated-equal-regions");
  if (metrics.repeatedEqualRegionCount >= 3 && repeatedRegionsJustified && typeof metrics.moduleInternalOccupancy === "number" && metrics.moduleInternalOccupancy < .50) failures.push("justified-equal-regions-underfilled");
  if (hasTypeA && !Number.isFinite(metrics.plotOccupancy)) failures.push("type-a-plot-occupancy");
  if (outputMode === "slide-deck" && hasTypeA && typeof metrics.dominantVisualRatio === "number" && metrics.dominantVisualRatio < .40) failures.push("decisive-visual-too-small");
  if (Number(metrics.layoutClusterSize ?? 0) > 2) failures.push("cross-page-layout-repetition");
  if (Number(metrics.layoutFamilyClusterSize ?? 0) > 2) failures.push("cross-page-layout-family-repetition");
  if (Number(metrics.browserErrorCount ?? 0) > 0) failures.push("browser-measurement-error");
  return failures;
}

const silhouetteRequirements = {
  "dominant-figure-aside": { all: ["dominant", "aside"] },
  "figure-support-matrix": { all: ["dominant", "support"], minimum: { support: 1 } },
  "comparison-bridge": { all: ["comparison-left", "comparison-right", "bridge"] },
  "process-board": { all: ["process-flow"] },
  "evidence-table-board": { all: ["evidence-table", "interpretation"] },
  "chart-interpretation-strip": { all: ["chart", "interpretation-strip"] },
  "hierarchy-map": { all: ["hierarchy-root", "hierarchy-node", "hierarchy-edge"], minimum: { "hierarchy-node": 3 } },
  "synthesis-matrix": { all: ["synthesis-axis", "synthesis-cell"], minimum: { "synthesis-cell": 4 } },
  "multi-panel-evidence": { all: ["evidence-panel"], minimum: { "evidence-panel": 3 } },
  "text-structure-board": { all: ["structure-section"], minimum: { "structure-section": 2 } },
};

export function silhouetteStructureFailures(declared, roleCounts = {}) {
  if (!declared) return ["body-silhouette-missing"];
  const requirement = silhouetteRequirements[declared];
  if (!requirement) return ["body-silhouette-unknown"];
  const failures = [];
  for (const role of requirement.all) if (!Number(roleCounts[role] ?? 0)) failures.push(`silhouette-role-missing:${role}`);
  for (const [role, minimum] of Object.entries(requirement.minimum ?? {})) if (Number(roleCounts[role] ?? 0) < minimum) failures.push(`silhouette-role-count:${role}`);
  return failures;
}

export function referenceCalibrationFailures(contract, calibration, { stage = "complete" } = {}) {
  if (!contract?.sourceRefs?.length) return [];
  const failures = [];
  if (stage === "complete" && contract.calibrationStatus !== "reviewed") failures.push("reference-contract-not-reviewed");
  if (!calibration) return [...failures, "reference-calibration-missing"];
  if (stage === "complete" && calibration.status !== "reviewed") failures.push("reference-calibration-not-reviewed");
  const requiredChecks = ["titleGeometry", "bodySilhouette", "dominantVisual", "imageTextRatio", "sharedEdgeBehavior", "accentPolicy", "prohibitedTraits"];
  const checked = new Set(calibration.checked ?? []);
  for (const item of requiredChecks) if (!checked.has(item)) failures.push(`reference-calibration-check-missing:${item}`);
  if (!calibration.evidence?.length) failures.push("reference-calibration-evidence-missing");
  return failures;
}
