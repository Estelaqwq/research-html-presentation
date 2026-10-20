import type {
  BaseImageValue,
  EditPatchOperation,
  EditPatchValidationResult,
  EditableFieldDefinition,
  EditableImageDefinition,
  EditableRegistry,
  EditableTextDefinition,
  EffectiveEditValue,
  PresentationEditPatch,
  TextBoxSize,
} from "./EditPatchTypes";

const HTML_TAG = /<\/?[a-z][^>]*>/i;
const INTERNAL_COPY = /\b(?:model\s+gate|source\s+lock|manifest|runtime|adequacy|leakage\s+audit|qa)\b|门控|证据状态|泄漏审计/i;
const FINAL_MODEL_COPY = /最终模型|最佳模型|已经优化|当前最优方案|globally\s+best|final\s+model|best\s+model|fully\s+optimized/i;
const COMPARISON_WORDS = /(?:高于|低于|增加|下降|领先|落后|最高|最低|大于|小于|不低于|不高于|higher|lower|increase|decrease|above|below|best|worst)/gi;
const VALUE_TOKENS = /[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:%|％|px|mm|cm|kg|g|mg|μg|ug|mL|ml|L|℃|°C|s|ms|min|h|Hz|kHz|MHz|GHz|MB|GB|TB|倍|个百分点|人|例|项|条|个|组|年|月|日)?/gi;
const IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);

export function editFieldKey(targetId: string, field: string) { return `${targetId}::${field}`; }

export function operationChannel(operation: EditPatchOperation) {
  if (operation.operation === "replace-text") return "text";
  if (operation.operation === "replace-image") return "source";
  if (operation.operation === "set-text-box-size" || operation.operation === "set-element-size") return "size";
  if (operation.operation === "set-image-fit") return "fit";
  if (operation.operation === "set-image-position") return "position";
  return operation.value;
}

export function extractEvidenceTokens(value: string) {
  return (value.match(VALUE_TOKENS) ?? []).map((token) => token.replace(/\s+/g, "").replace("％", "%").toLowerCase());
}
export function extractComparisonTokens(value: string) { return (value.match(COMPARISON_WORDS) ?? []).map((token) => token.toLowerCase()); }
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const isImageField = (field: EditableFieldDefinition): field is EditableImageDefinition => field.kind === "image";
const isTextField = (field: EditableFieldDefinition): field is EditableTextDefinition => !isImageField(field);

function fieldMap(registry: EditableRegistry) {
  return new Map(registry.fields.map((field) => [editFieldKey(field.targetId, field.field), field]));
}

function validateSize(value: TextBoxSize, field: EditableFieldDefinition, at: string, errors: string[]) {
  const rules = field.resize;
  if (!rules) { errors.push(`${at}: field does not allow element resizing`); return; }
  if (!value || typeof value !== "object" || Array.isArray(value)) { errors.push(`${at}: size value must be an object`); return; }
  if (Object.keys(value).some((key) => !new Set(["width", "minHeight"]).has(key))) errors.push(`${at}: size value contains an unsupported property`);
  const snap = rules.snap ?? 8;
  for (const [name, minimum, maximum] of [["width", rules.minWidth, rules.maxWidth], ["minHeight", rules.minHeight, rules.maxMinHeight]] as const) {
    const number = value[name];
    if (number === undefined) continue;
    if (!Number.isFinite(number) || number < minimum || number > maximum) errors.push(`${at}: ${name} is outside ${minimum}–${maximum}`);
    else if (Math.abs(number / snap - Math.round(number / snap)) > .001) errors.push(`${at}: ${name} must snap to ${snap}px`);
  }
}

function validRelativeImageSource(src: string) {
  return typeof src === "string" && src.length > 0 && !/^(?:[a-z]+:|\/|\\)/i.test(src) && !src.split(/[\\/]/).includes("..");
}

function validateImageAsset(value: unknown, at: string, errors: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) { errors.push(`${at}: replace-image value must be a managed asset object`); return; }
  const asset = value as Record<string, unknown>;
  const allowed = new Set(["assetId", "src", "sha256", "mimeType", "byteSize", "width", "height"]);
  if (Object.keys(asset).some((key) => !allowed.has(key))) errors.push(`${at}: managed image contains unsupported properties`);
  if (typeof asset.assetId !== "string" || !/^[a-zA-Z0-9._-]{8,128}$/.test(asset.assetId)) errors.push(`${at}: assetId is invalid`);
  if (!validRelativeImageSource(String(asset.src ?? ""))) errors.push(`${at}: image src must be a safe project-relative path`);
  if (typeof asset.sha256 !== "string" || !/^sha256:[a-f0-9]{64}$/i.test(asset.sha256)) errors.push(`${at}: image sha256 is invalid`);
  if (!IMAGE_MIME.has(String(asset.mimeType))) errors.push(`${at}: image MIME is not allowed`);
  if (!Number.isInteger(asset.byteSize) || Number(asset.byteSize) <= 0 || Number(asset.byteSize) > 8 * 1024 * 1024) errors.push(`${at}: image byteSize is outside 1–8388608`);
  if (!Number.isInteger(asset.width) || Number(asset.width) <= 0 || !Number.isInteger(asset.height) || Number(asset.height) <= 0) errors.push(`${at}: image dimensions must be positive integers`);
}

export function validateReplacementText(value: string, field: EditableTextDefinition, options: { localAuthoring?: boolean } = {}) {
  const errors: string[] = [];
  if (field.strategy === "locked") errors.push("field is locked");
  if (typeof value !== "string") return ["replacement value must be a string"];
  if (HTML_TAG.test(value)) errors.push("HTML markup is not allowed");
  if (/\u0000/.test(value)) errors.push("NUL characters are not allowed");
  // Local Authoring validates only the technical patch boundary. Meaning,
  // evidence, academic tone, and layout are not reasons to reject a user's
  // text; those checks remain available to the formal release path below.
  if (options.localAuthoring) return errors;
  if (field.plainLanguage && INTERNAL_COPY.test(value)) errors.push("audience copy exposes an internal Gate/runtime/QA term");
  // Legacy v1 fields retain the strict token lock. V2 evidence fields set
  // reviewOnChange and may be saved locally only with an explicit review state.
  if (field.strategy === "evidence-copy" && !field.reviewOnChange) {
    if (!same(extractEvidenceTokens(field.baseValue), extractEvidenceTokens(value))) errors.push("evidence-copy numbers, percentages, or units changed");
    if (!same(extractComparisonTokens(field.baseValue), extractComparisonTokens(value))) errors.push("evidence-copy comparison direction changed");
  }
  if (field.strategy === "evidence-copy") {
    if (!field.basisIds?.length) errors.push("evidence-copy field has no finding/claim/result basis IDs");
    if (["limited", "preliminary"].includes(field.modelSearchAdequacy ?? "") && FINAL_MODEL_COPY.test(value)) errors.push("limited/preliminary model search cannot be described as final, best, or optimized");
  }
  return errors;
}

export function operationNeedsEvidenceReview(field: EditableFieldDefinition, operation: EditPatchOperation, options: { localAuthoring?: boolean } = {}) {
  if (operation.operation === "reset-field" || operation.operation === "reset-image") return false;
  if (options.localAuthoring && isTextField(field)) return false;
  if (field.reviewOnChange) return true;
  if (isImageField(field)) return field.strategy === "evidence-image";
  return field.strategy === "evidence-copy";
}

export function validateEditPatch(patch: PresentationEditPatch, registry: EditableRegistry, options: { release?: boolean; localAuthoring?: boolean } = {}): EditPatchValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!patch || typeof patch !== "object") return { valid: false, errors: ["patch must be an object"], warnings };
  if (patch.schemaVersion !== registry.schemaVersion) errors.push("patch schemaVersion does not match the editable registry");
  const v2 = patch.schemaVersion === "2.0";
  const statuses = ["clean", "rebased", "conflict", "orphaned"];
  if (!statuses.includes(patch.status)) errors.push(`status is invalid for schema ${patch.schemaVersion}`);
  else if (["conflict", "orphaned"].includes(patch.status)) errors.push(`patch status '${patch.status}' requires Codex resolution before it can be applied`);
  if (!Number.isInteger(patch.revision) || patch.revision < 0) errors.push("revision must be a non-negative integer");
  if (patch.projectId !== registry.projectId) errors.push("projectId does not match the editable registry");
  if (patch.outputMode !== registry.outputMode) errors.push("outputMode does not match the editable registry");
  if (patch.baseFingerprint !== registry.baseFingerprint) errors.push("baseFingerprint does not match the current base presentation");
  if (!patch.savedAt || Number.isNaN(Date.parse(patch.savedAt))) errors.push("savedAt must be an ISO timestamp");
  if (!Array.isArray(patch.operations)) errors.push("operations must be an array");
  const fields = fieldMap(registry);
  const operationIds = new Set<string>();
  let pendingReview = false;
  let verifiedReview = false;
  for (const [index, operation] of (patch.operations ?? []).entries()) {
    const at = `operation ${index + 1}`;
    if (!operation || typeof operation !== "object") { errors.push(`${at}: operation must be an object`); continue; }
    if (!operation.operationId || operationIds.has(operation.operationId)) errors.push(`${at}: operationId must be unique and non-empty`);
    operationIds.add(operation.operationId);
    const v1Operations = ["replace-text", "set-text-box-size", "reset-field"];
    const v2Operations = ["replace-text", "replace-image", "set-image-fit", "set-image-position", "set-element-size", "reset-field", "reset-image"];
    if (!(v2 ? v2Operations : v1Operations).includes(operation.operation)) errors.push(`${at}: unsupported operation for schema ${patch.schemaVersion}`);
    const definition = fields.get(editFieldKey(operation.targetId, operation.field));
    if (!definition) { errors.push(`${at}: targetId/field is not in the editable registry`); continue; }
    if (operation.scope !== definition.scope) errors.push(`${at}: scope does not match the editable registry`);
    if (operation.expectedValueHash !== definition.expectedValueHash) errors.push(`${at}: expectedValueHash does not match the base field`);
    if (!operation.validation || operation.validation.strategy !== definition.strategy) errors.push(`${at}: validation requirements do not match the field strategy`);
    if (isTextField(definition) && operation.validation?.plainText !== true) errors.push(`${at}: text operation must declare plainText=true`);
    if (!same(operation.validation?.basisIds ?? [], definition.basisIds ?? [])) errors.push(`${at}: validation basis IDs do not match the editable registry`);
    if (Boolean(operation.validation?.reviewOnChange) !== Boolean(definition.reviewOnChange)) errors.push(`${at}: validation reviewOnChange does not match the editable registry`);
    if (definition.strategy === "locked" && !operation.operation.startsWith("reset-")) errors.push(`${at}: locked fields cannot be modified`);
    if (operation.operation === "replace-text") {
      if (!isTextField(definition)) errors.push(`${at}: replace-text requires a text target`);
       else errors.push(...validateReplacementText(operation.value, definition, options).map((message) => `${at}: ${message}`));
    } else if (operation.operation === "replace-image") {
      if (!isImageField(definition)) errors.push(`${at}: replace-image requires an image target`);
      validateImageAsset(operation.value, at, errors);
    } else if (operation.operation === "set-image-fit") {
      if (!isImageField(definition)) errors.push(`${at}: set-image-fit requires an image target`);
      else if (!(definition.allowedFits ?? ["contain", "cover"]).includes(operation.value)) errors.push(`${at}: image fit is not allowed for this target`);
    } else if (operation.operation === "set-image-position") {
      if (!isImageField(definition)) errors.push(`${at}: set-image-position requires an image target`);
      if (!operation.value || !Number.isFinite(operation.value.x) || !Number.isFinite(operation.value.y) || operation.value.x < 0 || operation.value.x > 100 || operation.value.y < 0 || operation.value.y > 100) errors.push(`${at}: image position must contain x/y percentages from 0 to 100`);
    } else if (operation.operation === "set-text-box-size" || operation.operation === "set-element-size") {
      validateSize(operation.value, definition, at, errors);
    } else if (operation.operation === "reset-field") {
      if (!isTextField(definition) || !["text", "size", "all"].includes(operation.value)) errors.push(`${at}: reset-field requires a text target and text, size, or all`);
    } else if (operation.operation === "reset-image" && (!isImageField(definition) || !["source", "fit", "position", "size", "all"].includes(operation.value))) errors.push(`${at}: reset-image requires an image target and a supported channel`);
    if (!options.localAuthoring && definition.basisIds?.some((id) => !registry.evidenceIds?.includes(id))) errors.push(`${at}: one or more basis IDs do not resolve in registry.evidenceIds`);

    const needsReview = v2 && operationNeedsEvidenceReview(definition, operation, options);
    if (needsReview) {
      if (!operation.review || !["pending", "verified"].includes(operation.review.status)) errors.push(`${at}: evidence-sensitive change requires a pending or verified review record`);
      else if (operation.review.status === "pending") pendingReview = true;
      else {
        verifiedReview = true;
        if (!operation.review.verifiedAt || Number.isNaN(Date.parse(operation.review.verifiedAt)) || !operation.review.verificationId || !/^sha256:[a-f0-9]{64}$/i.test(operation.review.verifiedValueHash ?? "")) errors.push(`${at}: verified review requires verifiedAt, verificationId, and verifiedValueHash`);
      }
    } else if (operation.review && !(options.localAuthoring && isTextField(definition))) errors.push(`${at}: non-sensitive operation must not carry an evidence review record`);
    else if (options.localAuthoring && isTextField(definition) && operation.review?.status === "pending") pendingReview = true;
    else if (options.localAuthoring && isTextField(definition) && operation.review?.status === "verified") verifiedReview = true;
  }
  if (v2) {
    const expectedReviewStatus = pendingReview ? "needs-evidence-review" : verifiedReview ? "verified" : "not-required";
    if (patch.reviewStatus !== expectedReviewStatus) errors.push(`patch.reviewStatus must be '${expectedReviewStatus}' for its operations`);
  }
  if (pendingReview) warnings.push("patch contains evidence-sensitive edits that require verification before release");
  if (options.release && pendingReview) errors.push("release validation blocks needs-evidence-review edits");
  return { valid: errors.length === 0, errors, warnings, needsEvidenceReview: pendingReview };
}

function baseEffectiveValue(field: EditableFieldDefinition): EffectiveEditValue {
  if (isImageField(field)) return { kind: "image", image: field.baseValue, fit: field.baseValue.fit, position: field.baseValue.position, size: field.resize?.defaultValue };
  return { kind: "text", text: field.baseValue, size: field.resize?.defaultValue };
}

export function applyEditPatch(registry: EditableRegistry, patch?: PresentationEditPatch | null, options: { release?: boolean; localAuthoring?: boolean } = {}) {
  const values = new Map<string, EffectiveEditValue>();
  registry.fields.forEach((field) => values.set(field.editId, baseEffectiveValue(field)));
  if (!patch) return { values, validation: { valid: true, errors: [], warnings: [], needsEvidenceReview: false } as EditPatchValidationResult };
  const validation = validateEditPatch(patch, registry, options);
  if (!validation.valid) return { values, validation };
  const byTarget = fieldMap(registry);
  for (const operation of patch.operations) {
    const definition = byTarget.get(editFieldKey(operation.targetId, operation.field));
    if (!definition) continue;
    const current = values.get(definition.editId) ?? baseEffectiveValue(definition);
    if (operation.operation === "replace-text") values.set(definition.editId, { ...current, text: operation.value });
    else if (operation.operation === "replace-image") values.set(definition.editId, { ...current, image: { ...operation.value, alt: isImageField(definition) ? definition.baseValue.alt : "" } });
    else if (operation.operation === "set-text-box-size" || operation.operation === "set-element-size") values.set(definition.editId, { ...current, size: { ...current.size, ...operation.value } });
    else if (operation.operation === "set-image-fit") values.set(definition.editId, { ...current, fit: operation.value });
    else if (operation.operation === "set-image-position") values.set(definition.editId, { ...current, position: operation.value });
    else if (operation.operation === "reset-field") {
      const base = baseEffectiveValue(definition);
      values.set(definition.editId, { ...current, text: operation.value === "text" || operation.value === "all" ? base.text : current.text, size: operation.value === "size" || operation.value === "all" ? base.size : current.size });
    } else if (operation.operation === "reset-image" && isImageField(definition)) {
      const base = baseEffectiveValue(definition);
      values.set(definition.editId, {
        ...current,
        image: operation.value === "source" || operation.value === "all" ? base.image : current.image,
        fit: operation.value === "fit" || operation.value === "all" ? base.fit : current.fit,
        position: operation.value === "position" || operation.value === "all" ? base.position : current.position,
        size: operation.value === "size" || operation.value === "all" ? base.size : current.size,
      });
    }
  }
  return { values, validation };
}

export function validationRequirements(field: EditableFieldDefinition, options: { localAuthoring?: boolean } = {}) {
  return {
    strategy: field.strategy,
    plainText: isTextField(field) ? true as const : undefined,
    basisIds: field.basisIds,
    lockedTokens: !options.localAuthoring && isTextField(field) && field.strategy === "evidence-copy" && !field.reviewOnChange ? extractEvidenceTokens(field.baseValue) : undefined,
    comparisonTokens: !options.localAuthoring && isTextField(field) && field.strategy === "evidence-copy" && !field.reviewOnChange ? extractComparisonTokens(field.baseValue) : undefined,
    modelSearchAdequacy: !options.localAuthoring && isTextField(field) ? field.modelSearchAdequacy : undefined,
    plainLanguage: !options.localAuthoring && isTextField(field) ? field.plainLanguage : undefined,
    reviewOnChange: field.reviewOnChange,
    sizeBounds: field.resize ? { minWidth: field.resize.minWidth, maxWidth: field.resize.maxWidth, minHeight: field.resize.minHeight, maxMinHeight: field.resize.maxMinHeight, snap: field.resize.snap ?? 8 } : undefined,
  };
}

const MODEL_COPY_FIELDS = new Set(["title", "section", "chapter"]);
export function applyEditValuesToPresentationItems<T extends { id: string }>(items: T[], registry: EditableRegistry, values: Map<string, EffectiveEditValue>) {
  const definitionsByTarget = new Map<string, EditableTextDefinition[]>();
  registry.fields.forEach((field) => {
    if (!isTextField(field) || !MODEL_COPY_FIELDS.has(field.field)) return;
    definitionsByTarget.set(field.targetId, [...(definitionsByTarget.get(field.targetId) ?? []), field]);
  });
  return items.map((item) => {
    const definitions = definitionsByTarget.get(item.id);
    if (!definitions?.length) return item;
    const copy: Record<string, unknown> = { ...item };
    definitions.forEach((field) => { if (typeof copy[field.field] === "string") copy[field.field] = values.get(field.editId)?.text ?? field.baseValue; });
    return copy as T;
  });
}

export function effectiveImageBase(field: EditableImageDefinition): BaseImageValue { return field.baseValue; }
