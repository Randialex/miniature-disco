"use client";

import { useState } from "react";
import type { Cp } from "@/types";
import EditorFrame, { Field, makeId, textToList } from "./EditorFrame";

const freshCp = (): Cp => ({ id: makeId("cp"), name: "未命名羁绊", origin: "", startDate: new Date().toISOString().slice(0, 10), rating: 5, tone: "#285d4a", monogram: "契", summary: "", scenes: [] });
const scenesToText = (cp: Cp) => cp.scenes.map((scene) => `${scene.title}|${scene.note}|${scene.motif}`).join("\n");
const textToScenes = (value: string) => value.split("\n").filter(Boolean).map((line) => { const [title = "名场面", note = "", motif = "✦"] = line.split("|"); return { title: title.trim(), note: note.trim(), motif: motif.trim() || "✦" }; });

export default function CpEditor({ cps, onClose, onCommit }: { cps: Cp[]; onClose: () => void; onCommit: (items: Cp[]) => boolean }) {
  const [draft, setDraft] = useState(() => structuredClone(cps));
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState("");
  const cp = draft[selected];
  const patch = (change: Partial<Cp>) => setDraft((items) => items.map((item, index) => index === selected ? { ...item, ...change } : item));
  const add = () => { setDraft((items) => [...items, freshCp()]); setSelected(draft.length); };
  const remove = () => { const next = draft.filter((_, index) => index !== selected); setDraft(next); setSelected(Math.max(0, Math.min(selected, next.length - 1))); };
  const save = () => { if (onCommit(draft)) { setStatus("已写入本地魔法档案"); window.setTimeout(onClose, 450); } else setStatus("保存失败：浏览器存储不可用"); };

  return <EditorFrame title="羁绊编辑术" tone="cp" onClose={onClose} onSave={save} status={status}>
    <aside className="editor-index"><button type="button" onClick={add}>＋ 新增 CP</button>{draft.map((item, index) => <button type="button" className={index === selected ? "is-active" : ""} key={item.id} onClick={() => setSelected(index)}>{item.name}<small>{item.origin || "出处未录"}</small></button>)}</aside>
    {cp ? <div className="editor-form">
      <Field label="CP 名"><input value={cp.name} onChange={(e) => patch({ name: e.target.value })} /></Field>
      <Field label="出处"><input value={cp.origin} onChange={(e) => patch({ origin: e.target.value })} /></Field>
      <Field label="入坑日期"><input type="date" value={cp.startDate} onChange={(e) => patch({ startDate: e.target.value })} /></Field>
      <Field label="评分"><input type="number" min="0" max="5" step="0.5" value={cp.rating} onChange={(e) => patch({ rating: Number(e.target.value) })} /></Field>
      <Field label="主题色"><input type="color" value={cp.tone} onChange={(e) => patch({ tone: e.target.value })} /></Field>
      <Field label="羁绊字印"><input value={cp.monogram} maxLength={4} onChange={(e) => patch({ monogram: e.target.value })} /></Field>
      <Field label="羁绊简述" wide><textarea value={cp.summary} onChange={(e) => patch({ summary: e.target.value })} /></Field>
      <Field label="名场面（标题|描述|符号，每行一条）" wide><textarea value={scenesToText(cp)} onChange={(e) => patch({ scenes: textToScenes(e.target.value) })} /></Field>
      <Field label="关联书籍 ID"><input value={cp.bookIds?.join("，") ?? ""} onChange={(e) => patch({ bookIds: textToList(e.target.value) })} /></Field>
      <Field label="关联影视 ID"><input value={cp.filmIds?.join("，") ?? ""} onChange={(e) => patch({ filmIds: textToList(e.target.value) })} /></Field>
      <button className="editor-delete" type="button" onClick={remove}>删除此羁绊</button>
    </div> : <div className="editor-empty"><p>契约簿暂时空了。</p><button type="button" onClick={add}>记录第一组羁绊</button></div>}
  </EditorFrame>;
}
