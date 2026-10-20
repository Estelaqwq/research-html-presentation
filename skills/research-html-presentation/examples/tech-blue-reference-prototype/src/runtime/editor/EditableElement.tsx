"use client";

import { useEffect, type ClipboardEvent as ReactClipboardEvent, type ElementType, type ReactNode } from "react";
import { elementIsEditorLocked, markRegistryBindings, resolveFieldElements } from "./AutoEditRegistry";
import { usePresentationEditor } from "./EffectiveContent";

function insertPlainText(value: string) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(value);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Binds v2 Registry selectors through event delegation. No per-element editId prop
 * is required, and no DOM-order selector is accepted by deterministic validation.
 */
export function AutoEditableBindingLayer() {
  const editor = usePresentationEditor();
  useEffect(() => {
    markRegistryBindings(editor.registry);
    if (!editor.available || !editor.editing) return;
    const cleanups: Array<() => void> = [];
    for (const field of editor.registry.fields) {
      for (const element of resolveFieldElements(field)) {
        if (elementIsEditorLocked(element) || field.strategy === "locked") continue;
        const select = (event?: Event) => {
          event?.stopPropagation();
          editor.select(field.editId);
        };
        element.classList.add("editable-element");
        element.addEventListener("click", select);
        cleanups.push(() => { element.classList.remove("editable-element"); element.removeEventListener("click", select); });
        if ((field.kind ?? "text") === "image" || (field.field === "alt" && element instanceof HTMLImageElement)) {
          const previous = element.getAttribute("tabindex");
          if (!element.hasAttribute("tabindex")) element.tabIndex = 0;
          element.addEventListener("focus", select);
          cleanups.push(() => {
            element.removeEventListener("focus", select);
            if (previous === null) element.removeAttribute("tabindex"); else element.setAttribute("tabindex", previous);
          });
          continue;
        }
        // SVG text is an audience-visible edit target, but SVGTextElement does
        // not support HTML contentEditable. It is edited through the shared
        // text inspector while retaining the same stable field target.
        const rawElement = element as Element;
        if (!(rawElement instanceof HTMLElement)) {
          const previousTabIndex = rawElement.getAttribute("tabindex");
          if (!rawElement.hasAttribute("tabindex")) rawElement.setAttribute("tabindex", "0");
          rawElement.addEventListener("focus", select);
          cleanups.push(() => {
            rawElement.removeEventListener("focus", select);
            if (previousTabIndex === null) rawElement.removeAttribute("tabindex"); else rawElement.setAttribute("tabindex", previousTabIndex);
          });
          continue;
        }
        if (element.dataset.editorComponentBound === "true") continue;
        const previousEditable = element.getAttribute("contenteditable");
        const previousTabIndex = element.getAttribute("tabindex");
        element.contentEditable = "true";
        element.spellcheck = true;
        if (!element.hasAttribute("tabindex")) element.tabIndex = 0;
        const commit = () => {
          const errors = editor.commitText(field.editId, element.textContent ?? "");
          if (errors.length) element.textContent = editor.values.get(field.editId)?.text ?? (typeof field.baseValue === "string" ? field.baseValue : "");
        };
        const paste = (event: ClipboardEvent) => {
          event.preventDefault();
          insertPlainText(event.clipboardData?.getData("text/plain") ?? "");
        };
        const beforeInput = (event: InputEvent) => {
          if (event.inputType === "insertParagraph" || event.inputType === "insertLineBreak") {
            event.preventDefault();
            insertPlainText("\n");
          } else if (/^(?:insertFromDrop|insertFromPasteAsQuotation|format)/.test(event.inputType)) event.preventDefault();
        };
        element.addEventListener("focus", select);
        element.addEventListener("blur", commit);
        element.addEventListener("paste", paste);
        element.addEventListener("beforeinput", beforeInput as EventListener);
        cleanups.push(() => {
          element.removeEventListener("focus", select);
          element.removeEventListener("blur", commit);
          element.removeEventListener("paste", paste);
          element.removeEventListener("beforeinput", beforeInput as EventListener);
          if (previousEditable === null) element.removeAttribute("contenteditable"); else element.setAttribute("contenteditable", previousEditable);
          if (previousTabIndex === null) element.removeAttribute("tabindex"); else element.setAttribute("tabindex", previousTabIndex);
        });
      }
    }
    return () => cleanups.reverse().forEach((cleanup) => cleanup());
  }, [editor.available, editor.editing, editor.registry, editor.values]);
  return null;
}

/** Optional semantic helper for project-specific content outside shared primitives. */
export function EditableElement({ as, contentKey, editorLock = false, children, ...props }: {
  as?: ElementType;
  contentKey: string;
  editorLock?: boolean;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  const Tag = as ?? "span";
  return <Tag {...props} data-content-key={contentKey} data-editor-lock={editorLock ? "true" : undefined}>{children}</Tag>;
}

export function plainTextOnlyPaste(event: ReactClipboardEvent<HTMLElement>) {
  event.preventDefault();
  insertPlainText(event.clipboardData?.getData("text/plain") ?? "");
}
