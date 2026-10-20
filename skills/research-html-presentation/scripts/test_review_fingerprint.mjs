#!/usr/bin/env node

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { computeRenderFingerprint } from "./review_fingerprint.mjs";

const root = await mkdtemp(path.join(os.tmpdir(), "research-review-fingerprint-"));
try {
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "deck.css"), ".slide{color:#123}", "utf8");
  const initial = await computeRenderFingerprint(root);
  await writeFile(path.join(root, "visual-review.json"), JSON.stringify({ renderFingerprint: initial }), "utf8");
  const afterReviewArtifact = await computeRenderFingerprint(root);
  if (initial !== afterReviewArtifact) throw new Error("visual-review.json must not change the render fingerprint");
  await mkdir(path.join(root, "dist"), { recursive: true });
  await writeFile(path.join(root, "dist", "index.js"), "generated", "utf8");
  const afterGeneratedOutput = await computeRenderFingerprint(root);
  if (initial !== afterGeneratedOutput) throw new Error("generated output folders must not change the render fingerprint");
  await writeFile(path.join(root, "src", "deck.css"), ".slide{color:#456}", "utf8");
  const afterSourceChange = await computeRenderFingerprint(root);
  if (initial === afterSourceChange) throw new Error("output-relevant source changes must invalidate the render fingerprint");
  console.log(JSON.stringify({ passed: true, initial, afterSourceChange }, null, 2));
} finally {
  await rm(root, { recursive: true, force: true });
}
