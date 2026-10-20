export type PortableIdentity = { projectId: string; baseFingerprint: string; outputMode: "slide-deck" | "scroll-report" };
export type PortableFlow = { format: "zuel-analysis-flow"; schemaVersion: 1; projectId: string; baselineHash: string; graph: unknown };
type PortableAsset = { dataUrl: string; sha256: string };
export type PortableEdits = PortableIdentity & {
  format: "zuel-presentation-edits"; schemaVersion: 1; packageId: string; savedAt: string;
  patch: unknown; flows: PortableFlow[]; assets: Record<string, PortableAsset>;
};
const STATE_ID = "zuel-portable-edits";
const MAX_BYTES = 32 * 1024 * 1024;
const flowProviders = new Map<string, { get: () => Promise<PortableFlow>; validate: (flow: PortableFlow) => Promise<unknown>; apply: (graph: unknown) => void }>();
let imported: PortableEdits | null = null;
export let portableLoadError = "";

// Capture the build entry before React renders. Export never serializes the
// edited audience DOM, chart canvases, editor controls, or arbitrary user HTML.
const sourceDocument = typeof document === "undefined" ? "" : (() => {
  const base = document.documentElement.cloneNode(true) as HTMLElement;
  base.querySelector("#root")?.replaceChildren();
  return "<!doctype html>\n" + base.outerHTML;
})();

function readEmbedded() {
  if (typeof document === "undefined") return null;
  const raw = document.getElementById(STATE_ID)?.textContent;
  if (!raw) return null;
  try { return parsePortableEdits(raw); } catch (error) { portableLoadError = `内嵌修改未能读取：${error instanceof Error ? error.message : String(error)}`; return null; }
}
const embedded = readEmbedded();

export async function fingerprint(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const result = await crypto.subtle.digest("SHA-256", bytes);
  return "sha256:" + [...new Uint8Array(result)].map(n => n.toString(16).padStart(2, "0")).join("");
}

export function parsePortableEdits(raw: string, identity?: PortableIdentity): PortableEdits {
  if (new Blob([raw]).size > MAX_BYTES) throw new Error("修改文件超过32 MB，无法导入。");
  const value = JSON.parse(raw) as PortableEdits;
  if (value?.format !== "zuel-presentation-edits" || value.schemaVersion !== 1 || typeof value.projectId !== "string" || typeof value.baseFingerprint !== "string" || !["slide-deck", "scroll-report"].includes(value.outputMode) || typeof value.packageId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value.packageId) || !Array.isArray(value.flows) || !value.patch || !value.assets || typeof value.assets !== "object") throw new Error("不是有效的报告修改文件。");
  if (identity && (value.projectId !== identity.projectId || value.baseFingerprint !== identity.baseFingerprint || value.outputMode !== identity.outputMode)) throw new Error("修改文件属于其他报告或其他底稿版本，未导入。");
  for (const [src, asset] of Object.entries(value.assets)) {
    if (!safeAssetPath(src) || typeof asset?.dataUrl !== "string" || !/^data:image\/(?:png|jpeg|webp|avif);base64,[a-zA-Z0-9+/=]+$/.test(asset.dataUrl) || !/^sha256:[a-f0-9]{64}$/.test(asset.sha256)) throw new Error("修改文件包含不支持的图片资源。");
  }
  return value;
}

function safeAssetPath(src: string) { return Boolean(src) && !/^(?:[a-z]+:|\/|\\)/i.test(src) && !src.split(/[\\/]/).includes(".."); }
export function portableStorageSuffix(projectId: string) { return embedded?.projectId === projectId ? ":portable:" + embedded.packageId : ""; }
export function embeddedPatch<T>(identity: PortableIdentity): T | null {
  if (!embedded) { if (portableLoadError) throw new Error(portableLoadError); return null; }
  if (embedded.projectId !== identity.projectId || embedded.baseFingerprint !== identity.baseFingerprint || embedded.outputMode !== identity.outputMode) throw new Error("内嵌修改与当前报告底稿不匹配，未应用修改。");
  return embedded.patch as T;
}
export function embeddedFlow(projectId: string) { return embedded?.flows.find(flow => flow.projectId === projectId) ?? null; }
export function portableAsset(src: string) { return imported?.assets[src]?.dataUrl ?? embedded?.assets[src]?.dataUrl ?? src; }
export function useImportedAssets(bundle: PortableEdits) { imported = bundle; }
/** Browser persistence keeps imported raster assets alongside their typed patch. */
export function browserPatchState(identity: PortableIdentity, patch: unknown): PortableEdits {
  const assets: Record<string, PortableAsset> = {};
  const operations = (patch as { operations?: Array<{ operation: string; value?: { src?: string } }> }).operations ?? [];
  for (const operation of operations) {
    const src = operation.operation === "replace-image" ? operation.value?.src : undefined;
    const asset = src ? imported?.assets[src] ?? embedded?.assets[src] : undefined;
    if (src && asset) assets[src] = asset;
  }
  return { ...identity, format: "zuel-presentation-edits", schemaVersion: 1, packageId: crypto.randomUUID(), savedAt: new Date().toISOString(), patch, flows: [], assets };
}
export function registerPortableFlow(projectId: string, get: () => Promise<PortableFlow>, validate: (flow: PortableFlow) => Promise<unknown>, apply: (graph: unknown) => void) {
  const provider = { get, validate, apply };
  flowProviders.set(projectId, provider);
  return () => { if (flowProviders.get(projectId) === provider) flowProviders.delete(projectId); };
}
export async function prepareImportedFlows(flows: PortableFlow[]) {
  const actions: Array<() => void> = [];
  const seen = new Set<string>();
  for (const flow of flows) {
    const provider = flowProviders.get(flow.projectId);
    if (!provider || seen.has(flow.projectId)) throw new Error("当前报告没有对应流程图，或修改文件包含重复流程，未导入。");
    seen.add(flow.projectId);
    const graph = await provider.validate(flow);
    actions.push(() => provider.apply(graph));
  }
  return () => actions.forEach(apply => apply());
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = filename; link.hidden = true; document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function checkedAssets(patch: unknown) {
  const assets: Record<string, PortableAsset> = {};
  const operations = (patch as { operations?: Array<{ operation: string; value?: { src?: string; sha256?: string; mimeType?: string } }> }).operations ?? [];
  for (const operation of operations) {
    if (operation.operation !== "replace-image" || !operation.value?.src) continue;
    const { src, sha256, mimeType } = operation.value;
    if (!safeAssetPath(src)) throw new Error("图片资源路径不受支持，无法导出。");
    const existing = imported?.assets[src] ?? embedded?.assets[src];
    const response = await fetch(existing?.dataUrl ?? new URL(src, location.href).href);
    if (!response.ok) throw new Error("无法读取修改后的图片，请在原项目中重新导出。");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 8 * 1024 * 1024 || !mimeType || !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(mimeType) || await fingerprint(bytes) !== sha256) throw new Error("修改后的图片未通过类型、大小或哈希检查。");
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("读取图片失败")); reader.readAsDataURL(new Blob([bytes], { type: mimeType }));
    });
    assets[src] = { dataUrl, sha256 };
  }
  return assets;
}

export async function collectPortableEdits(identity: PortableIdentity, patch: unknown): Promise<PortableEdits> {
  return { ...identity, format: "zuel-presentation-edits", schemaVersion: 1, packageId: crypto.randomUUID(), savedAt: new Date().toISOString(), patch, flows: await Promise.all([...flowProviders.values()].map(provider => provider.get())), assets: await checkedAssets(patch) };
}

export async function verifyPortableAssets(bundle: PortableEdits) {
  for (const asset of Object.values(bundle.assets)) if (await fingerprint(await (await fetch(asset.dataUrl)).arrayBuffer()) !== asset.sha256) throw new Error("修改文件中的图片哈希不一致，未导入。");
}

export async function downloadEditedReport(bundle: PortableEdits) {
  if (bundle.outputMode !== "scroll-report") throw new Error("16:9演示稿请使用导出修改文件。");
  let base = sourceDocument;
  if (!new DOMParser().parseFromString(base, "text/html").querySelector('meta[name="offline-report"][content="shared-source"]')) {
    if (location.protocol === "file:") throw new Error("请先打开独立离线版，再下载修改版HTML。");
    const response = await fetch(new URL("./offline.html", location.href), { cache: "no-store" });
    if (!response.ok) throw new Error("当前预览还没有离线底稿；请先生成离线版，或使用导出修改文件。");
    base = await response.text();
  }
  const html = new DOMParser().parseFromString(base, "text/html");
  if (!html.querySelector('meta[name="offline-report"][content="shared-source"]') || html.querySelector('script[src],link[rel="stylesheet"][href]')) throw new Error("离线底稿仍依赖外部脚本或样式，未导出。");
  html.getElementById(STATE_ID)?.remove();
  const state = html.createElement("script"); state.id = STATE_ID; state.type = "application/json";
  state.textContent = JSON.stringify(bundle).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
  html.head.append(state);
  html.getElementById("root")?.replaceChildren();
  const title = (html.title || "汇报").replace(/[<>:"/\\|?*]/g, "_");
  downloadBlob(new Blob(["<!doctype html>\n" + html.documentElement.outerHTML], { type: "text/html;charset=utf-8" }), title + "_修改版.html");
}
