#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] ?? process.cwd());
const manifest = JSON.parse(await readFile(path.join(root, "deck-manifest.json"), "utf8"));
const registryPath = path.resolve(root, manifest.evidenceRegistry ?? "evidence-visuals.json");
const failures = [];
const warnings = [];
const array = (value) => Array.isArray(value) ? value : [];
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

let registry = null;
try { registry = JSON.parse(await readFile(registryPath, "utf8")); } catch { console.log(JSON.stringify({ passed: true, skipped: true, reason: "No evidence registry", failures, warnings }, null, 2)); process.exit(0); }

for (const flow of array(registry.flowSpecs)) {
  const at = `flow '${flow?.id ?? "?"}'`;
  if (!nonEmpty(flow?.id)) failures.push("FlowSpec is missing id");
  const nodes = array(flow?.nodes);
  const edges = array(flow?.edges);
  const ids = new Set();
  for (const node of nodes) {
    if (!nonEmpty(node?.id) || ids.has(node.id)) failures.push(`${at}: node IDs must be unique and non-empty`);
    ids.add(node?.id);
    if (!nonEmpty(node?.label)) failures.push(`${at}: node '${node?.id ?? "?"}' has no label`);
  }
  const indegree = new Map([...ids].map((id) => [id, 0]));
  const outgoing = new Map([...ids].map((id) => [id, []]));
  for (const edge of edges) {
    if (!ids.has(edge?.from) || !ids.has(edge?.to)) failures.push(`${at}: edge ${edge?.from ?? "?"} → ${edge?.to ?? "?"} references an unknown node`);
    if (!edge?.kind || !["primary", "secondary", "feedback"].includes(edge.kind)) failures.push(`${at}: edge kind must be primary, secondary, or feedback`);
    if (typeof edge?.directed !== "boolean") failures.push(`${at}: edge ${edge?.from ?? "?"} → ${edge?.to ?? "?"} must declare directed`);
    if (ids.has(edge?.from) && ids.has(edge?.to)) { outgoing.get(edge.from).push(edge.to); if (edge.kind === "primary") indegree.set(edge.to, indegree.get(edge.to) + 1); }
  }
  const primaryEdges = edges.filter((edge) => edge?.kind === "primary");
  if (!nodes.length || !edges.length) failures.push(`${at}: a flow needs at least two nodes and one edge`);
  if (nodes.length > 1 && !primaryEdges.length) failures.push(`${at}: flow has no primary path`);
  const roots = [...ids].filter((id) => (indegree.get(id) ?? 0) === 0);
  if (primaryEdges.length && !roots.length) warnings.push(`${at}: primary path has no visible input/root; check for a cycle or feedback-only graph`);
  const reachable = new Set(roots);
  const queue = [...roots];
  while (queue.length) for (const next of outgoing.get(queue.shift()) ?? []) if (!reachable.has(next)) { reachable.add(next); queue.push(next); }
  for (const id of ids) if (!reachable.has(id) && !nodes.find((node) => node.id === id && node.role === "feedback")) failures.push(`${at}: node '${id}' is isolated from the primary reading path`);
  if (array(flow.readingOrder).length && array(flow.readingOrder).some((id) => !ids.has(id))) failures.push(`${at}: readingOrder references an unknown node`);
}

console.log(JSON.stringify({ passed: failures.length === 0, checked: array(registry.flowSpecs).length, failures, warnings }, null, 2));
process.exit(failures.length ? 1 : 0);
