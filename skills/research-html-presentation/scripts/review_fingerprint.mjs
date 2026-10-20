import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const excludedDirectories = new Set(["node_modules", "dist", "build", ".git", ".deck-render", ".report-render"]);
const excludedFiles = new Set(["visual-review.json"]);
const outputExtensions = new Set([".css", ".gif", ".html", ".jpeg", ".jpg", ".js", ".json", ".jsx", ".mjs", ".png", ".svg", ".ts", ".tsx", ".webp", ".woff", ".woff2", ".ttf", ".otf"]);

async function collect(directory, root, result) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    if (!entry.isDirectory() && excludedFiles.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(absolute, root, result);
    else if (outputExtensions.has(path.extname(entry.name).toLowerCase())) result.push({ absolute, relative: path.relative(root, absolute).replaceAll(path.sep, "/") });
  }
}

export async function computeRenderFingerprint(projectRoot) {
  const root = path.resolve(projectRoot);
  const files = [];
  await collect(root, root, files);
  files.sort((a, b) => a.relative.localeCompare(b.relative, "en"));
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file.relative);
    hash.update("\0");
    hash.update(await readFile(file.absolute));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}
