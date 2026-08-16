"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Book } from "@/types";
import EditorFrame, { Field, listToText, makeId, RelationPicker, textToList, useAutoDraft, TagPicker } from "./EditorFrame";
import { useArchiveData } from "./ArchiveDataProvider";
import { STATUS_OPTIONS } from "./EntryMeta";
import ArchiveAssetField from "./ArchiveAssetField";

const freshBook = (): Book => ({ id: makeId("book"), title: "未命名书籍", author: "", genres: [], readDate: new Date().toISOString().slice(0, 10), rating: 5, coverTone: "#193b66", monogram: "书", review: "", quotes: [] });

export default function BookEditor({ books, onClose, onCommit }: { books: Book[]; onClose: () => void; onCommit: (items: Book[]) => boolean }) {
  const { films, cps, activeArchive, user } = useArchiveData();
  const router = useRouter();
  const initialIds = useRef(new Set(books.map((item) => item.id)));
  const [draft, setDraft, clearDraft] = useAutoDraft(`randi-editor-draft:${user.id}:${activeArchive.id}:books`, books);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState("");
  const book = draft[selected];
  const patch = (change: Partial<Book>) => setDraft((items) => items.map((item, index) => index === selected ? { ...item, ...change } : item));
  const add = () => { setDraft((items) => [...items, freshBook()]); setSelected(draft.length); };
  const remove = () => { if (!book) return; const next = draft.filter((_, index) => index !== selected); setDraft(next); setSelected(Math.max(0, Math.min(selected, next.length - 1))); };
  const save = () => { if (onCommit(draft)) { clearDraft(); setStatus("已进入安全同步队列"); const created = draft.filter((item) => !initialIds.current.has(item.id)); window.setTimeout(() => { onClose(); if (created.length === 1) router.push(`/book/${created[0].id}`); }, 450); } else setStatus("保存失败：当前身份只读或本机存储不可用"); };

  return <EditorFrame title="书录编辑术" tone="book" onClose={onClose} onSave={save} status={status}>
    <aside className="editor-index"><button type="button" onClick={add}>＋ 新增书籍</button>{draft.map((item, index) => <button type="button" className={index === selected ? "is-active" : ""} key={item.id} onClick={() => setSelected(index)}>{item.title}<small>{item.author || "作者未录"}</small></button>)}</aside>
    {book ? <div className="editor-form">
      <Field label="书名"><input value={book.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
      <Field label="作者"><input value={book.author} onChange={(e) => patch({ author: e.target.value })} /></Field>
      <Field label="阅读日期"><input type="date" value={book.readDate} onChange={(e) => patch({ readDate: e.target.value })} /></Field>
      <Field label="评分"><input type="number" min="0" max="5" step="0.5" value={book.rating} onChange={(e) => patch({ rating: Number(e.target.value) })} /></Field>
      <Field label="状态"><select value={book.status ?? "completed"} onChange={(e) => patch({ status: e.target.value as Book["status"] })}>{STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
      <Field label="进度（当前/总数/单位）"><input value={book.progress ? `${book.progress.current}/${book.progress.total}/${book.progress.unit}` : ""} onChange={(e) => { const [current,total,unit="页"] = e.target.value.split("/"); patch({ progress: current && total ? { current:Number(current),total:Number(total),unit } : undefined }); }} placeholder="120/360/页" /></Field>
      <ArchiveAssetField entryId={book.id} kind="book" ratio="book" value={book.asset} onChange={(asset, coverUrl) => patch({ asset, coverUrl: coverUrl || undefined, coverTone: asset?.themeColor ?? book.coverTone })} />
      <Field label="封面主题色"><input type="color" value={book.coverTone} onChange={(e) => patch({ coverTone: e.target.value })} /></Field>
      <Field label="封面字印"><input value={book.monogram} maxLength={4} onChange={(e) => patch({ monogram: e.target.value })} /></Field>
      <TagPicker value={book.genres} suggestions={Array.from(new Set(books.flatMap((item) => item.genres))).map((name) => ({ name, count: books.filter((item) => item.genres.includes(name)).length }))} onChange={(genres) => patch({ genres })} />
      <Field label="短评" wide><textarea value={book.review} onChange={(e) => patch({ review: e.target.value })} /></Field>
      <Field label="书摘（每行一条）" wide><textarea value={listToText(book.quotes)} onChange={(e) => patch({ quotes: textToList(e.target.value) })} /></Field>
      <Field label="分段笔记（每行一条）" wide><textarea value={listToText(book.notes?.map((item) => item.content))} onChange={(e) => patch({ notes: textToList(e.target.value).map((content,index) => ({ id:book.notes?.[index]?.id ?? makeId("note"),kind:book.notes?.[index]?.kind ?? "thought",content,createdAt:book.notes?.[index]?.createdAt ?? new Date().toISOString() })) })} /></Field>
      <RelationPicker label="关联影视" items={films.map((item) => ({ id: item.id, label: item.title }))} value={book.filmIds} onChange={(filmIds) => patch({ filmIds })} />
      <RelationPicker label="关联 CP" items={cps.map((item) => ({ id: item.id, label: item.name }))} value={book.cpIds} onChange={(cpIds) => patch({ cpIds })} />
      <button className="editor-delete" type="button" onClick={remove}>删除此书籍</button>
    </div> : <div className="editor-empty"><p>书柜暂时空了。</p><button type="button" onClick={add}>录入第一本书</button></div>}
  </EditorFrame>;
}
