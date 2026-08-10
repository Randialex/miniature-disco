"use client";

import { useState } from "react";
import type { Film } from "@/types";
import EditorFrame, { Field, listToText, makeId, RelationPicker, textToList } from "./EditorFrame";
import { useArchiveData } from "./ArchiveDataProvider";

const freshFilm = (): Film => ({ id: makeId("film"), title: "未命名影像", year: new Date().getFullYear(), genres: [], watchDate: new Date().toISOString().slice(0, 10), rating: 5, posterTone: "#49396d", monogram: "影", review: "", lines: [] });

export default function FilmEditor({ films, onClose, onCommit }: { films: Film[]; onClose: () => void; onCommit: (items: Film[]) => boolean }) {
  const { books, cps } = useArchiveData();
  const [draft, setDraft] = useState(() => structuredClone(films));
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState("");
  const film = draft[selected];
  const patch = (change: Partial<Film>) => setDraft((items) => items.map((item, index) => index === selected ? { ...item, ...change } : item));
  const add = () => { setDraft((items) => [...items, freshFilm()]); setSelected(draft.length); };
  const remove = () => { const next = draft.filter((_, index) => index !== selected); setDraft(next); setSelected(Math.max(0, Math.min(selected, next.length - 1))); };
  const save = () => { if (onCommit(draft)) { setStatus("已写入本地魔法档案"); window.setTimeout(onClose, 450); } else setStatus("保存失败：浏览器存储不可用"); };

  return <EditorFrame title="影像编辑术" tone="film" onClose={onClose} onSave={save} status={status}>
    <aside className="editor-index"><button type="button" onClick={add}>＋ 新增影像</button>{draft.map((item, index) => <button type="button" className={index === selected ? "is-active" : ""} key={item.id} onClick={() => setSelected(index)}>{item.title}<small>{item.year}</small></button>)}</aside>
    {film ? <div className="editor-form">
      <Field label="片名"><input value={film.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
      <Field label="原名"><input value={film.originalTitle ?? ""} onChange={(e) => patch({ originalTitle: e.target.value })} /></Field>
      <Field label="年份"><input type="number" value={film.year} onChange={(e) => patch({ year: Number(e.target.value) })} /></Field>
      <Field label="观剧日期"><input type="date" value={film.watchDate} onChange={(e) => patch({ watchDate: e.target.value })} /></Field>
      <Field label="评分"><input type="number" min="0" max="5" step="0.5" value={film.rating} onChange={(e) => patch({ rating: Number(e.target.value) })} /></Field>
      <Field label="海报图片网址"><input type="url" value={film.posterUrl ?? ""} onChange={(e) => patch({ posterUrl: e.target.value })} placeholder="可留空，使用主题海报" /></Field>
      <Field label="海报主题色"><input type="color" value={film.posterTone} onChange={(e) => patch({ posterTone: e.target.value })} /></Field>
      <Field label="海报字印"><input value={film.monogram} maxLength={4} onChange={(e) => patch({ monogram: e.target.value })} /></Field>
      <Field label="类型（逗号分隔）"><input value={film.genres.join("，")} onChange={(e) => patch({ genres: textToList(e.target.value) })} /></Field>
      <Field label="短评" wide><textarea value={film.review} onChange={(e) => patch({ review: e.target.value })} /></Field>
      <Field label="台词（每行一条）" wide><textarea value={listToText(film.lines)} onChange={(e) => patch({ lines: textToList(e.target.value) })} /></Field>
      <RelationPicker label="关联书籍" items={books.map((item) => ({ id: item.id, label: item.title }))} value={film.bookIds} onChange={(bookIds) => patch({ bookIds })} />
      <RelationPicker label="关联 CP" items={cps.map((item) => ({ id: item.id, label: item.name }))} value={film.cpIds} onChange={(cpIds) => patch({ cpIds })} />
      <button className="editor-delete" type="button" onClick={remove}>删除此影像</button>
    </div> : <div className="editor-empty"><p>银幕暂时空了。</p><button type="button" onClick={add}>录入第一部影像</button></div>}
  </EditorFrame>;
}
