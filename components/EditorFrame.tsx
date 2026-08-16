"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

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
        <header><div><small>ARCANE EDITION · CLOUD QUEUE</small><h2>{title}</h2></div><button type="button" onClick={onClose} aria-label="关闭编辑面板">×</button></header>
        <div className="editor-modal__content">{children}</div>
        <footer><span aria-live="polite">{status ?? "更改会先存入本机队列，再安全同步到云端"}</span><button type="button" className="editor-save" onClick={onSave}>封存更改</button></footer>
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
  const [query, setQuery] = useState("");
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  const visible = useMemo(() => items.filter((item) => item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((left, right) => Number(value.includes(right.id)) - Number(value.includes(left.id))).slice(0, 12), [items, query, value]);
  return <fieldset className="relation-picker"><legend>{label}</legend>{items.length ? <><input className="relation-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、作者或人物" /><div>{visible.map((item) => <label key={item.id}><input type="checkbox" checked={value.includes(item.id)} onChange={() => toggle(item.id)} /><span>{item.label}</span>{value.includes(item.id) ? <small>已关联</small> : null}</label>)}</div>{!visible.length ? <p>没有找到匹配档案</p> : null}</> : <p>暂无可关联档案</p>}</fieldset>;
}

export function TagPicker({ value, suggestions, onChange }: { value: string[]; suggestions: Array<{ name: string; count: number }>; onChange: (tags: string[]) => void }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim();
  const visible = suggestions.filter((item) => !value.includes(item.name) && item.name.toLocaleLowerCase().includes(normalized.toLocaleLowerCase())).slice(0, 8);
  const add = (name: string) => { const clean = name.trim(); if (clean && !value.includes(clean)) onChange([...value, clean]); setQuery(""); };
  return <fieldset className="tag-picker"><legend>档案标签</legend><div className="tag-picker__selected">{value.map((tag, index) => <button type="button" key={tag} style={{ "--tag-hue": `${(index * 67 + tag.length * 19) % 360}` } as React.CSSProperties} onClick={() => onChange(value.filter((item) => item !== tag))}>{tag}<span>×</span></button>)}</div><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(query); } }} placeholder="搜索已有标签，回车创建" />{normalized ? <div className="tag-picker__suggestions">{visible.map((item) => <button type="button" key={item.name} onClick={() => add(item.name)}>{item.name}<small>使用 {item.count} 次</small></button>)}{!suggestions.some((item) => item.name === normalized) ? <button type="button" onClick={() => add(normalized)}>＋ 创建“{normalized}”</button> : null}</div> : null}</fieldset>;
}

export function useAutoDraft<T>(key: string, initial: T) {
  const [draft, setDraft] = useState<T>(() => {
    if (typeof window === "undefined") return structuredClone(initial);
    try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : structuredClone(initial); } catch { return structuredClone(initial); }
  });
  useEffect(() => {
    const timer = window.setTimeout(() => window.localStorage.setItem(key, JSON.stringify(draft)), 650);
    return () => window.clearTimeout(timer);
  }, [draft, key]);
  const clearDraft = () => window.localStorage.removeItem(key);
  return [draft, setDraft, clearDraft] as const;
}

export const listToText = (items?: string[]) => items?.join("\n") ?? "";
export const textToList = (value: string) => value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
export const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;
