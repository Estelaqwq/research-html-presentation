import type { ReactNode } from "react";
import registryDocument from "../presentation-edit-registry.json";
import { EditorShell, type EditorAuthoringConfig } from "./runtime/editor/EditorShell";
import { createLocalProjectAdapter } from "./runtime/editor/EditStorageAdapter";
import type { EditableRegistry } from "./runtime/editor/EditPatchTypes";
import "./runtime/editor/editor.css";

const registry = registryDocument as EditableRegistry;
const config: EditorAuthoringConfig = {
  // Authoring is part of ordinary browser delivery. The server-side editor
  // plugin remains development-only; static and file:// pages use the local
  // browser Patch adapter.
  enabled: true,
  environment: import.meta.env.DEV ? "development" : "production",
  registry,
  storage: createLocalProjectAdapter(),
};

export function AuthoringBoundary({ children }: { children: ReactNode }) {
  return <EditorShell config={config}>{children}</EditorShell>;
}
