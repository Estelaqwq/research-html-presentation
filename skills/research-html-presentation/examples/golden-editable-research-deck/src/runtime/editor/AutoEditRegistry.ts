import type { EditableFieldDefinition, EditableImageDefinition, EditableRegistry, EditableTextDefinition, EffectiveEditValue } from "./EditPatchTypes";

export const AUTO_EDITABLE_TEXT_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,blockquote,dt,dd,td,th,figcaption,span,strong,em,b,small,kbd,caption,cite,code,sup,sub,mark,label,a,time,svg text";
export const AUTO_EDITABLE_IMAGE_SELECTOR = "img";
export const EDITOR_LOCK_SELECTOR = "[data-editor-lock='true'],[data-runtime-controls],[data-runtime-control],[data-report-navigation],[data-evidence-chart-internals],[data-editor-panel],[data-editor-control],[data-brand-role],[data-brand-audit]";
const NON_AUDIENCE_TEXT_TAGS = new Set(["script", "style", "template", "noscript", "title", "option", "textarea", "select", "input", "datalist", "canvas"]);

const POSITIONAL_SELECTOR = /:(?:nth|first|last|only)-(?:child|of-type)|:(?:first|last)-child/i;
const STABLE_ATTRIBUTE = /\[data-(?:edit-id|content-key|visual-id|figure-id|image-id|slide-id|report-section|finding-id|claim-id)(?:[\s~|^$*]?=|\])/i;

export function isStableEditSelector(selector: string) {
  return typeof selector === "string"
    && selector.trim().length > 0
    && !POSITIONAL_SELECTOR.test(selector)
    && !/[>+~]/.test(selector)
    && !selector.includes(",")
    && STABLE_ATTRIBUTE.test(selector);
}

function safePart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._:-]+/gi, "-").replace(/^-+|-+$/g, "") || "content";
}

/** Stable IDs are based on content identity, never rendered sibling position. */
export function stableEditTargetId(ownerId: string, contentKey: string, field: string) {
  return `${safePart(ownerId)}/${safePart(contentKey)}/${safePart(field)}`;
}

export function stableEditId(ownerId: string, contentKey: string, field: string) {
  return `edit:${stableEditTargetId(ownerId, contentKey, field)}`;
}

export function createAutoTextTarget(input: Omit<EditableTextDefinition, "kind" | "editId" | "targetId"> & {
  ownerId: string;
  contentKey: string;
}) : EditableTextDefinition {
  const targetId = stableEditTargetId(input.ownerId, input.contentKey, input.field);
  return { ...input, ownerId: undefined, contentKey: undefined, kind: "text", targetId, editId: `edit:${targetId}` } as EditableTextDefinition;
}

export function createAutoImageTarget(input: Omit<EditableImageDefinition, "kind" | "editId" | "targetId"> & {
  ownerId: string;
  contentKey: string;
}) : EditableImageDefinition {
  const targetId = stableEditTargetId(input.ownerId, input.contentKey, input.field);
  return { ...input, ownerId: undefined, contentKey: undefined, kind: "image", targetId, editId: `edit:${targetId}` } as EditableImageDefinition;
}

export function fieldSelector(field: EditableFieldDefinition) {
  if (field.selector) return field.selector;
  const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(field.editId) : field.editId.replace(/["\\]/g, "\\$&");
  return `[data-edit-id="${escaped}"]`;
}

export function resolveFieldElements(field: EditableFieldDefinition, root: ParentNode = document) {
  try { return [...root.querySelectorAll<HTMLElement>(fieldSelector(field))]; }
  catch { return []; }
}

export function elementIsEditorLocked(element: Element) {
  return Boolean(element.closest(EDITOR_LOCK_SELECTOR));
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return `sha256:${[...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("")}`;
}

function ownerFor(element: Element) {
  const owner = element.closest<HTMLElement>("[data-slide-id],[data-report-section],[data-content-key]");
  return owner?.dataset.slideId || owner?.id || owner?.dataset.contentKey || "presentation";
}

function isAudienceVisible(element: Element) {
  if (element.closest("[hidden]")) return false;
  const hidden = element.closest<HTMLElement>("[aria-hidden='true']");
  if (!hidden) return true;
  // DeckRuntime uses aria-hidden on non-current slide sections. Those slides
  // remain audience content and must be discovered before navigation reaches
  // them; aria-hidden on a child still means that child is non-audience UI.
  const slide = element.closest<HTMLElement>("[data-slide-id]");
  return Boolean(slide && hidden === slide);
}

function normalizedContent(value: string) { return value.replace(/\s+/g, " ").trim(); }

function isDefaultTextCandidate(element: HTMLElement) {
  const tag = element.tagName.toLowerCase();
  if (NON_AUDIENCE_TEXT_TAGS.has(tag) || !normalizedContent(element.textContent ?? "")) return false;
  // Keep the explicit semantic text set, and add a conservative fallback for
  // ordinary text-only containers. Mixed containers stay bound through their
  // visible text descendants so editing never destroys nested markup.
  return element.matches(AUTO_EDITABLE_TEXT_SELECTOR) || element.children.length === 0;
}

async function stableContentRole(element: HTMLElement, value: string, isImage: boolean) {
  const tag = element.tagName.toLowerCase();
  const semanticKey = element.dataset.contentKey || element.dataset.contentRole || "";
  const classes = typeof element.className === "string" ? element.className.trim().split(/\s+/).filter(Boolean).sort().join(".") : "";
  const elementId = element.id || "";
  const identity = semanticKey
    ? `${tag}|${semanticKey}|${isImage ? "image" : "text"}`
    : `${tag}|${elementId}|${classes}|${normalizedContent(value).slice(0, 256)}|${isImage ? "image" : "text"}`;
  const digest = (await sha256(identity)).slice("sha256:".length, "sha256:".length + 16);
  return `${tag}-${digest}`;
}

function hasTextTargetAncestor(element: Element, candidates: Set<Element>) {
  let parent = element.parentElement;
  while (parent) {
    if (candidates.has(parent)) return true;
    parent = parent.parentElement;
  }
  return false;
}

/**
 * Build a deterministic authoring Registry from semantic content, never DOM
 * sibling order. A regenerated base deliberately gets new hashes and is then
 * handled by normal Patch rebase rules.
 */
export async function discoverDefaultEditableFields(seed: EditableRegistry, root: ParentNode = document) {
  const fields = [...seed.fields]; const known = new Set(fields.map((field) => field.editId));
  // Bind scaffold/hand-authored seed fields to their semantic owner before
  // discovering ordinary copy. This keeps a Registry target stable even when
  // the rendered DOM has no hand-written data-edit-id attribute.
  for (const field of fields) {
    if (field.selector || !field.targetId) continue;
    const owner = [...root.querySelectorAll<HTMLElement>("[data-slide-id],[data-report-section]")].find((element) => element.dataset.slideId === field.targetId || element.id === field.targetId);
    if (!owner) continue;
    const candidate = [...owner.querySelectorAll<HTMLElement>(".slide-title,[data-title-audit],[data-content-key]")].find((element) => field.field === "title" ? element.classList.contains("slide-title") || element.dataset.titleAudit === "true" : element.dataset.contentKey === field.field);
    if (!candidate) continue;
    candidate.dataset.editId = field.editId;
    candidate.dataset.editTargetId = field.targetId;
    candidate.dataset.editField = field.field;
    candidate.dataset.editStrategy = field.strategy;
    candidate.dataset.editKind = field.kind ?? "text";
  }
  const candidates = [...new Set([
    ...root.querySelectorAll<HTMLElement>(`${AUTO_EDITABLE_TEXT_SELECTOR},${AUTO_EDITABLE_IMAGE_SELECTOR}`),
    ...[...root.querySelectorAll<HTMLElement>("*")].filter((element) => element instanceof HTMLImageElement || isDefaultTextCandidate(element)),
  ])];
  const textCandidates = new Set<Element>(candidates.filter((element) => {
    return !(element instanceof HTMLImageElement)
      && isAudienceVisible(element)
      && !elementIsEditorLocked(element)
      && Boolean((element.textContent ?? "").trim());
  }));
  for (const element of candidates) {
    if (elementIsEditorLocked(element) || !isAudienceVisible(element)) continue;
    const isImage = element instanceof HTMLImageElement;
    const value = isImage ? element.currentSrc || element.src : (element.textContent ?? "").trim();
    if (!value) continue;
    const explicitEditId = element.dataset.editId;
    // A containing text block is the stable editable target for nested copy.
    // This avoids nested contenteditable elements while keeping every visible
    // descendant editable through its nearest target. Explicit component IDs
    // remain independent targets when a project intentionally supplies one.
    if (!explicitEditId && !isImage && hasTextTargetAncestor(element, textCandidates)) continue;
    const role = await stableContentRole(element, value, isImage);
    const fieldName = element.dataset.editField || (isImage ? "image" : "text");
    const targetId = element.dataset.editTargetId || stableEditTargetId(ownerFor(element), role, fieldName);
    const editId = explicitEditId || `edit:${targetId}`;
    if (known.has(editId)) {
      element.dataset.editId = editId;
      element.dataset.editTargetId = targetId;
      element.dataset.editField = fieldName;
      continue;
    }
    element.dataset.editId = editId;
    element.dataset.editTargetId = targetId;
    element.dataset.editField = fieldName;
    const selectorId = editId.replace(/["\\]/g, "\\$&");
    const imageStrategy = element.dataset.editStrategy === "locked" ? "locked" : element.dataset.scientific === "true" ? "evidence-image" : "plain-image";
    const textStrategy = ["plain-copy", "evidence-copy", "locked"].includes(element.dataset.editStrategy ?? "") ? element.dataset.editStrategy as "plain-copy" | "evidence-copy" | "locked" : "plain-copy";
    const common = { editId, targetId, field: fieldName, scope: seed.outputMode, selector: `[data-edit-id="${selectorId}"]`, expectedValueHash: await sha256(isImage ? JSON.stringify({ src: value, alt: (element as HTMLImageElement).alt }) : value), resize: seed.outputMode === "slide-deck" ? { mode: "slide" as const, minWidth: 120, maxWidth: 1456, minHeight: 24, maxMinHeight: 700, snap: 8 } : { mode: "report" as const, minWidth: 120, maxWidth: 1120, minHeight: 24, maxMinHeight: 1200, snap: 8 } };
    fields.push(isImage
      ? { ...common, kind: "image", strategy: imageStrategy, reviewOnChange: element.dataset.scientific === "true", baseValue: { src: value, alt: (element as HTMLImageElement).alt } }
      : { ...common, kind: "text", strategy: textStrategy, reviewOnChange: element.dataset.reviewOnChange === "true", baseValue: value });
    known.add(editId);
  }
  // Preserve legacy Registry schema versions. Runtime discovery must not
  // silently migrate a project's server-side Registry during local editing.
  return { ...seed, schemaVersion: seed.schemaVersion, fields } as EditableRegistry;
}

function setStyle(element: HTMLElement, property: string, value?: string) {
  if (element.style.getPropertyValue(property) === (value ?? "")) return;
  if (value === undefined) element.style.removeProperty(property);
  else element.style.setProperty(property, value);
}

function isBaseImageValue(value: unknown): value is import("./EditPatchTypes").BaseImageValue {
  return Boolean(value && typeof value === "object" && "alt" in value);
}

/**
 * Applies validated effective values without adding authoring UI. This is safe to use
 * in Audience, Presenter, Print, PDF and production entries.
 */
export function applyEffectiveValuesToDom(registry: EditableRegistry, values: Map<string, EffectiveEditValue>, root: ParentNode = document) {
  for (const field of registry.fields) {
    const effective = values.get(field.editId);
    if (!effective) continue;
    for (const element of resolveFieldElements(field, root)) {
      // Keep the user's in-flight local text until the blur/save path commits it.
      if (element instanceof HTMLElement && element.isContentEditable && document.activeElement === element) continue;
      element.dataset.editId = field.editId;
      element.dataset.editTargetId = field.targetId;
      element.dataset.editField = field.field;
      element.dataset.editKind = field.kind ?? "text";
      if ((field.kind ?? "text") === "image") {
        if (!(element instanceof HTMLImageElement)) continue;
        const image = effective.image;
        if (image?.src && element.getAttribute("src") !== image.src) element.setAttribute("src", image.src);
        const baseAlt = isBaseImageValue(image) ? image.alt : undefined;
        if (typeof baseAlt === "string" && element.alt !== baseAlt) element.alt = baseAlt;
        const fit = effective.fit ?? (isBaseImageValue(image) ? image.fit : undefined);
        if (fit) setStyle(element, "object-fit", fit);
        const position = effective.position ?? (isBaseImageValue(image) ? image.position : undefined);
        if (position) setStyle(element, "object-position", `${position.x}% ${position.y}%`);
      } else if (field.field === "alt" && element instanceof HTMLImageElement) {
        const next = effective.text ?? "";
        if (element.alt !== next) element.alt = next;
      } else {
        const next = effective.text ?? "";
        if (element.textContent !== next) element.textContent = next;
      }
      const width = effective.size?.width;
      const minHeight = effective.size?.minHeight;
      if (field.resize?.mode === "report") setStyle(element, "max-width", width === undefined ? undefined : `${width}px`);
      else setStyle(element, "width", width === undefined ? undefined : `${width}px`);
      setStyle(element, "min-height", minHeight === undefined ? undefined : `${minHeight}px`);
    }
  }
}

/** Adds deterministic binding metadata but never makes a locked subtree editable. */
export function markRegistryBindings(registry: EditableRegistry, root: ParentNode = document) {
  for (const field of registry.fields) {
    for (const element of resolveFieldElements(field, root)) {
      const set = (name: string, value: string) => { if (element.dataset[name] !== value) element.dataset[name] = value; };
      set("editId", field.editId);
      set("editTargetId", field.targetId);
      set("editField", field.field);
      set("editStrategy", field.strategy);
      set("editKind", field.kind ?? "text");
      if (elementIsEditorLocked(element) || field.strategy === "locked") set("editorLock", "true");
    }
  }
}
