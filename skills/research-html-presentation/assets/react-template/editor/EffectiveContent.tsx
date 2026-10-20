"use client";

import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from "react";
import type {
  BaseImageValue,
  EditableRegistry,
  EffectiveEditValue,
  ImageFit,
  ImagePosition,
  ManagedImageAsset,
  PresentationEditPatch,
  TextBoxSize,
} from "./EditPatchTypes";
import { applyEditPatch, applyEditValuesToPresentationItems } from "./applyEditPatch";
import { applyEffectiveValuesToDom, markRegistryBindings } from "./AutoEditRegistry";

export type PresentationEditorController = {
  available: boolean;
  editing: boolean;
  selectedEditId: string | null;
  select: (editId: string) => void;
  commitText: (editId: string, value: string) => string[];
  commitSize: (editId: string, value: TextBoxSize) => string[];
  commitImage: (editId: string, value: ManagedImageAsset) => string[];
  commitImageFit: (editId: string, value: ImageFit) => string[];
  commitImagePosition: (editId: string, value: ImagePosition) => string[];
  resetField: (editId: string, channel?: string) => void;
  uploadImage: (file: File) => Promise<ManagedImageAsset>;
};

export type PresentationEditorContextValue = PresentationEditorController & {
  registry: EditableRegistry;
  values: Map<string, EffectiveEditValue>;
};

const EMPTY_REGISTRY: EditableRegistry = { schemaVersion: "1.0", projectId: "disabled", outputMode: "slide-deck", baseFingerprint: "disabled", fields: [] };
const unavailable = () => ["editor unavailable"];
const unavailableAsync = async () => { throw new Error("editor unavailable"); };
export const PresentationEditorContext = createContext<PresentationEditorContextValue>({
  available: false,
  editing: false,
  selectedEditId: null,
  registry: EMPTY_REGISTRY,
  values: new Map(),
  select: () => undefined,
  commitText: unavailable,
  commitSize: unavailable,
  commitImage: unavailable,
  commitImageFit: unavailable,
  commitImagePosition: unavailable,
  resetField: () => undefined,
  uploadImage: unavailableAsync,
});

export function usePresentationEditor() { return useContext(PresentationEditorContext); }

export function useEffectivePresentationItems<T extends { id: string }>(items: T[]) {
  const editor = usePresentationEditor();
  return useMemo(() => applyEditValuesToPresentationItems(items, editor.registry, editor.values), [editor.registry, editor.values, items]);
}

export function EffectiveDomPatch({ registry, values }: { registry: EditableRegistry; values: Map<string, EffectiveEditValue> }) {
  useLayoutEffect(() => {
    let frame = 0;
    let applying = false;
    const apply = () => {
      if (applying) return;
      applying = true;
      try {
        markRegistryBindings(registry);
        applyEffectiveValuesToDom(registry, values);
        document.documentElement.dataset.editPatchReady = "true";
      } finally { applying = false; }
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; apply(); });
    };
    apply();
    const observer = new MutationObserver((mutations) => {
      // A native contenteditable edit changes child text nodes before the
      // blur handler can commit the value. Do not let the old effective value
      // overwrite that in-progress user input; React state changes still call
      // apply() through the registry/values effect below.
      if (mutations.some((mutation) => {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        return !target?.closest("[contenteditable='true'],[data-editor-text-input='true']");
      })) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      delete document.documentElement.dataset.editPatchReady;
    };
  }, [registry, values]);
  return null;
}

/**
 * Production-safe Base + validated Patch provider. It contains no toolbar, save
 * adapter, upload route, authoring keyboard handlers, or editor stylesheet.
 */
export function EffectiveContentProvider({ registry, patch, children, release = false }: {
  registry: EditableRegistry;
  patch?: PresentationEditPatch | null;
  children: ReactNode;
  release?: boolean;
}) {
  const effective = useMemo(() => applyEditPatch(registry, patch, { release }), [patch, registry, release]);
  if (!effective.validation.valid) throw new Error(`presentation edit patch is invalid: ${effective.validation.errors.join("; ")}`);
  const context = useMemo<PresentationEditorContextValue>(() => ({
    available: false,
    editing: false,
    selectedEditId: null,
    registry,
    values: effective.values,
    select: () => undefined,
    commitText: unavailable,
    commitSize: unavailable,
    commitImage: unavailable,
    commitImageFit: unavailable,
    commitImagePosition: unavailable,
    resetField: () => undefined,
    uploadImage: unavailableAsync,
  }), [effective.values, registry]);
  return <PresentationEditorContext.Provider value={context}><EffectiveDomPatch registry={registry} values={effective.values} />{children}</PresentationEditorContext.Provider>;
}

export function effectiveImageValue(value?: EffectiveEditValue): BaseImageValue | undefined {
  return value?.kind === "image" && value.image && "alt" in value.image ? value.image : undefined;
}
