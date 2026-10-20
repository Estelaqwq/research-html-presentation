import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PATCH_FILENAME, REGISTRY_FILENAME, validateEditPatchDocument } from "./validate_edit_patch.mjs";

const MAX_BODY_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_UPLOAD_DIR = "assets/editor-uploads";

function isLoopback(value = "") {
  const host = value.replace(/^\[|\]$/g, "").split(":")[0].toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "" || value.startsWith("::ffff:127.");
}

function send(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(`${JSON.stringify(payload)}\n`);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("request body exceeds 2 MiB");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function atomicWriteJson(targetPath, value) {
  const directory = path.dirname(targetPath);
  const temporary = path.join(directory, `.${PATCH_FILENAME}.${process.pid}.${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, targetPath);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

function imageKind(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mimeType: "image/png", extension: "png" };
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { mimeType: "image/jpeg", extension: "jpg" };
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return { mimeType: "image/webp", extension: "webp" };
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp" && bytes.subarray(8, 12).toString("ascii").includes("avif")) return { mimeType: "image/avif", extension: "avif" };
  return null;
}

function imageDimensions(bytes, mimeType) {
  if (mimeType === "image/png" && bytes.length >= 24) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (mimeType === "image/jpeg") {
    for (let index = 2; index + 9 < bytes.length;) {
      if (bytes[index] !== 255) { index += 1; continue; }
      const marker = bytes[index + 1]; const size = bytes.readUInt16BE(index + 2);
      if (marker >= 192 && marker <= 195 && size >= 7) return { height: bytes.readUInt16BE(index + 5), width: bytes.readUInt16BE(index + 7) };
      index += 2 + size;
    }
  }
  // WebP/AVIF are still decoded by the browser. Preserve a positive bounded value
  // without trusting client-supplied dimensions; detailed decode belongs to build QA.
  return { width: 1, height: 1 };
}

async function atomicWriteBuffer(targetPath, bytes) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const temp = `${targetPath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, bytes, { flag: "wx", mode: 0o600 });
  try { await rename(temp, targetPath); } catch (error) { await unlink(temp).catch(() => undefined); throw error; }
}

export function createPresentationEditorHandler(options) {
  const projectRoot = path.resolve(options.projectRoot);
  const patchPath = path.join(projectRoot, PATCH_FILENAME);
  const registryPath = path.resolve(options.registryPath ?? path.join(projectRoot, REGISTRY_FILENAME));
  const rootPrefix = `${projectRoot}${path.sep}`;
  const allowedOrigins = new Set([...(options.allowedOrigins ?? []), "http://127.0.0.1", "http://localhost"]);
  if (path.basename(patchPath) !== PATCH_FILENAME || path.dirname(patchPath) !== projectRoot) throw new Error("patch target must be the project-root presentation-edit-patch.json");
  if (!registryPath.startsWith(rootPrefix) && registryPath !== path.join(projectRoot, REGISTRY_FILENAME)) throw new Error("editable registry must stay inside the project root");
  if (options.environment !== "development" || process.env.NODE_ENV === "production") throw new Error("presentation editor save handler is disabled outside development authoring");

  return async function presentationEditorHandler(request, response) {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    if (!requestUrl.pathname.startsWith("/__presentation-editor/")) return false;
    const remote = request.socket?.remoteAddress ?? "";
    const host = String(request.headers?.host ?? "localhost").replace(/^\[|\]$/g, "").split(":")[0];
    if (!isLoopback(remote) || !isLoopback(host)) {
      send(response, 403, { error: "presentation editor accepts loopback development requests only" });
      return true;
    }
    const origin = String(request.headers?.origin ?? "");
    if (origin && !origin.startsWith(`http://${host}`) && !allowedOrigins.has(origin)) {
      send(response, 403, { error: "presentation editor origin is not allowed" });
      return true;
    }
    if (options.authoringToken && request.headers?.["x-presentation-editor-token"] !== options.authoringToken) {
      send(response, 403, { error: "presentation editor token is required" });
      return true;
    }
    let registry;
    try { registry = JSON.parse(await readFile(registryPath, "utf8")); }
    catch { send(response, 500, { error: `cannot read ${REGISTRY_FILENAME}` }); return true; }

    if (request.method === "GET" && requestUrl.pathname === "/__presentation-editor/patch") {
      try {
        await access(patchPath);
        const patch = JSON.parse(await readFile(patchPath, "utf8"));
        const validation = validateEditPatchDocument(patch, registry, { localAuthoring: true });
        if (!validation.passed) send(response, 422, { error: "stored patch is invalid", failures: validation.failures });
        else send(response, 200, { patch });
      } catch (error) {
        if (error?.code === "ENOENT") send(response, 404, { error: "patch not found" });
        else send(response, 500, { error: error instanceof Error ? error.message : String(error) });
      }
      return true;
    }

    if (request.method === "POST" && requestUrl.pathname === "/__presentation-editor/patch") {
      if (!String(request.headers?.["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
        send(response, 415, { error: "Content-Type must be application/json" });
        return true;
      }
      try {
        const payload = await readBody(request);
        const runtimeRegistry = payload && typeof payload === "object" && !Array.isArray(payload) && payload.registry ? payload.registry : undefined;
        await access(patchPath);
        const patch = JSON.parse(await readFile(patchPath, "utf8"));
        const validation = validateEditPatchDocument(patch, registry, { localAuthoring: true, runtimeRegistry });
        if (!validation.passed) send(response, 422, { error: "stored patch is invalid", failures: validation.failures });
        else send(response, 200, { patch });
      } catch (error) {
        if (error?.code === "ENOENT") send(response, 404, { error: "patch not found" });
        else send(response, 400, { error: error instanceof Error ? error.message : String(error) });
      }
      return true;
    }

    if (request.method === "POST" && requestUrl.pathname === "/__presentation-editor/save") {
      if (!String(request.headers?.["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
        send(response, 415, { error: "Content-Type must be application/json" });
        return true;
      }
      try {
        const payload = await readBody(request);
        const runtimeRegistry = payload && typeof payload === "object" && !Array.isArray(payload) && payload.registry ? payload.registry : undefined;
        const patch = runtimeRegistry ? payload.patch : payload;
        if (!patch) throw new Error("patch payload is missing");
        const validation = validateEditPatchDocument(patch, registry, { localAuthoring: true, runtimeRegistry });
        if (!validation.passed) send(response, 422, { error: "patch validation failed", failures: validation.failures });
        else {
          await atomicWriteJson(patchPath, patch);
          send(response, 200, { patch, message: `修改已原子写入项目根目录的 ${PATCH_FILENAME}。` });
        }
      } catch (error) {
        send(response, 400, { error: error instanceof Error ? error.message : String(error) });
      }
      return true;
    }

    if (request.method === "POST" && requestUrl.pathname === "/__presentation-editor/upload-image") {
      if (!String(request.headers?.["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
        send(response, 415, { error: "Content-Type must be application/json" });
        return true;
      }
      try {
        const payload = await readBody(request);
        if (!payload || typeof payload !== "object" || Array.isArray(payload) || typeof payload.dataBase64 !== "string" || typeof payload.mimeType !== "string") throw new Error("image upload payload is invalid");
        if (!["image/png", "image/jpeg", "image/webp", "image/avif"].includes(payload.mimeType)) throw new Error("image MIME is not allowed");
        if (!/^[A-Za-z0-9+/=]+$/.test(payload.dataBase64)) throw new Error("image base64 is invalid");
        const bytes = Buffer.from(payload.dataBase64, "base64");
        if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error(`image must be within 1–${MAX_IMAGE_BYTES} bytes`);
        const detected = imageKind(bytes);
        if (!detected || detected.mimeType !== payload.mimeType) throw new Error("image bytes do not match the declared safe MIME");
        const dimensions = imageDimensions(bytes, detected.mimeType);
        if (!Number.isInteger(dimensions.width) || !Number.isInteger(dimensions.height) || dimensions.width < 1 || dimensions.height < 1) throw new Error("image dimensions are invalid");
        const assetId = randomUUID().replace(/-/g, "");
        const relative = path.posix.join(IMAGE_UPLOAD_DIR, `${assetId}.${detected.extension}`);
        const target = path.resolve(projectRoot, relative);
        if (!target.startsWith(rootPrefix)) throw new Error("managed image target escapes the project root");
        await atomicWriteBuffer(target, bytes);
        const asset = { assetId, src: relative.replace(/\\/g, "/"), sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`, mimeType: detected.mimeType, byteSize: bytes.length, ...dimensions };
        send(response, 200, { asset, message: "图片已写入项目受管相对路径；原图未删除，可在编辑器中恢复。" });
      } catch (error) {
        send(response, 400, { error: error instanceof Error ? error.message : String(error) });
      }
      return true;
    }

    send(response, 404, { error: "unknown presentation editor endpoint" });
    return true;
  };
}
