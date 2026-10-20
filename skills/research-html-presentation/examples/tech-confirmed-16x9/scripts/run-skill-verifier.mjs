import { existsSync } from "node:fs";
import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import os from "node:os";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [process.env.RESEARCH_HTML_PRESENTATION_SKILL_DIR, path.resolve(projectRoot, "../.."), path.join(os.homedir(), ".codex", "skills", "research-html-presentation")].filter(Boolean);
let skillRoot;
for (const candidate of candidates) {
  try { await access(path.join(candidate, "scripts", "verify_project.mjs")); skillRoot = candidate; break; } catch {}
}
if (!skillRoot) { console.error("Set RESEARCH_HTML_PRESENTATION_SKILL_DIR to the installed skill directory."); process.exit(2); }
const verifier = path.join(skillRoot, "scripts", "verify_project.mjs");
try { await access(verifier); } catch { console.error("Cannot locate research-html-presentation. Set RESEARCH_HTML_PRESENTATION_SKILL_DIR to the installed skill directory."); process.exit(2); }
const child = spawnSync(process.execPath, [verifier, projectRoot, ...process.argv.slice(2)], { cwd: projectRoot, stdio: "inherit", env: process.env });
if (child.error) { console.error(child.error.message); process.exit(2); }
process.exit(child.status ?? 1);

function discoverSkillRoot() {
  let current = projectRoot;
  for (let depth = 0; depth < 8; depth++) {
    if (existsSync(path.join(current, "SKILL.md")) && existsSync(path.join(current, "scripts/verify_project.mjs"))) return current;
    const parent = path.dirname(current); if (parent === current) break; current = parent;
  }
  throw new Error("Set RESEARCH_HTML_PRESENTATION_SKILL_DIR to the installed skill directory");
}
