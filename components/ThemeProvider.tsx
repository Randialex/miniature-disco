"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SITE_MOTION_KEY, SITE_THEME_KEY } from "@/utils/constants";

export type ThemeMode = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  complexMotion: boolean;
  setMode: (mode: ThemeMode, origin?: { x: number; y: number }) => void;
  cycleMode: (origin?: { x: number; y: number }) => void;
  setComplexMotion: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const modes: ThemeMode[] = ["dark", "light", "system"];

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "dark" || value === "light" || value === "system";
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [complexMotion, setComplexMotionState] = useState(true);

  const applyResolvedTheme = useCallback((theme: ResolvedTheme, origin?: { x: number; y: number }) => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const apply = () => {
      root.dataset.theme = theme;
      setResolvedTheme(theme);
    };
    if (reduced || !complexMotion || !origin) {
      apply();
      return;
    }
    root.style.setProperty("--ripple-x", `${origin.x}px`);
    root.style.setProperty("--ripple-y", `${origin.y}px`);
    root.classList.remove("theme-rippling");
    void root.offsetWidth;
    root.classList.add("theme-rippling");
    window.setTimeout(apply, 260);
    window.setTimeout(() => root.classList.remove("theme-rippling"), 650);
  }, [complexMotion]);

  useEffect(() => {
    const stored = window.localStorage.getItem(SITE_THEME_KEY);
    const initialMode = isThemeMode(stored) ? stored : "system";
    const motion = window.localStorage.getItem(SITE_MOTION_KEY) !== "false";
    setModeState(initialMode);
    setComplexMotionState(motion);
    document.documentElement.dataset.motion = motion ? "full" : "reduced";
    const theme = initialMode === "system" ? systemTheme() : initialMode;
    document.documentElement.dataset.theme = theme;
    setResolvedTheme(theme);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (mode === "system") applyResolvedTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [applyResolvedTheme, mode]);

  const setMode = useCallback((nextMode: ThemeMode, origin?: { x: number; y: number }) => {
    setModeState(nextMode);
    window.localStorage.setItem(SITE_THEME_KEY, nextMode);
    applyResolvedTheme(nextMode === "system" ? systemTheme() : nextMode, origin);
  }, [applyResolvedTheme]);

  const cycleMode = useCallback((origin?: { x: number; y: number }) => {
    const index = modes.indexOf(mode);
    setMode(modes[(index + 1) % modes.length], origin);
  }, [mode, setMode]);

  const setComplexMotion = useCallback((enabled: boolean) => {
    setComplexMotionState(enabled);
    window.localStorage.setItem(SITE_MOTION_KEY, String(enabled));
    document.documentElement.dataset.motion = enabled ? "full" : "reduced";
  }, []);

  const value = useMemo(() => ({ mode, resolvedTheme, complexMotion, setMode, cycleMode, setComplexMotion }), [mode, resolvedTheme, complexMotion, setMode, cycleMode, setComplexMotion]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme 必须在 ThemeProvider 内使用");
  return context;
}
