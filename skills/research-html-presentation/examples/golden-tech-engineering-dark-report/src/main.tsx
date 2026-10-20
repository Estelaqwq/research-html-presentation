import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthoringBoundary } from "@authoring-boundary";
import { App } from "./App";
import "./runtime/presentation-core.css";
import "./runtime/evidence-visualization.css";
import "./runtime/visual-styles/tech-engineering-dark.css";
import "./runtime/report-styles/report-core.css";
import "./runtime/report-styles/report-navigation.css";
import "./runtime/report-styles/report-print.css";
import "./styles/project.css";
import "./styles/mode.css";

createRoot(document.getElementById("root")!).render(<StrictMode><AuthoringBoundary><App /></AuthoringBoundary></StrictMode>);
