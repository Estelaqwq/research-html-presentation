import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const PATCH_FILENAME = "presentation-edit-patch.json";
export const REGISTRY_FILENAME = "presentation-edit-registry.json";
const textOps = new Set(["replace-text", "set-text-box-size", "reset-field"]);
const v2Ops = new Set(["replace-text", "replace-image", "set-image-fit", "set-image-position", "set-element-size", "reset-field", "reset-image"]);
const mime = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);
const sha = (value) => `sha256:${createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex")}`;
const list = (value) => Array.isArray(value) ? value : [];
const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const isImage = (field) => field?.kind === "image";
const key = (field) => `${field?.targetId}::${field?.field}`;
const safeRelative = (value) => typeof value === "string" && value.length > 0 && !/^(?:[a-z]+:|[\\/])/i.test(value) && !value.split(/[\\/]/).includes("..");
const html = /<\/?[a-z][^>]*>/i;
const generatedTarget = /^[a-z0-9._:-]+\/[a-z0-9._:-]+\/[a-z0-9._:-]+$/i;

function validateSize(value, field, at, failures) {
  const rule = field.resize;
  if (!rule || !value || typeof value !== "object" || Array.isArray(value)) { failures.push(`${at}: field does not allow an element-size value`); return; }
  const snap = rule.snap ?? 8;
  for (const [name, low, high] of [["width", rule.minWidth, rule.maxWidth], ["minHeight", rule.minHeight, rule.maxMinHeight]]) {
    if (value[name] === undefined) continue;
    if (!Number.isFinite(value[name]) || value[name] < low || value[name] > high) failures.push(`${at}: ${name} is outside ${low}–${high}`);
    else if (Math.abs(value[name] / snap - Math.round(value[name] / snap)) > .001) failures.push(`${at}: ${name} must snap to ${snap}px`);
  }
}

function validateAsset(asset, at, failures) {
  if (!asset || typeof asset !== "object" || Array.isArray(asset)) { failures.push(`${at}: replace-image requires a managed image asset`); return; }
  const permitted = new Set(["assetId", "src", "sha256", "mimeType", "byteSize", "width", "height"]);
  const extra = Object.keys(asset).filter((name) => !permitted.has(name));
  if (extra.length) failures.push(`${at}: image asset has unsupported properties`);
  if (!/^[A-Za-z0-9._-]{8,128}$/.test(String(asset.assetId ?? ""))) failures.push(`${at}: image assetId is invalid`);
  if (!safeRelative(asset.src)) failures.push(`${at}: image source must be a safe project-relative path`);
  if (!/^sha256:[a-f0-9]{64}$/i.test(String(asset.sha256 ?? ""))) failures.push(`${at}: image sha256 is invalid`);
  if (!mime.has(asset.mimeType)) failures.push(`${at}: image MIME is not allowed`);
  if (!Number.isInteger(asset.byteSize) || asset.byteSize < 1 || asset.byteSize > 8 * 1024 * 1024) failures.push(`${at}: image byteSize is outside 1–8388608`);
  if (!Number.isInteger(asset.width) || asset.width < 1 || !Number.isInteger(asset.height) || asset.height < 1) failures.push(`${at}: image dimensions must be positive integers`);
}

function runtimeFieldFromOperation(operation, registry) {
  if (!generatedTarget.test(String(operation?.targetId ?? "")) || !hasText(operation?.field) || !/^sha256:[a-f0-9]{64}$/i.test(String(operation?.expectedValueHash ?? ""))) return null;
  if (!["shared", "slide-deck", "scroll-report"].includes(operation.scope) || ![registry.outputMode, "shared"].includes(operation.scope)) return null;
  const image = ["replace-image", "set-image-fit", "set-image-position", "reset-image"].includes(operation.operation);
  const strategy = operation.validation?.strategy;
  if (!(image ? ["plain-image", "evidence-image"].includes(strategy) : ["plain-copy", "evidence-copy", "locked"].includes(strategy))) return null;
  const bounds = operation.validation?.sizeBounds;
  const resize = bounds && typeof bounds === "object" ? {
    mode: registry.outputMode === "scroll-report" ? "report" : "slide",
    minWidth: Number(bounds.minWidth), maxWidth: Number(bounds.maxWidth), minHeight: Number(bounds.minHeight), maxMinHeight: Number(bounds.maxMinHeight), snap: Number(bounds.snap ?? 8),
  } : undefined;
  return {
    editId: `edit:${operation.targetId}`,
    targetId: operation.targetId,
    field: operation.field,
    scope: operation.scope,
    strategy,
    kind: image ? "image" : "text",
    baseValue: image ? { src: "assets/editor-runtime-placeholder.png", alt: "" } : "",
    expectedValueHash: operation.expectedValueHash,
    basisIds: list(operation.validation?.basisIds),
    reviewOnChange: Boolean(operation.validation?.reviewOnChange),
    allowedFits: ["contain", "cover"],
    resize,
  };
}

function mergeRuntimeRegistry(registry, runtimeRegistry, failures) {
  if (!runtimeRegistry || typeof runtimeRegistry !== "object" || Array.isArray(runtimeRegistry)) {
    failures.push("runtime Registry must be an object");
    return registry;
  }
  for (const [name, expected] of [["schemaVersion", registry.schemaVersion], ["projectId", registry.projectId], ["outputMode", registry.outputMode], ["baseFingerprint", registry.baseFingerprint]]) {
    if (runtimeRegistry[name] !== expected) failures.push(`runtime Registry ${name} does not match the project Registry`);
  }
  const baseEvidence = list(registry.evidenceIds);
  const runtimeEvidence = list(runtimeRegistry.evidenceIds);
  if (baseEvidence.some((id) => !runtimeEvidence.includes(id))) failures.push("runtime Registry cannot remove evidence IDs from the project Registry");
  const runtimeFields = list(runtimeRegistry.fields);
  const byEditId = new Map(runtimeFields.map((field) => [field?.editId, field]));
  for (const baseField of list(registry.fields)) {
    const candidate = byEditId.get(baseField?.editId);
    if (!candidate || candidate.targetId !== baseField.targetId || candidate.field !== baseField.field || candidate.expectedValueHash !== baseField.expectedValueHash) failures.push(`runtime Registry must preserve base field '${baseField?.editId}'`);
  }
  return { ...registry, ...runtimeRegistry, fields: runtimeFields, evidenceIds: runtimeEvidence.length ? runtimeEvidence : registry.evidenceIds };
}

export function validateEditPatchDocument(patch, registry, { release = false, localAuthoring = false, runtimeRegistry } = {}) {
  const failures = [], warnings = [];
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return { passed: false, failures: ["patch must be an object"], warnings, counts: { fields: 0, operations: 0 } };
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) return { passed: false, failures: ["editable registry must be an object"], warnings, counts: { fields: 0, operations: 0 } };
  const activeRegistry = runtimeRegistry ? mergeRuntimeRegistry(registry, runtimeRegistry, failures) : registry;
  const v2 = patch.schemaVersion === "2.0";
  if (!["1.0", "2.0"].includes(patch.schemaVersion) || patch.schemaVersion !== activeRegistry.schemaVersion) failures.push("patch.schemaVersion must match Registry schemaVersion 1.0 or 2.0");
  if (!["clean", "rebased", "conflict", "orphaned"].includes(patch.status)) failures.push("patch.status is invalid");
  if (["conflict", "orphaned"].includes(patch.status)) failures.push(`patch.status '${patch.status}' requires Codex resolution before application`);
  if (!Number.isInteger(patch.revision) || patch.revision < 0) failures.push("patch.revision must be a non-negative integer");
  if (!hasText(patch.projectId) || patch.projectId !== activeRegistry.projectId) failures.push("patch.projectId must match the editable registry");
  if (!["slide-deck", "scroll-report"].includes(patch.outputMode) || patch.outputMode !== activeRegistry.outputMode) failures.push("patch.outputMode must match the editable registry");
  if (!/^sha256:[a-f0-9]{64}$/i.test(String(patch.baseFingerprint ?? "")) || patch.baseFingerprint !== activeRegistry.baseFingerprint) failures.push("patch.baseFingerprint must match the current registry fingerprint");
  if (!hasText(patch.savedAt) || Number.isNaN(Date.parse(patch.savedAt))) failures.push("patch.savedAt must be an ISO timestamp");
  if (!Array.isArray(patch.operations)) failures.push("patch.operations must be an array");
  if (v2 && !["not-required", "needs-evidence-review", "verified"].includes(patch.reviewStatus)) failures.push("patch.reviewStatus is required for schemaVersion 2.0");
  if (!Array.isArray(activeRegistry.fields) || !activeRegistry.fields.length) failures.push("registry.fields must contain editable field definitions");

  const fields = new Map(), editIds = new Set(), evidenceIds = new Set(list(activeRegistry.evidenceIds));
  list(activeRegistry.fields).forEach((field, index) => {
    const at = `registry field ${index + 1}`;
    if (!hasText(field?.editId) || editIds.has(field.editId)) failures.push(`${at}: editId must be unique`); else editIds.add(field.editId);
    if (!hasText(field?.targetId) || !hasText(field?.field) || fields.has(key(field))) failures.push(`${at}: targetId/field must be unique`); else fields.set(key(field), field);
    if (!["shared", "slide-deck", "scroll-report"].includes(field?.scope)) failures.push(`${at}: scope is invalid`);
    if (!["plain-copy", "evidence-copy", "locked", "plain-image", "evidence-image"].includes(field?.strategy)) failures.push(`${at}: strategy is invalid`);
    if (isImage(field)) {
      if (!field.baseValue || typeof field.baseValue !== "object" || !safeRelative(field.baseValue.src)) failures.push(`${at}: image baseValue must contain safe relative src`);
    } else if (typeof field?.baseValue !== "string") failures.push(`${at}: text baseValue must be a string`);
    if (field?.expectedValueHash !== sha(field?.baseValue)) failures.push(`${at}: expectedValueHash must equal sha256(baseValue)`);
    if (!localAuthoring && (field.strategy === "evidence-copy" || field.strategy === "evidence-image") && !list(field.basisIds).length) failures.push(`${at}: evidence target requires basisIds`);
    if (!localAuthoring) list(field.basisIds).forEach((id) => { if (!evidenceIds.has(id)) failures.push(`${at}: basisId '${id}' does not resolve`); });
    if (field.selector && (!/\[data-(?:edit-id|content-key|visual-id|figure-id|image-id|slide-id|report-section|finding-id|claim-id)/i.test(field.selector) || /:(?:nth|first|last|only)-|[>+~]/.test(field.selector))) failures.push(`${at}: selector must use stable content identity, not DOM order`);
    if (field.resize) validateSize(field.resize.defaultValue ?? {}, { resize: field.resize }, at, failures);
  });

  const opIds = new Set(); let pending = false, verified = false;
  list(patch.operations).forEach((operation, index) => {
    const at = `operation ${index + 1}`;
    if (!operation || typeof operation !== "object" || Array.isArray(operation)) { failures.push(`${at}: operation must be an object`); return; }
    if (!hasText(operation.operationId) || opIds.has(operation.operationId)) failures.push(`${at}: operationId must be unique`); else opIds.add(operation.operationId);
    if (!(v2 ? v2Ops : textOps).has(operation.operation)) failures.push(`${at}: unsupported operation`);
    const registeredField = fields.get(`${operation.targetId}::${operation.field}`);
    const field = registeredField ?? runtimeFieldFromOperation(operation, activeRegistry);
    const runtime = !registeredField && Boolean(field);
    if (!field) { failures.push(`${at}: targetId/field is not an editable Registry target`); return; }
    if (operation.scope !== field.scope || (!runtime && operation.expectedValueHash !== field.expectedValueHash)) failures.push(`${at}: scope or expectedValueHash does not match Registry`);
    if (!operation.validation || operation.validation.strategy !== field.strategy || JSON.stringify(list(operation.validation.basisIds)) !== JSON.stringify(list(field.basisIds))) failures.push(`${at}: validation metadata does not match Registry`);
    if (!isImage(field) && operation.validation.plainText !== true) failures.push(`${at}: text target must declare plainText=true`);
    if (field.strategy === "locked" && !String(operation.operation).startsWith("reset-")) failures.push(`${at}: locked target cannot be modified`);
    if (operation.operation === "replace-text") {
      if (isImage(field) || typeof operation.value !== "string" || html.test(operation.value) || /\u0000/.test(operation.value)) failures.push(`${at}: replace-text must be plain text for a text target`);
    } else if (operation.operation === "replace-image") {
      if (!isImage(field)) failures.push(`${at}: replace-image requires an image target`);
      validateAsset(operation.value, at, failures);
    } else if (operation.operation === "set-image-fit") {
      if (!isImage(field) || !["contain", "cover"].includes(operation.value) || !(field.allowedFits ?? ["contain", "cover"]).includes(operation.value)) failures.push(`${at}: image fit is not allowed`);
    } else if (operation.operation === "set-image-position") {
      if (!isImage(field) || !operation.value || !Number.isFinite(operation.value.x) || !Number.isFinite(operation.value.y) || operation.value.x < 0 || operation.value.x > 100 || operation.value.y < 0 || operation.value.y > 100) failures.push(`${at}: image position must be x/y between 0 and 100`);
    } else if (operation.operation === "set-text-box-size" || operation.operation === "set-element-size") validateSize(operation.value, field, at, failures);
    else if (operation.operation === "reset-field" && (!["text", "size", "all"].includes(operation.value) || isImage(field))) failures.push(`${at}: reset-field requires text/size/all on a text target`);
    else if (operation.operation === "reset-image" && (!["source", "fit", "position", "size", "all"].includes(operation.value) || !isImage(field))) failures.push(`${at}: reset-image requires image channel`);

    const sensitive = v2 && (localAuthoring ? (isImage(field) && (field.reviewOnChange || field.strategy === "evidence-image")) : (field.reviewOnChange || field.strategy === "evidence-copy" || field.strategy === "evidence-image")) && !String(operation.operation).startsWith("reset-");
    if (sensitive) {
      if (!operation.review || !["pending", "verified"].includes(operation.review.status)) failures.push(`${at}: evidence-sensitive edit requires review`);
      else if (operation.review.status === "pending") pending = true;
      else if (!hasText(operation.review.verifiedAt) || Number.isNaN(Date.parse(operation.review.verifiedAt)) || !hasText(operation.review.verificationId) || !/^sha256:[a-f0-9]{64}$/i.test(String(operation.review.verifiedValueHash ?? ""))) failures.push(`${at}: verified review is incomplete`);
      else verified = true;
    } else if (operation.review && !(localAuthoring && !isImage(field))) failures.push(`${at}: ordinary edit must not carry evidence review`);
    else if (localAuthoring && !isImage(field) && operation.review?.status === "pending") pending = true;
    else if (localAuthoring && !isImage(field) && operation.review?.status === "verified") verified = true;
  });
  const expected = pending ? "needs-evidence-review" : verified ? "verified" : "not-required";
  if (v2 && patch.reviewStatus !== expected) failures.push(`patch.reviewStatus must be '${expected}'`);
  if (pending) warnings.push("patch contains evidence-sensitive edits requiring verification before formal release");
  if (release && pending) failures.push("release validation blocks needs-evidence-review edits");
  return { passed: failures.length === 0, failures, warnings, counts: { fields: fields.size, operations: list(patch.operations).length }, needsEvidenceReview: pending };
}

export async function readAndValidateEditPatch(projectRoot, patchPath, registryPath, options) {
  const root = path.resolve(projectRoot);
  const patchFile = path.resolve(patchPath ?? path.join(root, PATCH_FILENAME));
  const registryFile = path.resolve(registryPath ?? path.join(root, REGISTRY_FILENAME));
  if (patchFile !== path.join(root, PATCH_FILENAME)) throw new Error("patch must be project-root presentation-edit-patch.json");
  if (!(registryFile === path.join(root, REGISTRY_FILENAME) || registryFile.startsWith(`${root}${path.sep}`))) throw new Error("Registry must stay in project root");
  const [patch, registry] = await Promise.all([readFile(patchFile, "utf8").then(JSON.parse), readFile(registryFile, "utf8").then(JSON.parse)]);
  return { projectRoot: root, patchPath: patchFile, registryPath: registryFile, ...validateEditPatchDocument(patch, registry, options) };
}

const main = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (main) {
  const input = path.resolve(process.argv[2] ?? process.cwd());
  const release = process.argv.includes("--release");
  let root = input, patch;
  try { if ((await stat(input)).isFile()) { patch = input; root = path.dirname(input); } } catch {}
  try {
    const report = await readAndValidateEditPatch(root, patch, undefined, { release });
    console.log(JSON.stringify(report, null, 2)); process.exit(report.passed ? 0 : 1);
  } catch (error) { console.error(`[edit-patch-validator] ${error instanceof Error ? error.message : String(error)}`); process.exit(2); }
}
