export const normalizeAudienceCopy = (value) => String(value ?? "").replace(/\s+/g, "").toLowerCase();
export const internalTerms = /\b(?:model\s+gate|source\s+lock|quality\s+gate|evidence\s+copy|manifest|runtime|adequacy|leakage\s+audit|qa)\b|模型\s*gate|证据状态|门控|泄漏审计/i;
export const defensiveShells = /不是.{0,40}而是|而不是|不等于|不能只讲|价值在于|本页|本报告|这组数据|需要组合阅读|机制问题仍需|仍需报告|先.{0,40}再|读法是|为什么本页/i;
export const vagueStandalone = /^(?:进一步完善|进一步整理|正在变得完整|全面提升|形成能力链|作品展示|相关内容|总体介绍|相关工作|研究概况|能力建设)[。.!！]?$/i;
export const placeholderCopy = /(?:未提供|待补充|暂无|不能验证|无法验证|信息缺失|placeholder|todo)/i;

export function highLevelCopyFailures(copy, exception) {
  if (!String(copy ?? "").trim() || String(exception ?? "").trim()) return [];
  const result = [];
  if (internalTerms.test(copy)) result.push("internal-term");
  if (defensiveShells.test(copy)) result.push("defensive-shell");
  if (vagueStandalone.test(String(copy).trim())) result.push("vague-standalone");
  if (placeholderCopy.test(copy)) result.push("placeholder-copy");
  return result;
}

export function repeatsHighLevelJudgment(parts) {
  const normalized = parts.map((part) => normalizeAudienceCopy(part)).filter((part) => part.length >= 10);
  for (let i = 0; i < normalized.length; i += 1) for (let j = i + 1; j < normalized.length; j += 1) {
    const shorter = normalized[i].length <= normalized[j].length ? normalized[i] : normalized[j];
    const longer = normalized[i].length > normalized[j].length ? normalized[i] : normalized[j];
    if (shorter.length >= 12 && longer.includes(shorter)) return true;
  }
  return false;
}
