import { access } from "node:fs/promises";
import path from "node:path";

// Omitted branding is legacy-compatible: preserve the project's actual assets.
export async function validateBranding(projectRoot, manifest) {
  const failures = [];
  const branding = manifest.branding;
  if (branding === undefined) return failures;
  if (!branding || !["none", "zuel"].includes(branding.profile)) return ["branding.profile must be none or zuel"];
  if (branding.profile === "none") {
    if (branding.logo !== undefined) failures.push("unbranded projects must not declare a logo");
    for (const rel of ["public/zuel-logo.png", "dist/zuel-logo.png"]) {
      try { await access(path.join(projectRoot, rel)); failures.push(`unbranded project retains stale logo asset: ${rel}`); } catch { /* no asset is expected */ }
    }
    return failures;
  }
  const logo = branding.logo;
  if (!logo || typeof logo.src !== "string" || !logo.src.trim() || typeof logo.alt !== "string" || !logo.alt.trim()) return ["ZUEL branding requires logo.src and logo.alt"];
  const relative = logo.src.replace(/^\.\//, "");
  if (/^[a-z][a-z0-9+.-]*:|^[\\/]|[?#]/i.test(relative) || relative.includes("\\") || relative.split("/").some(part => part === ".." || part === "." || !part)) return ["branding.logo.src must be a safe project-local public asset"];
  const asset = path.resolve(projectRoot, "public", relative);
  const publicRoot = path.resolve(projectRoot, "public") + path.sep;
  if (!asset.startsWith(publicRoot)) return ["branding.logo.src escapes public assets"];
  try { await access(asset); } catch { failures.push(`selected branding logo asset is missing: ${logo.src}`); }
  return failures;
}
