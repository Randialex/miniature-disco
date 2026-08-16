"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Film } from "@/types";
import EditorFrame, { Field, listToText, makeId, RelationPicker, textToList, useAutoDraft, TagPicker } from "./EditorFrame";
import { useArchiveData } from "./ArchiveDataProvider";
import { STATUS_OPTIONS } from "./EntryMeta";
import ArchiveAssetField from "./ArchiveAssetField";

const freshFilm = (): Film => ({ id: makeId("film"), title: "未命名影像", year: new Date().getFullYear(), genres: [], watchDate: new Date().toISOString().slice(0, 10), rating: 5, posterTone: "#49396d", monogram: "影", review: "", lines: [] });

export default function FilmEditor({ films, onClose, onCommit }: { films: Film[]; onClose: () => void; onCommit: (items: Film[]) => boolean }) {
  const { books, cps, activeArchive, user } = useArchiveData();
  const router = useRouter();
  const initialIds = useRef(new Set(films.map((item) => item.id)));
  const [draft, setDraft, clearDraft] = useAutoDraft(`randi-editor-draft:${user.id}:${activeArchive.id}:films`, films);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState("");
  const film = draft[selected];
  const patch = (change: Partial<Film>) => setDraft((items) => items.map((item, index) => index === selected ? { ...item, ...change } : item));
  const add = () => { setDraft((items) => [...items, freshFilm()]); setSelected(draft.length); };
  const remove = () => { const next = draft.filter((_, index) => index !== selected); setDraft(next); setSelected(Math.max(0, Math.min(selected, next.length - 1))); };
  const save = () => { if (onCommit(draft)) { clearDraft(); setStatus("已进入安全同步队列"); const created = draft.filter((item) => !initialIds.current.has(item.id)); window.setTimeout(() => { onClose(); if (created.length === 1) router.push(`/film/${created[0].id}`); }, 450); } else setStatus("保存失败：当前身份只读或本机存储不可用"); };

  return <EditorFrame title="影像编辑术" tone="film" onClose={onClose} onSave={save} status={status}>
    <aside className="editor-index"><button type="button" onClick={add}>＋ 新增影像</button>{draft.map((item, index) => <button type="button" className={index === selected ? "is-active" : ""} key={item.id} onClick={() => setSelected(index)}>{item.title}<small>{item.year}</small></button>)}</aside>
    {film ? <div className="editor-form">
      <Field label="片名"><input value={film.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
      <Field label="原名"><input value={film.originalTitle ?? ""} onChange={(e) => patch({ originalTitle: e.target.value })} /></Field>
      <Field label="年份"><input type="number" value={film.year} onChange={(e) => patch({ year: Number(e.target.value) })} /></Field>
      <Field label="观剧日期"><input type="date" value={film.watchDate} onChange={(e) => patch({ watchDate: e.target.value })} /></Field>
      <Field label="评分"><input type="number" min="0" max="5" step="0.5" value={film.rating} onChange={(e) => patch({ rating: Number(e.target.value) })} /></Field>
      <Field label="状态"><select value={film.status ?? "completed"} onChange={(e) => patch({ status: e.target.value as Film["status"] })}>{STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
      <Field label="进度（当前/总数/单位）"><input value={film.progress ? `${film.progress.current}/${film.progress.total}/${film.progress.unit}` : ""} onChange={(e) => { const [current,total,unit="集"] = e.target.value.split("/"); patch({ progress: current && total ? { current:Number(current),total:Number(total),unit } : undefined }); }} placeholder="8/24/集" /></Field>
      <ArchiveAssetField entryId={film.id} kind="film" ratio="poster" value={film.asset} onChange={(asset, posterUrl) => patch({ asset, posterUrl: posterUrl || undefined, posterTone: asset?.themeColor ?? film.posterTone })} />
      <Field label="海报主题色"><input type="color" value={film.posterTone} onChange={(e) => patch({ posterTone: e.target.value })} /></Field>
      <Field label="海报字印"><input value={film.monogram} maxLength={4} onChange={(e) => patch({ monogram: e.target.value })} /></Field>
      <TagPicker value={film.genres} suggestions={Array.from(new Set(films.flatMap((item) => item.genres))).map((name) => ({ name, count: films.filter((item) => item.genres.includes(name)).length }))} onChange={(genres) => patch({ genres })} />
      <Field label="短评" wide><textarea value={film.review} onChange={(e) => patch({ review: e.target.value })} /></Field>
      <Field label="台词（每行一条）" wide><textarea value={listToText(film.lines)} onChange={(e) => patch({ lines: textToList(e.target.value) })} /></Field>
      <Field label="分段笔记（每行一条）" wide><textarea value={listToText(film.notes?.map((item) => item.content))} onChange={(e) => patch({ notes: textToList(e.target.value).map((content,index) => ({ id:film.notes?.[index]?.id ?? makeId("note"),kind:film.notes?.[index]?.kind ?? "scene",content,createdAt:film.notes?.[index]?.createdAt ?? new Date().toISOString() })) })} /></Field>
      <RelationPicker label="关联书籍" items={books.map((item) => ({ id: item.id, label: item.title }))} value={film.bookIds} onChange={(bookIds) => patch({ bookIds })} />
      <RelationPicker label="关联 CP" items={cps.map((item) => ({ id: item.id, label: item.name }))} value={film.cpIds} onChange={(cpIds) => patch({ cpIds })} />
      <button className="editor-delete" type="button" onClick={remove}>删除此影像</button>
    </div> : <div className="editor-empty"><p>银幕暂时空了。</p><button type="button" onClick={add}>录入第一部影像</button></div>}
  </EditorFrame>;
}
