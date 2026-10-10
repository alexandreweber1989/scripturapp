import { type ReactNode, ViewTransition } from "react";

const BY_TYPE = {
  "tab-next": "tab-next",
  "tab-prev": "tab-prev",
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  // Untyped transitions (browser back, refreshes, Suspense reveals) swap instantly.
  default: "none",
};

/** Wraps a page's content so it slides in and out according to how the user navigated. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={BY_TYPE} exit={BY_TYPE} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
