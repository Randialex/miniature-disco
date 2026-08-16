"use client";

import { useRef } from "react";
import { useTheme } from "./ThemeProvider";

const labels = { dark: "星夜哥特", light: "羊皮卷旧书", system: "跟随系统" };
const icons = { dark: "☾", light: "✒", system: "↻" };

export default function ThemeToggle() {
  const { mode, cycleMode } = useTheme();
  const ref = useRef<HTMLButtonElement>(null);
  return <button ref={ref} type="button" className="theme-toggle" title={`当前：${labels[mode]}；点击切换`} aria-label={`主题模式：${labels[mode]}，点击切换`} onClick={() => {
    const rect = ref.current?.getBoundingClientRect();
    cycleMode(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined);
  }}><span aria-hidden="true">{icons[mode]}</span><small>{labels[mode]}</small></button>;
}
