#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const skillRoot = path.resolve(scriptsDir, "..");
export const schemasDir = path.join(skillRoot, "schemas");
export const schemaFiles = [
  "deck-manifest.schema.json",
  "evidence-registry.schema.json",
  "citation-registry.schema.json",
  "edit-registry.schema.json",
  "edit-patch.schema.json",
  "flow-spec.schema.json",
  "data-health.schema.json",
  "visual-review.schema.json",
  "report-content.schema.json",
];

let schemaCache;
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const pointerToken = (value) => value.replace(/~1/g, "/").replace(/~0/g, "~");

export async function loadContractSchemas() {
  if (schemaCache) return schemaCache;
  const entries = await Promise.all(schemaFiles.map(async (name) => {
    const schema = JSON.parse(await readFile(path.join(schemasDir, name), "utf8"));
    return [name, schema];
  }));
  schemaCache = new Map(entries);
  for (const [name, schema] of entries) if (schema.$id) schemaCache.set(schema.$id, schema);
  return schemaCache;
}

function resolveSchemaRef(ref, currentName, schemas) {
  const [resource, fragment = ""] = ref.split("#", 2);
  const resourceName = resource ? path.basename(resource) : currentName;
  const targetRoot = schemas.get(resource) ?? schemas.get(resourceName);
  if (!targetRoot) throw new Error(`unresolved schema resource '${resource || currentName}'`);
  let target = targetRoot;
  if (fragment) {
    if (!fragment.startsWith("/")) throw new Error(`unsupported schema fragment '#${fragment}'`);
    for (const token of fragment.slice(1).split("/").map(pointerToken)) {
      if (!isObject(target) && !Array.isArray(target) || !(token in target)) throw new Error(`unresolved schema pointer '${ref}'`);
      target = target[token];
    }
  }
  return { schema: target, name: resourceName };
}

function typeMatches(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isObject(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function validateNode(value, schema, context, at, currentName) {
  if (schema === true) return;
  if (schema === false) {
    context.errors.push(`${at}: value is forbidden by schema`);
    return;
  }
  if (!isObject(schema)) {
    context.errors.push(`${at}: invalid schema node`);
    return;
  }
  if (schema.$ref) {
    try {
      const resolved = resolveSchemaRef(schema.$ref, currentName, context.schemas);
      validateNode(value, resolved.schema, context, at, resolved.name);
    } catch (error) {
      context.errors.push(`${at}: ${error.message}`);
    }
  }
  if (schema.const !== undefined && !deepEqual(value, schema.const)) context.errors.push(`${at}: must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((candidate) => deepEqual(candidate, value))) context.errors.push(`${at}: must be one of ${schema.enum.map((item) => JSON.stringify(item)).join(", ")}`);

  if (schema.allOf) schema.allOf.forEach((candidate) => validateNode(value, candidate, context, at, currentName));
  if (schema.anyOf) {
    const matches = schema.anyOf.filter((candidate) => {
      const trial = { ...context, errors: [] };
      validateNode(value, candidate, trial, at, currentName);
      return trial.errors.length === 0;
    }).length;
    if (!matches) context.errors.push(`${at}: must match at least one anyOf branch`);
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((candidate) => {
      const trial = { ...context, errors: [] };
      validateNode(value, candidate, trial, at, currentName);
      return trial.errors.length === 0;
    }).length;
    if (matches !== 1) context.errors.push(`${at}: must match exactly one oneOf branch (matched ${matches})`);
  }
  if (schema.not) {
    const trial = { ...context, errors: [] };
    validateNode(value, schema.not, trial, at, currentName);
    if (trial.errors.length === 0) context.errors.push(`${at}: matches a forbidden schema branch`);
  }
  if (schema.if) {
    const trial = { ...context, errors: [] };
    validateNode(value, schema.if, trial, at, currentName);
    if (trial.errors.length === 0 && schema.then) validateNode(value, schema.then, context, at, currentName);
    if (trial.errors.length !== 0 && schema.else) validateNode(value, schema.else, context, at, currentName);
  }

  if (schema.type !== undefined) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.some((type) => typeMatches(value, type))) {
      context.errors.push(`${at}: must have type ${allowed.join(" or ")}`);
      return;
    }
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) context.errors.push(`${at}: string is shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) context.errors.push(`${at}: string is longer than ${schema.maxLength}`);
    if (schema.pattern !== undefined) {
      try { if (!new RegExp(schema.pattern).test(value)) context.errors.push(`${at}: does not match ${schema.pattern}`); }
      catch { context.errors.push(`${at}: schema contains an invalid pattern`); }
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (schema.minimum !== undefined && value < schema.minimum) context.errors.push(`${at}: must be >= ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) context.errors.push(`${at}: must be <= ${schema.maximum}`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) context.errors.push(`${at}: must be > ${schema.exclusiveMinimum}`);
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) context.errors.push(`${at}: must be < ${schema.exclusiveMaximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) context.errors.push(`${at}: requires at least ${schema.minItems} item(s)`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) context.errors.push(`${at}: allows at most ${schema.maxItems} item(s)`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) context.errors.push(`${at}: items must be unique`);
    if (schema.items) value.forEach((item, index) => validateNode(item, schema.items, context, `${at}[${index}]`, currentName));
  }
  if (isObject(value)) {
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties) context.errors.push(`${at}: requires at least ${schema.minProperties} properties`);
    const properties = schema.properties ?? {};
    for (const name of schema.required ?? []) if (!(name in value)) context.errors.push(`${at}: missing required property '${name}'`);
    for (const [name, child] of Object.entries(properties)) if (name in value) validateNode(value[name], child, context, `${at}.${name}`, currentName);
    if (schema.additionalProperties === false) {
      const extras = Object.keys(value).filter((name) => !(name in properties));
      if (extras.length) context.errors.push(`${at}: unsupported properties: ${extras.join(", ")}`);
    } else if (isObject(schema.additionalProperties)) {
      for (const [name, child] of Object.entries(value)) if (!(name in properties)) validateNode(child, schema.additionalProperties, context, `${at}.${name}`, currentName);
    }
  }
}

export async function validateAgainstContractSchema(schemaName, value) {
  const schemas = await loadContractSchemas();
  const normalized = path.basename(schemaName);
  const schema = schemas.get(schemaName) ?? schemas.get(normalized);
  if (!schema) return { passed: false, failures: [`unknown contract schema '${schemaName}'`] };
  const context = { schemas, errors: [] };
  validateNode(value, schema, context, "$", normalized);
  return { passed: context.errors.length === 0, failures: context.errors };
}

export async function getContractSchemaNode(schemaName, pointer = "") {
  const schemas = await loadContractSchemas();
  const normalized = path.basename(schemaName);
  let value = schemas.get(schemaName) ?? schemas.get(normalized);
  if (!value) throw new Error(`unknown contract schema '${schemaName}'`);
  for (const token of pointer.split("/").filter(Boolean).map(pointerToken)) {
    if ((!isObject(value) && !Array.isArray(value)) || !(token in value)) throw new Error(`unknown schema pointer '${schemaName}#/${pointer}'`);
    value = value[token];
  }
  return value;
}

export function resolveProjectContractPath(projectRoot, declaredPath, label = "contract path") {
  if (typeof declaredPath !== "string" || !declaredPath.trim()) throw new Error(`${label} must be a non-empty project-relative path`);
  if (path.isAbsolute(declaredPath)) throw new Error(`${label} must be project-relative`);
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, declaredPath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error(`${label} must stay inside the project root`);
  return resolved;
}

function extractStrictJsonExport(source, exportNames) {
  const withoutTypeImports = source.replace(/^\s*import\s+type\s+[^;]+;\s*$/gm, "").trim();
  const names = exportNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const startPattern = new RegExp(`^(?:export\\s+default|export\\s+const\\s+(?:${names})(?:\\s*:\\s*[^=]+)?\\s*=)\\s*`);
  const match = withoutTypeImports.match(startPattern);
  if (!match) throw new Error(`typed contract must export default or one of: ${exportNames.join(", ")}`);
  const bodyStart = withoutTypeImports.indexOf("{", match[0].length - 1);
  if (bodyStart < 0) throw new Error("typed contract export must be a strict JSON object literal");
  let depth = 0;
  let quoted = false;
  let escaped = false;
  let bodyEnd = -1;
  for (let index = bodyStart; index < withoutTypeImports.length; index += 1) {
    const character = withoutTypeImports[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) { bodyEnd = index + 1; break; }
  }
  if (bodyEnd < 0) throw new Error("typed contract JSON object is not balanced");
  const prefix = withoutTypeImports.slice(0, bodyStart).trim();
  if (!startPattern.test(`${prefix} `)) throw new Error("typed contract has executable content before its export");
  const suffix = withoutTypeImports.slice(bodyEnd).trim();
  if (suffix && !/^(?:(?:as\s+const|satisfies\s+[A-Za-z0-9_.$<>,\s]+)\s*)?;?$/.test(suffix)) throw new Error("typed contract has executable or unsupported content after its JSON literal");
  try { return JSON.parse(withoutTypeImports.slice(bodyStart, bodyEnd)); }
  catch (error) { throw new Error(`typed contract must use strict JSON syntax: ${error.message}`); }
}

export async function readJsonOrSafeTypedContract(file, { exportNames = ["registry"] } = {}) {
  const extension = path.extname(file).toLowerCase();
  const source = await readFile(file, "utf8");
  if (extension === ".json") return JSON.parse(source);
  if (![".js", ".mjs", ".cjs", ".ts", ".tsx"].includes(extension)) throw new Error(`unsupported contract file extension '${extension}'`);
  return extractStrictJsonExport(source, exportNames);
}

function collectRefs(value, refs = []) {
  if (Array.isArray(value)) value.forEach((item) => collectRefs(item, refs));
  else if (isObject(value)) {
    if (typeof value.$ref === "string") refs.push(value.$ref);
    Object.values(value).forEach((item) => collectRefs(item, refs));
  }
  return refs;
}

function unionValues(source, typeName) {
  const match = source.match(new RegExp(`export\\s+type\\s+${typeName}\\s*=([\\s\\S]*?);`));
  return match ? [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) => item[1]) : [];
}

function schemaEnum(schema, pointer) {
  let value = schema;
  for (const part of pointer.split("/")) value = value?.[part];
  return value?.enum ?? [];
}

async function auditSchemaSet() {
  const schemas = await loadContractSchemas();
  const failures = [];
  const warnings = [];
  const ids = new Set();
  for (const name of schemaFiles) {
    const schema = schemas.get(name);
    if (schema?.$schema !== "https://json-schema.org/draft/2020-12/schema") failures.push(`${name}: must declare JSON Schema draft 2020-12`);
    if (typeof schema?.$id !== "string" || !schema.$id) failures.push(`${name}: missing $id`);
    else if (ids.has(schema.$id)) failures.push(`${name}: duplicate $id '${schema.$id}'`);
    else ids.add(schema.$id);
    for (const ref of collectRefs(schema)) {
      try { resolveSchemaRef(ref, name, schemas); }
      catch (error) { failures.push(`${name}: ${error.message}`); }
    }
  }

  const deck = schemas.get("deck-manifest.schema.json");
  const version = deck?.properties?.datasetSemanticVersion;
  if (version?.type !== "integer" || version.minimum !== 0 || version.maximum !== 3) failures.push("deck manifest must structurally accept only integer datasetSemanticVersion 0–3");
  const evidence = schemas.get("evidence-registry.schema.json");
  const citation = schemas.get("citation-registry.schema.json");
  const [evidenceTypes, citationTypes, editTypes] = await Promise.all([
    readFile(path.join(skillRoot, "assets/react-template/EvidenceVisualizationTypes.ts"), "utf8"),
    readFile(path.join(skillRoot, "assets/react-template/CitationTypes.ts"), "utf8"),
    readFile(path.join(skillRoot, "assets/react-template/editor/EditPatchTypes.ts"), "utf8"),
  ]);
  const comparisons = [
    ["OutputMode", unionValues(evidenceTypes, "OutputMode"), schemaEnum(deck, "$defs/outputMode")],
    ["AnalysisMode", unionValues(evidenceTypes, "AnalysisMode"), schemaEnum(evidence, "$defs/analysisMode")],
    ["CitationSourceType", unionValues(citationTypes, "CitationSourceType"), schemaEnum(citation, "$defs/citationSourceType")],
  ];
  for (const [label, typed, canonical] of comparisons) if (!deepEqual([...typed].sort(), [...canonical].sort())) failures.push(`${label}: TypeScript union disagrees with canonical schema enum`);
  const editOperations = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (isObject(value)) {
      if (value?.properties?.operation?.const) editOperations.add(value.properties.operation.const);
      Object.values(value).forEach(visit);
    }
  };
  visit(schemas.get("edit-patch.schema.json"));
  const typedOperations = unionValues(editTypes, "EditOperationName");
  if (!deepEqual([...typedOperations].sort(), [...editOperations].sort())) failures.push("EditOperationName: editor TypeScript union disagrees with edit-patch schema (coordinate editor v1/v2 implementation)");
  return { passed: failures.length === 0, schemas: schemaFiles, failures, warnings };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    if (process.argv[2] && process.argv[3]) {
      const schemaName = process.argv[2];
      const data = await readJsonOrSafeTypedContract(path.resolve(process.argv[3]), { exportNames: ["registry", "citationRegistry", "evidenceRegistry", "editRegistry", "editPatch"] });
      const result = await validateAgainstContractSchema(schemaName, data);
      console.log(JSON.stringify({ schema: schemaName, input: path.resolve(process.argv[3]), ...result }, null, 2));
      process.exit(result.passed ? 0 : 1);
    }
    const result = await auditSchemaSet();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(`[schema-contract-validator] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
}
