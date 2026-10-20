import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthoringBoundary } from "@authoring-boundary";
import { App } from "./App";
import "./runtime/presentation-core.css";
import "./runtime/layout-recipes.css";
import "./runtime/visual-styles/tech-engineering-dark.css";
import "./runtime/presenter-view.css";
import "./runtime/print-export.css";
import "./styles/project.css";
import "./styles/mode.css";

createRoot(document.getElementById("root")!).render(<StrictMode><AuthoringBoundary><App /></AuthoringBoundary></StrictMode>);
