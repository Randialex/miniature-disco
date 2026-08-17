"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useArchiveData } from "./ArchiveDataProvider";
import { SEARCH_HISTORY_KEY } from "@/utils/constants";

interface Result { id: string; kind: "book" | "film" | "cp" | "note"; title: string; subtitle: string; href: string }
const labels = { book: "书录", film: "影像", cp: "羁绊", note: "笔记" };

function highlight(value: string, query: string) {
  const needle = query.trim();
  const index = value.toLocaleLowerCase("zh-CN").indexOf(needle.toLocaleLowerCase("zh-CN"));
  if (!needle || index < 0) return value;
  return <>{value.slice(0, index)}<mark>{value.slice(index, index + needle.length)}</mark>{value.slice(index + needle.length)}</>;
}

export default function GlobalSearch() {
  const { books, films, cps } = useArchiveData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setHistory(JSON.parse(window.localStorage.getItem(SEARCH_HISTORY_KEY) || "[]") as string[]); } catch { setHistory([]); }
    const show = () => setOpen(true);
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen((value) => !value); }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("open-randi-search", show); window.addEventListener("keydown", shortcut);
    return () => { window.removeEventListener("open-randi-search", show); window.removeEventListener("keydown", shortcut); };
  }, []);
  useEffect(() => { if (open) window.setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const results = useMemo<Result[]>(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return [];
    const includes = (...values: Array<string | undefined>) => values.join(" ").toLocaleLowerCase().includes(needle);
    return [
      ...books.filter((item) => includes(item.title,item.author,item.review,item.genres.join(" "),item.quotes.join(" "),item.notes?.map((note) => note.content).join(" "))).map((item) => ({ id:item.id,kind:"book" as const,title:item.title,subtitle:item.author,href:`/book/${item.id}` })),
      ...films.filter((item) => includes(item.title,item.originalTitle,item.review,item.genres.join(" "),item.lines.join(" "),item.notes?.map((note) => note.content).join(" "))).map((item) => ({ id:item.id,kind:"film" as const,title:item.title,subtitle:item.originalTitle ?? String(item.year),href:`/film/${item.id}` })),
      ...cps.filter((item) => includes(item.name,item.origin,item.summary,item.scenes.map((scene) => `${scene.title} ${scene.note}`).join(" "),item.notes?.map((note) => note.content).join(" "))).map((item) => ({ id:item.id,kind:"cp" as const,title:item.name,subtitle:item.origin,href:`/cp/${item.id}` })),
      ...books.flatMap((item) => (item.notes ?? []).filter((note) => includes(note.content,note.reference)).map((note) => ({ id:note.id,kind:"note" as const,title:note.content,subtitle:`《${item.title}》的笔记`,href:`/book/${item.id}` }))),
      ...films.flatMap((item) => (item.notes ?? []).filter((note) => includes(note.content,note.reference)).map((note) => ({ id:note.id,kind:"note" as const,title:note.content,subtitle:`《${item.title}》的笔记`,href:`/film/${item.id}` }))),
      ...cps.flatMap((item) => (item.notes ?? []).filter((note) => includes(note.content,note.reference)).map((note) => ({ id:note.id,kind:"note" as const,title:note.content,subtitle:`${item.name} 的笔记`,href:`/cp/${item.id}` }))),
    ].slice(0,30);
  }, [books, films, cps, query]);

  function remember() {
    const value = query.trim(); if (!value) return;
    const next = [value, ...history.filter((item) => item !== value)].slice(0,8);
    setHistory(next); window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  }
  if (!open) return null;
  return <div className="search-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><section className="search-scroll" role="dialog" aria-modal="true" aria-label="全局魔法搜索"><button className="search-close" type="button" onClick={() => setOpen(false)} aria-label="关闭搜索">×</button><header><small>OMNIA REVELIO · CTRL K</small><h2>全局魔法搜索</h2></header><div className="search-input-wrap"><span>⌕</span><input ref={inputRef} className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && remember()} placeholder="搜索标题、作者、标签、笔记或短评……" /></div>{!query && history.length ? <div className="search-history"><span>最近咒语</span>{history.map((item) => <button key={item} type="button" onClick={() => setQuery(item)}>{item}</button>)}<button type="button" onClick={() => { setHistory([]); localStorage.removeItem(SEARCH_HISTORY_KEY); }}>清除</button></div> : null}<div className="search-results">{query && !results.length ? <p>没有显影的档案，试试其他词语。</p> : results.map((item) => <Link href={item.href} key={`${item.kind}-${item.id}`} onClick={() => { remember(); setOpen(false); }}><span className={`search-kind search-kind--${item.kind}`}>{labels[item.kind]}</span><div><strong>{highlight(item.title, query)}</strong><small>{highlight(item.subtitle, query)}</small></div><i>→</i></Link>)}</div></section></div>;
}
