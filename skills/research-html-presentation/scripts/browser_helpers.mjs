import { createReadStream, existsSync } from "node:fs";
import { access, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_PATH,
    "playwright",
    path.join(process.cwd(), "node_modules", "playwright"),
    path.resolve(path.dirname(process.execPath), "..", "node_modules", "playwright"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next locally available Playwright runtime.
    }
  }
  throw new Error("Playwright was not found. Set PLAYWRIGHT_PATH to a bundled Playwright package or install it in the deck project.");
}

function findBrowserExecutable() {
  const candidates = [
    process.env.BROWSER_EXECUTABLE,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "Microsoft", "Edge", "Application", "msedge.exe") : null,
    process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "Microsoft", "Edge", "Application", "msedge.exe") : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe") : null,
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe") : null,
    process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe") : null,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function findEntry(projectRoot) {
  const resolved = path.resolve(projectRoot);
  if ((await stat(resolved)).isFile()) return { root: path.dirname(resolved), entry: path.basename(resolved) };
  for (const relative of ["dist/index.html", "build/index.html", "index.html"]) {
    const candidate = path.join(resolved, relative);
    try {
      await access(candidate);
      return { root: path.dirname(candidate), entry: path.basename(candidate) };
    } catch {
      // Continue until a built entry is found.
    }
  }
  throw new Error(`No built index.html found under ${resolved}`);
}

export async function openDeckTarget(target) {
  if (/^https?:\/\//i.test(target)) return { url: target.replace(/#.*$/, ""), close: async () => {} };

  const { root, entry } = await findEntry(target);
  const rootWithSeparator = `${path.resolve(root)}${path.sep}`;
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "") || entry;
      let filePath = path.resolve(root, relative);
      if (!filePath.startsWith(rootWithSeparator) && filePath !== path.resolve(root)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const info = await stat(filePath);
      if (info.isDirectory()) filePath = path.join(filePath, "index.html");
      response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream" });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}/${encodeURIComponent(entry)}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export async function withDeckPage(target, callback) {
  const { chromium } = loadPlaywright();
  const deck = await openDeckTarget(target);
  const executablePath = findBrowserExecutable();
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  try {
    return await callback({ page, baseUrl: deck.url });
  } finally {
    await browser.close();
    await deck.close();
  }
}
