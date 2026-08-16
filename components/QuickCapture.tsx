"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ArchiveStatus, Book, Cp, Film } from "@/types";
import { useArchiveData } from "./ArchiveDataProvider";

type CaptureType = "book" | "film" | "quote" | "idea" | "scene";
type Draft = { type: CaptureType; title: string; status: ArchiveStatus; note: string; relation: string };

const choices: Array<{ id: CaptureType; icon: string; label: string; hint: string }> = [
  { id: "book", icon: "书", label: "书籍", hint: "标题与状态" },
  { id: "film", icon: "影", label: "电影 / 剧集", hint: "片名与进度" },
  { id: "quote", icon: "“", label: "摘录 / 台词", hint: "一句话也能封存" },
  { id: "idea", icon: "✦", label: "灵感", hint: "抓住刚刚闪过的念头" },
  { id: "scene", icon: "契", label: "CP 名场面", hint: "记下关系的高光时刻" },
];

const emptyDraft = (): Draft => ({ type: "book", title: "", status: "planned", note: "", relation: "" });
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export default function QuickCapture() {
  const { books, films, cps, canEdit, activeArchive, user, saveBooks, saveFilms, saveCps } = useArchiveData();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saved, setSaved] = useState<{ href: string; title: string } | null>(null);
  const draftKey = `randi-quick-draft:${user.id}:${activeArchive.id}`;

  const relations = useMemo(() => [
    ...books.map((item) => ({ id: `book:${item.id}`, label: `书 · ${item.title}` })),
    ...films.map((item) => ({ id: `film:${item.id}`, label: `影 · ${item.title}` })),
    ...cps.map((item) => ({ id: `cp:${item.id}`, label: `CP · ${item.name}` })),
  ], [books, films, cps]);

  useEffect(() => {
    const show = () => { if (canEdit) { setOpen(true); setSaved(null); } };
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault(); show();
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("open-quick-capture", show);
    window.addEventListener("keydown", shortcut);
    return () => { window.removeEventListener("open-quick-capture", show); window.removeEventListener("keydown", shortcut); };
  }, [canEdit]);

  useEffect(() => {
    if (!open) return;
    try {
      const stored = window.localStorage.getItem(draftKey);
      if (stored) { setDraft(JSON.parse(stored) as Draft); setStep(2); }
    } catch { /* damaged device draft is ignored */ }
  }, [draftKey, open]);

  useEffect(() => {
    if (!open || saved) return;
    window.localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draft, draftKey, open, saved]);

  function choose(type: CaptureType) {
    setDraft((value) => ({ ...value, type, status: type === "book" || type === "film" ? "planned" : "active" }));
    setStep(2);
    window.setTimeout(() => document.getElementById("quick-title")?.focus(), 60);
  }

  function save() {
    const title = draft.title.trim() || (draft.type === "idea" ? draft.note.trim().slice(0, 32) : "未命名档案");
    const today = new Date().toISOString().slice(0, 10);
    let href = "/home";
    if (draft.type === "book") {
      const id = makeId("book");
      const item: Book = { id, title, author: "", genres: [], readDate: today, rating: 0, coverTone: "#193b66", monogram: title.slice(0, 1), review: draft.note, quotes: [], status: draft.status, pendingCompletion: true };
      saveBooks([...books, item]); href = `/book/${id}`;
    } else if (draft.type === "film") {
      const id = makeId("film");
      const item: Film = { id, title, year: new Date().getFullYear(), genres: [], watchDate: today, rating: 0, posterTone: "#49396d", monogram: title.slice(0, 1), review: draft.note, lines: [], status: draft.status, pendingCompletion: true };
      saveFilms([...films, item]); href = `/film/${id}`;
    } else {
      const [kind, id] = draft.relation.split(":");
      const content = draft.note.trim() || title;
      if (kind === "book") {
        saveBooks(books.map((item) => item.id === id ? { ...item, quotes: draft.type === "quote" ? [...item.quotes, content] : item.quotes, notes: draft.type !== "quote" ? [...(item.notes ?? []), { id: makeId("note"), kind: "thought", content, createdAt: new Date().toISOString() }] : item.notes } : item));
        href = `/book/${id}`;
      } else if (kind === "film") {
        saveFilms(films.map((item) => item.id === id ? { ...item, lines: draft.type === "quote" ? [...item.lines, content] : item.lines, notes: draft.type !== "quote" ? [...(item.notes ?? []), { id: makeId("note"), kind: draft.type === "scene" ? "scene" : "thought", content, createdAt: new Date().toISOString() }] : item.notes } : item));
        href = `/film/${id}`;
      } else if (kind === "cp") {
        saveCps(cps.map((item) => item.id === id ? { ...item, scenes: draft.type === "scene" ? [...item.scenes, { title, note: content, motif: "✦" }] : item.scenes, notes: draft.type !== "scene" ? [...(item.notes ?? []), { id: makeId("note"), kind: "thought", content, createdAt: new Date().toISOString() }] : item.notes } : item));
        href = `/cp/${id}`;
      } else {
        const id = makeId("book");
        const item: Book = { id, title: draft.type === "idea" ? `灵感 · ${title}` : `摘录 · ${title}`, author: "私人札记", genres: [draft.type === "idea" ? "灵感" : "摘录"], readDate: today, rating: 0, coverTone: "#6b4d74", monogram: "✦", review: draft.type === "idea" ? content : "", quotes: draft.type === "quote" ? [content] : [], status: "active", pendingCompletion: true };
        saveBooks([...books, item]); href = `/book/${id}`;
      }
    }
    window.localStorage.removeItem(draftKey);
    setSaved({ href, title });
    setDraft(emptyDraft());
  }

  if (!canEdit) return null;
  return <>
    <button className="quick-capture-button" type="button" onClick={() => { setOpen(true); setSaved(null); }} aria-label="快速记录（Ctrl 或 Command + Shift + A）"><span>✒</span><small>快速记录</small></button>
    {open ? <div className="quick-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="quick-drawer" role="dialog" aria-modal="true" aria-label="全局快速记录">
        <header><div><small>QUICK PRESERVATION · 10 SECONDS</small><h2>{saved ? "已经封存" : step === 1 ? "此刻想记下什么？" : choices.find((item) => item.id === draft.type)?.label}</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="关闭">×</button></header>
        {saved ? <div className="quick-saved"><span>✓</span><p><strong>{saved.title}</strong> 已进入安全同步队列。</p><div><button type="button" onClick={() => setOpen(false)}>留在当前页面</button><Link href={saved.href} onClick={() => setOpen(false)}>前往详情页　→</Link></div></div> : step === 1 ? <div className="quick-type-grid">{choices.map((item) => <button key={item.id} type="button" onClick={() => choose(item.id)}><span>{item.icon}</span><b>{item.label}</b><small>{item.hint}</small></button>)}</div> : <div className="quick-form">
          <button className="quick-back" type="button" onClick={() => setStep(1)}>← 更换类型</button>
          <label><span>{draft.type === "quote" ? "摘录标题（可选）" : draft.type === "scene" ? "场面标题" : "标题"}</span><input id="quick-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={draft.type === "idea" ? "一个还没成形的念头" : "仅填标题也能保存"} /></label>
          {(draft.type === "book" || draft.type === "film") ? <label><span>当前状态</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ArchiveStatus })}><option value="planned">想读 / 想看</option><option value="active">正在进行</option><option value="completed">已完成</option><option value="paused">暂时搁置</option></select></label> : <label><span>关联作品（可选）</span><select value={draft.relation} onChange={(event) => setDraft({ ...draft, relation: event.target.value })}><option value="">暂不关联</option>{relations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
          <label className="quick-form__wide"><span>{draft.type === "quote" ? "摘录 / 台词" : "一句话"}（可选）</span><textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
          <footer><small>输入即保存本机草稿 · 离线时自动排队</small><button type="button" onClick={save} disabled={!draft.title.trim() && !draft.note.trim()}>立即封存</button></footer>
        </div>}
      </section>
    </div> : null}
  </>;
}
