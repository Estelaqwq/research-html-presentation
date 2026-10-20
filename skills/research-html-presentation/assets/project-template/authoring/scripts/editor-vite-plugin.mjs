import { createPresentationEditorHandler } from "./presentation_editor_local_server.mjs";

export function presentationEditorPlugin({ projectRoot }) {
  return {
    name: "zuel-local-presentation-authoring",
    apply: "serve",
    configureServer(server) {
      // Keep the Node-only authoring service out of Vite's production config
      // bundle.  It is loaded only when a local authoring server is started.
      const handler = createPresentationEditorHandler({ projectRoot, environment: "development" });
      server.middlewares.use((request, response, next) => {
        Promise.resolve(handler(request, response)).then((handled) => { if (!handled) next(); }).catch(next);
      });
    },
  };
}
