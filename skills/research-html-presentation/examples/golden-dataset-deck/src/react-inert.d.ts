import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    /** Native inert is supported by Chromium; React 18's type package omits it. */
    inert?: boolean;
  }
}
