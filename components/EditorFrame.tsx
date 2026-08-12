"use client";

import { useEffect, type ReactNode } from "react";

export default function EditorFrame({ title, tone, onClose, onSave, children, status }: {
  title: string;
  tone: "book" | "film" | "cp";
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
  status?: string;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <div className="editor-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`editor-modal editor-modal--${tone}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><div><small>ARCANE EDITION · LOCAL ONLY</small><h2>{title}</h2></div><button type="button" onClick={onClose} aria-label="关闭编辑面板">×</button></header>
        <div className="editor-modal__content">{children}</div>
        <footer><span aria-live="polite">{status ?? "更改仅保存在这台设备"}</span><button type="button" className="editor-save" onClick={onSave}>封存更改</button></footer>
      </section>
    </div>
  );
}

export function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={wide ? "editor-field editor-field--wide" : "editor-field"}><span>{label}</span>{children}</label>;
}

export function RelationPicker({ label, items, value = [], onChange }: {
  label: string;
  items: Array<{ id: string; label: string }>;
  value?: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  return <fieldset className="relation-picker"><legend>{label}</legend>{items.length ? <div>{items.map((item) => <label key={item.id}><input type="checkbox" checked={value.includes(item.id)} onChange={() => toggle(item.id)} /><span>{item.label}</span></label>)}</div> : <p>暂无可关联档案</p>}</fieldset>;
}

export const listToText = (items?: string[]) => items?.join("\n") ?? "";
export const textToList = (value: string) => value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
export const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;
