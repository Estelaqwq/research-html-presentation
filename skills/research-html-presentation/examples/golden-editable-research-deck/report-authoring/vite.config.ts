import { fileURLToPath } from "node:url";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { presentationEditorPlugin } from "./scripts/editor-vite-plugin.mjs";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig(({ mode }) => {
  const authoring = mode === "authoring";
  return {
    root: projectRoot,
    base: "./",
    plugins: [...(authoring ? [presentationEditorPlugin({ projectRoot })] : []), react()],
    resolve: { alias: { "@authoring-boundary": path.resolve(projectRoot, authoring ? "src/AuthoringBoundary.tsx" : "src/NoAuthoringBoundary.tsx") } },
    build: { outDir: "dist", emptyOutDir: true },
    server: { host: "127.0.0.1" },
    preview: { host: "127.0.0.1" },
  };
});
