import { useEffect, useSyncExternalStore } from "react";
import { useTheme } from "@heroui/react";

// Theme controller (T1): drives the class-based dark mode. HeroUI's
// useTheme stores the choice in localStorage ("heroui-theme"), follows
// the OS preference when set to "system", and writes the resolved
// theme as a class + data-theme attribute on <html> inside a layout
// effect, so there is no flash.
//
// T2 coordination: useTheme's initial state reads localStorage first
// (stored value ?? defaultTheme), so a manual choice made through the
// top-bar switcher is NOT overridden on mount or refresh — the
// "system" argument is only the fallback when nothing is stored.
// But every useTheme() call owns independent state: a second instance
// in the top bar would not see setTheme calls from this one (and its
// stale "system" state would re-apply over a manual pick when the OS
// preference flips). So this controller stays the ONLY useTheme
// instance and publishes { theme, setTheme } to a module-level store;
// the shell reads it through useShellTheme(). setTheme from useTheme
// is a stable useCallback, and theme only changes on an explicit pick,
// so republishing from an effect keeps every reader in sync.
export type ShellTheme = {
  /** The stored intent: "system" | "light" | "dark". */
  theme: string;
  setTheme: (next: string) => void;
};

let snapshot: ShellTheme = {
  theme:
    typeof window !== "undefined"
      ? (window.localStorage.getItem("heroui-theme") ?? "system")
      : "system",
  setTheme: () => {},
};
const listeners = new Set<() => void>();

function publish(next: ShellTheme) {
  if (next.theme === snapshot.theme && next.setTheme === snapshot.setTheme) return;
  snapshot = next;
  listeners.forEach((l) => l());
}

export function ThemeController() {
  const { theme, setTheme } = useTheme("system");
  useEffect(() => {
    publish({ theme, setTheme });
  }, [theme, setTheme]);
  return null;
}

/** Shell-side view of the single ThemeController useTheme instance. */
export function useShellTheme(): ShellTheme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => snapshot,
    () => snapshot,
  );
}
