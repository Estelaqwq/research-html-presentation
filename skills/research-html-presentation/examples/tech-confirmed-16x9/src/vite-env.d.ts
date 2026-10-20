/// <reference types="vite/client" />

declare module "@authoring-boundary" {
  import type { ReactNode } from "react";
  export function AuthoringBoundary(props: { children: ReactNode }): ReactNode;
}
