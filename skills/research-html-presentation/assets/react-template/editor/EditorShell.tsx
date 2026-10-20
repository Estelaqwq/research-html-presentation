"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { EditPatchOperation, EditableFieldDefinition, EditableRegistry, ManagedImageAsset, PresentationEditPatch, TextBoxSize, ImageFit, ImagePosition } from "./EditPatchTypes";
import type { EditStorageAdapter } from "./EditStorageAdapter";
import { applyEditPatch, operationChannel, operationNeedsEvidenceReview, validateEditPatch, validateReplacementText, validationRequirements } from "./applyEditPatch";
import { AutoEditableBindingLayer } from "./EditableElement";
import { discoverDefaultEditableFields } from "./AutoEditRegistry";
import { ImageInspector } from "./ImageInspector";
import { EffectiveDomPatch, PresentationEditorContext, type PresentationEditorContextValue } from "./EffectiveContent";

import { collectPortableEdits, downloadBlob, downloadEditedReport, parsePortableEdits, portableLoadError, prepareImportedFlows, useImportedAssets, verifyPortableAssets } from "../portable-state";

export type EditorAuthoringConfig = {
  enabled: boolean;
  environment: "development" | "production";
  registry: EditableRegistry;
  storage: EditStorageAdapter;
  initialPatch?: PresentationEditPatch | null;
  allowedOrigins?: string[];
};

function localAuthoringAllowed(config: EditorAuthoringConfig) {
  if (typeof window === "undefined" || !config.enabled) return false;
  const query = new URLSearchParams(window.location.search);
  if (query.get("presenter") === "1" || query.get("print") === "1") return false;
  if (query.get("edit") === "0") return false;
  const host = window.location.hostname.toLowerCase();
  if (config.environment === "production") return true;
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost") || (config.allowedOrigins ?? []).includes(window.location.origin);
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function operationId() { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `edit-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function keyOf(operation: EditPatchOperation) { return `${operation.targetId}::${operation.field}::${operationChannel(operation)}`; }
function reviewStatus(operations: EditPatchOperation[]) {
  const pending = operations.some((operation) => operation.review?.status === "pending");
  const verified = operations.some((operation) => operation.review?.status === "verified");
  return pending ? "needs-evidence-review" : verified ? "verified" : "not-required";
}

function createPatch(registry: EditableRegistry, revision: number, operations: EditPatchOperation[]): PresentationEditPatch {
  const base = {
    revision,
    projectId: registry.projectId,
    outputMode: registry.outputMode,
    baseFingerprint: registry.baseFingerprint,
    savedAt: new Date().toISOString(),
    operations: clone(operations),
  };
  return registry.schemaVersion === "2.0"
    ? { schemaVersion: "2.0", status: "clean", reviewStatus: reviewStatus(operations), ...base }
    : { schemaVersion: "1.0", status: "clean", ...base };
}

function upsert(operations: EditPatchOperation[], next: EditPatchOperation) {
  const channel = operationChannel(next);
  return [...operations.filter((candidate) => {
    if (candidate.targetId !== next.targetId || candidate.field !== next.field) return true;
    const current = operationChannel(candidate);
    return channel !== "all" && current !== "all" && current !== channel;
  }), next];
}

function layoutErrors(registry: EditableRegistry, operations: EditPatchOperation[] = []) {
  const errors: string[] = [];
  if (registry.outputMode === "scroll-report" && document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) errors.push("编辑结果产生横向滚动");
  const changedTargets = new Set(operations.map((operation) => `${operation.targetId}::${operation.field}`));
  for (const field of registry.fields) {
    if (changedTargets.size && !changedTargets.has(`${field.targetId}::${field.field}`)) continue;
    const element = document.querySelector<HTMLElement>(`[data-edit-id="${CSS.escape(field.editId)}"]`);
    if (!element || element.offsetParent === null) continue;
    // Browser text metrics can differ by a fractional pixel after scaling;
    // reserve the blocking check for a real overflow rather than a 1–2 px
    // line-box rounding difference.
    if (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2) errors.push(`${field.editId}: 内容溢出`);
    if (registry.outputMode === "slide-deck") {
      const slide = element.closest<HTMLElement>(".slide");
      const box = slide?.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      if (box) {
        // The 1600×900 deck is frequently displayed scaled inside a narrow
        // local viewer. Convert logical safe margins to the painted viewport
        // instead of comparing fixed CSS pixels, otherwise every edit in a
        // scaled slide is incorrectly rejected at Save time.
        const scaleX = box.width / 1600; const scaleY = box.height / 900;
        const safeLeft = box.left + 72 * scaleX; const safeRight = box.right - 72 * scaleX;
        const safeTop = box.top + 42 * scaleY; const safeBottom = box.bottom - 36 * scaleY;
        if (rect.left < safeLeft || rect.right > safeRight || rect.top < safeTop || rect.bottom > safeBottom) errors.push(`${field.editId}: 超出 deck 安全区`);
      }
    }
  }
  return [...new Set(errors)];
}

export function EditorShell({ config, children }: { config: EditorAuthoringConfig; children: ReactNode }) {
  const available = useMemo(() => localAuthoringAllowed(config), [config]);
  const [registry, setRegistry] = useState<EditableRegistry>(config.registry);
  const [registryReady, setRegistryReady] = useState(!config.enabled);
  const [registrySyncError, setRegistrySyncError] = useState("");
  useEffect(() => {
    if (!config.enabled) return;
    let cancelled = false;
    setRegistryReady(false);
    setRegistrySyncError("");
    void discoverDefaultEditableFields(config.registry).then((next) => {
      if (!cancelled) { setRegistry(next); setRegistryReady(true); }
    }).catch((error) => {
      if (!cancelled) {
        const message = error instanceof Error ? error.message : String(error);
        setRegistrySyncError(message);
        setRegistryReady(true);
        setNotice(`编辑 Registry 同步失败：${message}`);
      }
    });
    return () => { cancelled = true; };
  }, [config.enabled, config.registry]);
  const initial = useMemo(() => applyEditPatch(registry, config.initialPatch, { localAuthoring: available }), [available, config.initialPatch, registry]);
  const [editing, setEditing] = useState(false);
  const [selectedEditId, setSelectedEditId] = useState<string | null>(null);
  const [operations, setOperations] = useState<EditPatchOperation[]>(() => initial.validation.valid ? clone(config.initialPatch?.operations ?? []) : []);
  const [saved, setSaved] = useState<EditPatchOperation[]>(() => clone(config.initialPatch?.operations ?? []));
  const [revision, setRevision] = useState(config.initialPatch?.revision ?? 0);
  const [past, setPast] = useState<EditPatchOperation[][]>([]);
  const [future, setFuture] = useState<EditPatchOperation[][]>([]);
  const [notice, setNotice] = useState(initial.validation.valid ? "" : initial.validation.errors.join("；"));
  const [saving, setSaving] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [transferring, setTransferring] = useState(false);
  const operationsRef = useRef(operations);
  const pastRef = useRef(past);
  const futureRef = useRef(future);
  const fields = useMemo(() => new Map(registry.fields.map((field) => [field.editId, field])), [registry.fields]);
  const duplicateRegistryCount = useMemo(() => {
    const editIds = new Set<string>(); const targetFields = new Set<string>(); let duplicates = 0;
    for (const field of registry.fields) {
      const key = `${field.targetId}::${field.field}`;
      if (editIds.has(field.editId) || targetFields.has(key)) duplicates += 1;
      editIds.add(field.editId); targetFields.add(key);
    }
    return duplicates;
  }, [registry.fields]);
  const effectivePatch = useMemo(() => createPatch(registry, revision, operations), [operations, registry, revision]);
  const effective = useMemo(() => applyEditPatch(registry, effectivePatch, { localAuthoring: available }), [available, effectivePatch, registry]);
  const dirty = JSON.stringify(operations) !== JSON.stringify(saved);
  const selected = selectedEditId ? registry.fields.find((field) => field.editId === selectedEditId) : undefined;
  const selectedText = selected && selected.kind !== "image" ? selected : undefined;
  const [inspectorDraft, setInspectorDraft] = useState("");

  useEffect(() => {
    if (!selectedText) { setInspectorDraft(""); return; }
    const value = effective.values.get(selectedText.editId)?.text;
    setInspectorDraft(typeof value === "string" ? value : selectedText.baseValue);
  }, [effective.values, selectedText?.baseValue, selectedText?.editId]);

  useEffect(() => {
    if (!config.enabled || !registryReady) return;
    let disposed = false;
    void config.storage.load(registry).then((patch) => {
      if (disposed || !patch) return;
      const next = applyEditPatch(registry, patch, { localAuthoring: available, release: !available });
      if (!next.validation.valid) { setNotice(`补丁未应用：${next.validation.errors.join("；")}`); return; }
      const values = clone(patch.operations);
      operationsRef.current = values; pastRef.current = []; futureRef.current = [];
      setOperations(values); setSaved(clone(values)); setPast([]); setFuture([]); setRevision(patch.revision);
    }).catch((error) => setNotice(`读取补丁失败：${error instanceof Error ? error.message : String(error)}`));
    return () => { disposed = true; };
  }, [available, config.enabled, config.storage, registry, registryReady]);

  const append = useCallback((operation: EditPatchOperation) => {
    const current = operationsRef.current;
    if (current.some((candidate) => keyOf(candidate) === keyOf(operation) && JSON.stringify(candidate.value) === JSON.stringify(operation.value))) return;
    const nextPast = [...pastRef.current, clone(current)];
    const next = upsert(current, operation);
    operationsRef.current = next; pastRef.current = nextPast; futureRef.current = [];
    setOperations(next); setPast(nextPast); setFuture([]); setNotice("");
  }, []);

  const base = useCallback((field: EditableFieldDefinition) => {
    const review = registry.schemaVersion === "2.0" && operationNeedsEvidenceReview(field, { operation: "replace-text" } as EditPatchOperation, { localAuthoring: true })
      ? { status: "pending" as const } : undefined;
    return {
      operationId: operationId(), scope: field.scope, targetId: field.targetId, field: field.field,
      expectedValueHash: field.expectedValueHash, validation: validationRequirements(field, { localAuthoring: true }), ...(review ? { review } : {}),
    };
  }, [registry.schemaVersion]);

  const commitText = useCallback((editId: string, value: string) => {
    const field = fields.get(editId);
    if (!field || field.kind === "image") return ["字段不是文字目标"];
    const errors = validateReplacementText(value, field, { localAuthoring: true });
    if (errors.length) { setNotice(errors.join("；")); return errors; }
    const operation = { ...base(field), operation: "replace-text" as const, value };
    if (registry.schemaVersion === "2.0" && operationNeedsEvidenceReview(field, operation, { localAuthoring: true })) operation.review = { status: "pending" };
    append(operation);
    return [];
  }, [append, base, fields, registry.schemaVersion]);

  const commitFocusedText = useCallback(() => {
    const active = document.activeElement;
    const inspector = active instanceof HTMLTextAreaElement && active.dataset.editorTextInput === "true";
    const inline = active instanceof HTMLElement && active.isContentEditable && Boolean(active.dataset.editId);
    if (!inspector && !inline) return [];
    const editId = active instanceof HTMLElement ? active.dataset.editId : undefined;
    if (!editId) return [];
    const value = inspector && active instanceof HTMLTextAreaElement ? active.value : active.textContent ?? "";
    return commitText(editId, value);
  }, [commitText]);

  const commitSize = useCallback((editId: string, value: TextBoxSize) => {
    const field = fields.get(editId);
    if (!field?.resize) return ["该目标不允许调整尺寸"];
    const snap = field.resize.snap ?? 8;
    const normalized = {
      width: value.width === undefined ? undefined : Math.round(value.width / snap) * snap,
      minHeight: value.minHeight === undefined ? undefined : Math.round(value.minHeight / snap) * snap,
    };
    if ((normalized.width !== undefined && (normalized.width < field.resize.minWidth || normalized.width > field.resize.maxWidth)) || (normalized.minHeight !== undefined && (normalized.minHeight < field.resize.minHeight || normalized.minHeight > field.resize.maxMinHeight))) return ["尺寸超出安全范围"];
    const operation = { ...base(field), operation: registry.schemaVersion === "2.0" ? "set-element-size" as const : "set-text-box-size" as const, value: normalized };
    if (registry.schemaVersion === "2.0" && operationNeedsEvidenceReview(field, operation, { localAuthoring: true })) operation.review = { status: "pending" };
    append(operation);
    return [];
  }, [append, base, fields, registry.schemaVersion]);

  const commitImage = useCallback((editId: string, value: ManagedImageAsset) => {
    const field = fields.get(editId);
    if (!field || field.kind !== "image") return ["字段不是图片目标"];
    if (registry.schemaVersion !== "2.0") return ["图片编辑需要 schemaVersion 2.0 Registry"];
    append({ ...base(field), operation: "replace-image", value, review: operationNeedsEvidenceReview(field, { operation: "replace-image" } as EditPatchOperation, { localAuthoring: true }) ? { status: "pending" } : undefined });
    return [];
  }, [append, base, fields, registry.schemaVersion]);

  const commitImageFit = useCallback((editId: string, value: ImageFit) => {
    const field = fields.get(editId);
    if (!field || field.kind !== "image" || registry.schemaVersion !== "2.0") return ["图片显示方式不可修改"];
    append({ ...base(field), operation: "set-image-fit", value, review: operationNeedsEvidenceReview(field, { operation: "set-image-fit" } as EditPatchOperation, { localAuthoring: true }) ? { status: "pending" } : undefined });
    return [];
  }, [append, base, fields, registry.schemaVersion]);

  const commitImagePosition = useCallback((editId: string, value: ImagePosition) => {
    const field = fields.get(editId);
    if (!field || field.kind !== "image" || registry.schemaVersion !== "2.0") return ["图片位置不可修改"];
    append({ ...base(field), operation: "set-image-position", value, review: operationNeedsEvidenceReview(field, { operation: "set-image-position" } as EditPatchOperation, { localAuthoring: true }) ? { status: "pending" } : undefined });
    return [];
  }, [append, base, fields, registry.schemaVersion]);

  const resetField = useCallback((editId: string, channel = "all") => {
    const field = fields.get(editId);
    if (!field) return;
    if (field.kind === "image" && registry.schemaVersion === "2.0") append({ ...base(field), operation: "reset-image", value: channel as "source" | "fit" | "position" | "size" | "all" });
    else append({ ...base(field), operation: "reset-field", value: channel as "text" | "size" | "all" });
  }, [append, base, fields, registry.schemaVersion]);

  const uploadImage = useCallback(async (file: File) => {
    if (!config.storage.uploadImage) throw new Error("当前保存方式不支持图片上传");
    return (await config.storage.uploadImage(file)).asset;
  }, [config.storage]);

  const undo = useCallback(() => {
    const next = pastRef.current.at(-1); if (!next) return;
    const nextFuture = [clone(operationsRef.current), ...futureRef.current];
    operationsRef.current = clone(next); pastRef.current = pastRef.current.slice(0, -1); futureRef.current = nextFuture;
    setOperations(clone(next)); setPast(clone(pastRef.current)); setFuture(nextFuture);
  }, []);
  const redo = useCallback(() => {
    const next = futureRef.current[0]; if (!next) return;
    const nextPast = [...pastRef.current, clone(operationsRef.current)];
    operationsRef.current = clone(next); pastRef.current = nextPast; futureRef.current = futureRef.current.slice(1);
    setOperations(clone(next)); setPast(nextPast); setFuture(clone(futureRef.current));
  }, []);
  const resetAll = useCallback(() => {
    if (!window.confirm("恢复全部内容到生成时的状态？")) return;
    const nextPast = [...pastRef.current, clone(operationsRef.current)];
    operationsRef.current = []; pastRef.current = nextPast; futureRef.current = [];
    setOperations([]); setPast(nextPast); setFuture([]); setNotice("");
  }, []);
  const undoFromEditor = useCallback(() => { if (!commitFocusedText().length) undo(); }, [commitFocusedText, undo]);
  const redoFromEditor = useCallback(() => { if (!commitFocusedText().length) redo(); }, [commitFocusedText, redo]);
  const resetFromEditor = useCallback(() => { if (!commitFocusedText().length) resetAll(); }, [commitFocusedText, resetAll]);
  const commitBeforeEditorAction = useCallback(() => { commitFocusedText(); }, [commitFocusedText]);
  const save = useCallback(async () => {
    if (!available || saving) return;
    const focusedErrors = commitFocusedText();
    if (focusedErrors.length) return;
    const layoutWarnings = layoutErrors(registry, operationsRef.current);
    const patch = createPatch(registry, revision + 1, operationsRef.current);
    const validation = validateEditPatch(patch, registry, { localAuthoring: true });
    if (!validation.valid) { setNotice(`保存未完成：${validation.errors.join("；")}`); return; }
    setSaving(true);
    try {
      const result = await config.storage.save(patch, registry);
      setRevision(result.patch.revision); setSaved(clone(result.patch.operations));
      setNotice([result.message, layoutWarnings.length ? `版式提示（不影响保存）：${layoutWarnings.join("；")}` : ""].filter(Boolean).join("；"));
    } catch (error) { setNotice(`保存失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { setSaving(false); }
  }, [available, commitFocusedText, config.storage, registry, revision, saving]);

  const exportChanges = useCallback(async (html: boolean) => {
    if (transferring || !registryReady || commitFocusedText().length) return;
    const patch = createPatch(registry, revision + 1, operationsRef.current);
    const validation = validateEditPatch(patch, registry, html ? { release: true } : { localAuthoring: true });
    if (!validation.valid) { setNotice(`未导出：${validation.errors.join("；")}`); return; }
    setTransferring(true);
    try {
      const bundle = await collectPortableEdits(registry, patch);
      if (html) await downloadEditedReport(bundle);
      else downloadBlob(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }), "报告修改_可导入.json");
      setNotice(html ? "修改版HTML已下载，包含当前正文和流程图修改，可复制到其他设备打开。" : "修改文件已导出，可在同一底稿版本中导入；包括正文和流程图修改。");
    } catch (error) { setNotice(`导出失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { setTransferring(false); }
  }, [commitFocusedText, registry, registryReady, revision, transferring]);

  const importChanges = useCallback(async (file: File) => {
    if (transferring || !registryReady) return;
    if (dirty && !window.confirm("当前有未保存修改，导入后将替换当前编辑内容。确定导入吗？")) return;
    setTransferring(true);
    try {
      if (file.size > 32 * 1024 * 1024) throw new Error("修改文件超过32 MB，无法导入。");
      const bundle = parsePortableEdits(await file.text(), registry);
      const patch = bundle.patch as PresentationEditPatch;
      const validation = validateEditPatch(patch, registry, { localAuthoring: true });
      if (!validation.valid) throw new Error(validation.errors.join("；"));
      await verifyPortableAssets(bundle);
      const applyFlows = await prepareImportedFlows(bundle.flows);
      const next = clone(patch.operations), nextPast = [...pastRef.current, clone(operationsRef.current)];
      useImportedAssets(bundle);
      operationsRef.current = next; pastRef.current = nextPast; futureRef.current = [];
      setOperations(next); setPast(nextPast); setFuture([]); applyFlows();
      setNotice("修改已导入。正文和流程图可继续编辑，分别点击保存可保留到当前浏览器或项目。");
    } catch (error) { setNotice(`未导入：${error instanceof Error ? error.message : String(error)}`); }
    finally { setTransferring(false); }
  }, [dirty, registry, registryReady, transferring]);

  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!available) { setToolbarTarget(null); return; }
    const update = () => setToolbarTarget(document.querySelector<HTMLElement>(".deck-toolbar[data-runtime-controls='true']") ?? document.querySelector<HTMLElement>("[data-runtime-controls='true']"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [available]);

  useEffect(() => {
    if (!available) return;
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editingInput = ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "") || Boolean(target?.isContentEditable);
      if (!editingInput && event.key.toLowerCase() === "e" && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); setEditing((active) => !active); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redoFromEditor() : undoFromEditor(); }
    };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("keydown", listener); window.addEventListener("beforeunload", beforeUnload);
    return () => { window.removeEventListener("keydown", listener); window.removeEventListener("beforeunload", beforeUnload); };
  }, [available, dirty, redoFromEditor, save, undoFromEditor]);

  const context = useMemo<PresentationEditorContextValue>(() => ({
    available, editing, selectedEditId, registry, values: effective.values, select: setSelectedEditId,
    commitText, commitSize, commitImage, commitImageFit, commitImagePosition, resetField, uploadImage,
  }), [available, commitImage, commitImageFit, commitImagePosition, commitSize, commitText, editing, effective.values, registry, resetField, selectedEditId, uploadImage]);
  const toggle = <button
    type="button"
    className="presentation-editor-toggle"
    data-editor-toggle="true"
    data-editor-control="true"
    data-editor-lock="true"
    aria-expanded={editing}
    aria-controls="presentation-editor-panel"
    onClick={() => setEditing((active) => !active)}
  >编辑 <kbd>E</kbd></button>;
  const editorToggle = available
    ? toolbarTarget ? createPortal(toggle, toolbarTarget) : <div className="presentation-editor-toggle-fallback">{toggle}</div>
    : null;

  return <PresentationEditorContext.Provider value={context}>
    <EffectiveDomPatch registry={registry} values={effective.values} />
    <div
      data-editor-authoring={available ? "true" : "false"}
      data-editor-active={editing ? "true" : "false"}
      data-editor-dirty={dirty ? "true" : "false"}
      data-editor-saving={saving ? "true" : "false"}
      data-editor-operation-count={String(operations.length)}
      data-editor-registry-field-count={String(registry.fields.length)}
      data-editor-registry-duplicate-count={String(duplicateRegistryCount)}
      data-editor-registry-sync-error={registrySyncError}
    >
      {available ? <AutoEditableBindingLayer /> : null}
      {children}
      {portableLoadError && <p role="alert" data-portable-load-error="true">{portableLoadError}</p>}
      {!available && notice && <p role="alert" data-editor-load-error="true">{notice}</p>}
      {editorToggle}
      {available && editing ? <aside id="presentation-editor-panel" className="presentation-editor-shell" data-editor-panel="true" aria-label="本地演示编辑器">
        <strong>本地编辑</strong><span>编辑工作区 · E 收起</span>
        <button type="button" data-editor-action="close" onClick={() => setEditing(false)}>收起</button>
        <button type="button" data-editor-action="save" onMouseDown={commitBeforeEditorAction} onClick={() => void save()} disabled={saving}>保存</button>
        <button type="button" onMouseDown={commitBeforeEditorAction} onClick={undoFromEditor}>撤销</button><button type="button" onMouseDown={commitBeforeEditorAction} onClick={redoFromEditor}>重做</button>
        <button type="button" onMouseDown={commitBeforeEditorAction} onClick={resetFromEditor}>全部恢复</button>
        <button type="button" data-editor-action="export-changes" onMouseDown={commitBeforeEditorAction} disabled={transferring || !registryReady} onClick={() => void exportChanges(false)}>导出修改文件</button>
        <button type="button" data-editor-action="import-changes" disabled={transferring || !registryReady} onClick={() => importRef.current?.click()}>导入修改文件</button>
        {registry.outputMode === "scroll-report" && <button type="button" data-editor-action="export-html" onMouseDown={commitBeforeEditorAction} disabled={transferring || !registryReady} onClick={() => void exportChanges(true)}>下载修改版HTML</button>}
        <input ref={importRef} type="file" hidden accept=".json,application/json" aria-label="选择报告修改文件" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void importChanges(file); }} />

        {selectedText ? <div className="presentation-editor-text-inspector">
          <label htmlFor="presentation-editor-text-input">当前文字</label>
          <textarea
            id="presentation-editor-text-input"
            data-editor-text-input="true"
            data-edit-id={selectedText.editId}
            value={inspectorDraft}
            onChange={(event) => setInspectorDraft(event.target.value)}
            onBlur={(event) => { const value = event.currentTarget.value; if (!commitText(selectedText.editId, value).length) setInspectorDraft(value); }}
          />
        </div> : null}
        {selected?.kind === "image" ? <ImageInspector editId={selected.editId} /> : null}
        {effective.validation.needsEvidenceReview ? <small>存在证据相关修改：可继续本地预览，但不能正式发布、PDF 或报告打印。</small> : null}
        {notice ? <small role="status">{notice}</small> : null}
      </aside> : null}
    </div>
  </PresentationEditorContext.Provider>;
}
