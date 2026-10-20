import type { EditSaveResult, EditUploadResult, ManagedImageAsset, PresentationEditPatch } from "./EditPatchTypes";
import type { EditableRegistry } from "./EditPatchTypes";

export interface EditStorageAdapter {
  readonly kind: "local-project" | "download";
  load(registry?: EditableRegistry): Promise<PresentationEditPatch | null>;
  save(patch: PresentationEditPatch, registry?: EditableRegistry): Promise<EditSaveResult>;
  uploadImage?(file: File): Promise<EditUploadResult>;
}

async function readJsonResponse(response: Response) {
  const payload = await response.json().catch(() => ({})) as { patch?: PresentationEditPatch; error?: string; message?: string };
  if (!response.ok) throw new Error(payload.error || payload.message || `editor storage request failed (${response.status})`);
  return payload;
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
      const response = registry
        ? await fetchImpl(`${endpoint}/patch`, { method: "POST", cache: "no-store", credentials: "same-origin", headers: { "Content-Type": "application/json", ...headers() }, body: JSON.stringify({ registry }) })
        : await fetchImpl(`${endpoint}/patch`, { method: "GET", cache: "no-store", credentials: "same-origin", headers: headers() });
      if (response.status === 404) return null;
      return (await readJsonResponse(response)).patch ?? null;
    },
    async save(patch, registry) {
      const response = await fetchImpl(`${endpoint}/save`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(registry ? { patch, registry } : patch),
      });
      const payload = await readJsonResponse(response);
      return {
        kind: "local-project",
        patch: payload.patch ?? patch,
        message: payload.message ?? "修改已保存到项目根目录的 presentation-edit-patch.json。",
      };
    },
    async uploadImage(file) {
      const max = options.maxImageBytes ?? 8 * 1024 * 1024;
      if (!file || file.size <= 0 || file.size > max) throw new Error(`图片大小必须在 1–${max} 字节之间`);
      if (!["image/png", "image/jpeg", "image/webp", "image/avif"].includes(file.type)) throw new Error("只允许 PNG、JPEG、WebP 或 AVIF 图片");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      const response = await fetchImpl(`${endpoint}/upload-image`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, dataBase64: btoa(binary) }),
      });
      const payload = await response.json().catch(() => ({})) as { asset?: ManagedImageAsset; error?: string; message?: string };
      if (!response.ok || !payload.asset) throw new Error(payload.error || payload.message || `图片上传失败 (${response.status})`);
      return { kind: "local-project", asset: payload.asset, message: payload.message ?? "图片已写入项目受管资源目录。" };
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
