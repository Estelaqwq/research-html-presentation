import type { EditSaveResult, EditUploadResult, ManagedImageAsset, PresentationEditPatch } from "./EditPatchTypes";
import type { EditableRegistry } from "./EditPatchTypes";

import { browserPatchState, embeddedPatch, parsePortableEdits, portableStorageSuffix, useImportedAssets, verifyPortableAssets } from "../portable-state";

export interface EditStorageAdapter {
  readonly kind: "local-project" | "download";
  load(registry?: EditableRegistry): Promise<PresentationEditPatch | null>;
  save(patch: PresentationEditPatch, registry?: EditableRegistry): Promise<EditSaveResult>;
  uploadImage?(file: File): Promise<EditUploadResult>;
}

async function readJsonResponse(response: Response) {
  const payload = await response.json().catch(() => ({})) as { patch?: PresentationEditPatch; error?: string; message?: string; failures?: string[]; details?: unknown };
  if (!response.ok) {
    const detail = [payload.error || payload.message || `editor storage request failed (${response.status})`, ...(payload.failures ?? [])].filter(Boolean).join("；");
    throw new Error(detail);
  }
  return payload;
}

function localPatchKey(registry?: EditableRegistry) {
  return `zuel-research-edit:${registry?.projectId ?? "unbound"}:${registry?.baseFingerprint ?? "no-fingerprint"}${portableStorageSuffix(registry?.projectId ?? "")}`;
}

function browserStore() {
  try { return typeof window !== "undefined" ? window.localStorage : null; }
  catch { return null; }
}

function storageReason(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function readBrowserPatch(registry?: EditableRegistry) {
  const store = browserStore();
  if (!store) return registry ? embeddedPatch<PresentationEditPatch>(registry) : null;
  const raw = store.getItem(localPatchKey(registry));
  if (!raw) return registry ? embeddedPatch<PresentationEditPatch>(registry) : null;
  try {
    const value = JSON.parse(raw);
    if (value?.format === "zuel-presentation-edits") {
      const bundle = parsePortableEdits(raw, registry);
      await verifyPortableAssets(bundle); useImportedAssets(bundle);
      return bundle.patch as PresentationEditPatch;
    }
    return value as PresentationEditPatch;
  }
  catch { throw new Error("浏览器本地补丁无法解析，请清除该项目的本地编辑数据后重试"); }
}

function writeBrowserPatch(patch: PresentationEditPatch, registry?: EditableRegistry) {
  const store = browserStore();
  if (!store) throw new Error("浏览器本地存储不可用（可能被隐私模式或浏览器策略禁用）");
  try { store.setItem(localPatchKey(registry), JSON.stringify(registry ? browserPatchState(registry, patch) : patch)); }
  catch (error) { throw new Error(`浏览器本地补丁写入失败：${storageReason(error)}`); }
}

export function createLocalProjectAdapter(options: {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  authoringToken?: string;
  maxImageBytes?: number;
} = {}): EditStorageAdapter {
  const endpoint = options.endpoint ?? "/__presentation-editor";
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers = (): Record<string, string> => options.authoringToken ? { "X-Presentation-Editor-Token": options.authoringToken } : {};
  return {
    kind: "local-project",
    async load(registry) {
      if (typeof location !== "undefined" && (location.protocol === "file:" || portableStorageSuffix(registry?.projectId ?? ""))) return readBrowserPatch(registry);
      let responseStatus = 0;
      try {
        const response = registry
          ? await fetchImpl(`${endpoint}/patch`, { method: "POST", cache: "no-store", credentials: "same-origin", headers: { "Content-Type": "application/json", ...headers() }, body: JSON.stringify({ registry }) })
          : await fetchImpl(`${endpoint}/patch`, { method: "GET", cache: "no-store", credentials: "same-origin", headers: headers() });
        responseStatus = response.status;
        if (response.status === 404) return readBrowserPatch(registry);
        const patch = (await readJsonResponse(response)).patch ?? null;
        // Imported image bytes remain browser-local until an edited HTML is
        // exported; restore them even when text patches use the project API.
        await readBrowserPatch(registry);
        return patch;
      } catch (error) {
        // A static or file:// delivery has no project endpoint. Reading the
        // namespaced browser Patch is the intentional fallback.
        if (responseStatus && responseStatus !== 404) throw error;
        try { return await readBrowserPatch(registry); }
        catch (fallbackError) { throw new Error(`读取编辑补丁失败：项目保存服务不可用（${storageReason(error)}）；浏览器本地补丁也不可用（${storageReason(fallbackError)}）`); }
      }
    },
    async save(patch, registry) {
      if (typeof location !== "undefined" && (location.protocol === "file:" || portableStorageSuffix(registry?.projectId ?? ""))) { writeBrowserPatch(patch, registry); return { kind: "local-project", patch, message: "修改已保存到当前浏览器；离线页面刷新后会保留。" }; }
      try {
        const response = await fetchImpl(`${endpoint}/save`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", ...headers() },
          body: JSON.stringify(registry ? { patch, registry } : patch),
        });
        if (response.status !== 404) {
          const payload = await readJsonResponse(response);
          if (registry && Object.keys(browserPatchState(registry, patch).assets).length) writeBrowserPatch(payload.patch ?? patch, registry);
          return {
            kind: "local-project",
            patch: payload.patch ?? patch,
            message: payload.message ?? "修改已保存到项目根目录的 presentation-edit-patch.json。",
          };
        }
      } catch (error) {
        // Network/fetch failures are expected for file:// and static output;
        // HTTP validation failures are surfaced by readJsonResponse above.
        if (error instanceof Error && !/Failed to fetch|NetworkError|fetch failed|Invalid URL|only absolute URLs/i.test(error.message)) throw error;
      }
      try {
        writeBrowserPatch(patch, registry);
        return { kind: "local-project", patch, message: "项目保存服务不可用，修改已保存到当前浏览器；刷新本页面会保留。" };
      } catch (fallbackError) {
        throw new Error(`保存失败：项目保存服务不可用，且浏览器本地保存失败：${storageReason(fallbackError)}`);
      }
    },
    async uploadImage(file) {
      const max = options.maxImageBytes ?? 8 * 1024 * 1024;
      if (!file || file.size <= 0 || file.size > max) throw new Error(`图片大小必须在 1–${max} 字节之间`);
      if (!["image/png", "image/jpeg", "image/webp", "image/avif"].includes(file.type)) throw new Error("只允许 PNG、JPEG、WebP 或 AVIF 图片");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      try {
        const response = await fetchImpl(`${endpoint}/upload-image`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", ...headers() },
          body: JSON.stringify({ fileName: file.name, mimeType: file.type, dataBase64: btoa(binary) }),
        });
        const payload = await response.json().catch(() => ({})) as { asset?: ManagedImageAsset; error?: string; message?: string; failures?: string[] };
        if (!response.ok || !payload.asset) throw new Error([payload.error || payload.message || `图片上传失败 (${response.status})`, ...(payload.failures ?? [])].join("；"));
        return { kind: "local-project", asset: payload.asset, message: payload.message ?? "图片已写入项目受管资源目录。" };
      } catch (error) {
        throw new Error(`图片无法保存：当前交付没有可用的受管资源目录（${storageReason(error)}）。文字编辑仍可保存到浏览器本地。`);
      }
    },
  };
}

export function createDownloadAdapter(options: {
  initialPatch?: PresentationEditPatch | null;
  filename?: string;
  documentRef?: Document;
  urlApi?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
} = {}): EditStorageAdapter {
  return {
    kind: "download",
    async load() {
      return options.initialPatch ?? null;
    },
    async save(patch) {
      const documentRef = options.documentRef ?? document;
      const urlApi = options.urlApi ?? URL;
      const blob = new Blob([`${JSON.stringify(patch, null, 2)}\n`], { type: "application/json" });
      const url = urlApi.createObjectURL(blob);
      const link = documentRef.createElement("a");
      link.href = url;
      link.download = options.filename ?? "presentation-edit-patch.json";
      link.hidden = true;
      documentRef.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => urlApi.revokeObjectURL(url), 0);
      return {
        kind: "download",
        patch,
        message: "补丁已下载；请将 presentation-edit-patch.json 放回项目根目录后再刷新或重新构建。",
      };
    },
    async uploadImage() {
      throw new Error("下载补丁模式不能持久化图片；请使用本地项目保存服务。");
    },
  };
}
