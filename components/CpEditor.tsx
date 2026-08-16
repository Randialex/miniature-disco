"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Cp } from "@/types";
import EditorFrame, { EditorSection, Field, makeId, RelationPicker, listToText, textToList, useAutoDraft } from "./EditorFrame";
import { useArchiveData } from "./ArchiveDataProvider";
import { STATUS_OPTIONS } from "./EntryMeta";

const freshCp = (): Cp => ({ id: makeId("cp"), name: "未命名羁绊", origin: "", startDate: new Date().toISOString().slice(0, 10), rating: 5, tone: "#285d4a", monogram: "契", summary: "", scenes: [] });
const scenesToText = (cp: Cp) => cp.scenes.map((scene) => `${scene.title}|${scene.note}|${scene.motif}`).join("\n");
const textToScenes = (value: string) => value.split("\n").filter(Boolean).map((line) => { const [title = "名场面", note = "", motif = "✦"] = line.split("|"); return { title: title.trim(), note: note.trim(), motif: motif.trim() || "✦" }; });

export default function CpEditor({ cps, onClose, onCommit }: { cps: Cp[]; onClose: () => void; onCommit: (items: Cp[]) => boolean }) {
  const { books, films, activeArchive, user } = useArchiveData();
  const router = useRouter();
  const initialIds = useRef(new Set(cps.map((item) => item.id)));
  const [draft, setDraft, clearDraft] = useAutoDraft(`randi-editor-draft:${user.id}:${activeArchive.id}:cps`, cps);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState("");
  const cp = draft[selected];
  const patch = (change: Partial<Cp>) => setDraft((items) => items.map((item, index) => index === selected ? { ...item, ...change } : item));
  const add = () => { setDraft((items) => [...items, freshCp()]); setSelected(draft.length); };
  const remove = () => { const next = draft.filter((_, index) => index !== selected); setDraft(next); setSelected(Math.max(0, Math.min(selected, next.length - 1))); };
  const save = () => { if (onCommit(draft)) { clearDraft(); setStatus("已进入安全同步队列"); const created = draft.filter((item) => !initialIds.current.has(item.id)); window.setTimeout(() => { onClose(); if (created.length === 1) router.push(`/cp/${created[0].id}`); }, 450); } else setStatus("保存失败：当前身份只读或本机存储不可用"); };

  return <EditorFrame title="羁绊编辑术" tone="cp" onClose={onClose} onSave={save} status={status}>
    <aside className="editor-index"><button type="button" onClick={add}>＋ 新增 CP</button>{draft.map((item, index) => <button type="button" className={index === selected ? "is-active" : ""} key={item.id} onClick={() => setSelected(index)}>{item.name}<small>{item.origin || "出处未录"}</small></button>)}</aside>
    {cp ? <div className="editor-form">
      <EditorSection title="基本资料" description="羁绊身份、日期与追更状态">
        <Field label="CP 名" span={6}><input value={cp.name} onChange={(e) => patch({ name: e.target.value })} /></Field>
        <Field label="出处" span={6}><input value={cp.origin} onChange={(e) => patch({ origin: e.target.value })} /></Field>
        <Field label="入坑日期" span={4}><input type="date" value={cp.startDate} onChange={(e) => patch({ startDate: e.target.value })} /></Field>
        <Field label="评分" span={4}><input type="number" min="0" max="5" step="0.5" value={cp.rating} onChange={(e) => patch({ rating: Number(e.target.value) })} /></Field>
        <Field label="状态" span={4}><select value={cp.status ?? "active"} onChange={(e) => patch({ status: e.target.value as Cp["status"] })}>{STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="追更进度" span={6} hint="格式：当前 / 总数 / 单位，例如 35 / 100 / 章"><input value={cp.progress ? `${cp.progress.current}/${cp.progress.total}/${cp.progress.unit}` : ""} onChange={(e) => { const [current,total,unit="章"] = e.target.value.split("/"); patch({ progress: current && total ? { current:Number(current),total:Number(total),unit } : undefined }); }} placeholder="35/100/章" /></Field>
      </EditorSection>
      <EditorSection title="封面与视觉" description="以主题色和字印区分不同羁绊">
        <Field label="主题色" span={6}><input type="color" value={cp.tone} onChange={(e) => patch({ tone: e.target.value })} /></Field>
        <Field label="羁绊字印" span={6}><input value={cp.monogram} maxLength={4} onChange={(e) => patch({ monogram: e.target.value })} /></Field>
      </EditorSection>
      <EditorSection title="简介、名场面与笔记" description="长内容固定占满一行，便于阅读和换行">
        <Field label="羁绊简述" wide><textarea value={cp.summary} onChange={(e) => patch({ summary: e.target.value })} /></Field>
        <Field label="名场面" wide hint="格式：标题 | 描述 | 符号，每行一条"><textarea value={scenesToText(cp)} onChange={(e) => patch({ scenes: textToScenes(e.target.value) })} /></Field>
        <Field label="分段笔记" wide hint="每行记录一条笔记"><textarea value={listToText(cp.notes?.map((item) => item.content))} onChange={(e) => patch({ notes: textToList(e.target.value).map((content,index) => ({ id:cp.notes?.[index]?.id ?? makeId("note"),kind:cp.notes?.[index]?.kind ?? "thought",content,createdAt:cp.notes?.[index]?.createdAt ?? new Date().toISOString() })) })} /></Field>
      </EditorSection>
      <EditorSection title="关联档案" description="长标题会省略显示，悬停可查看完整名称">
        <RelationPicker label="关联书籍" items={books.map((item) => ({ id: item.id, label: item.title }))} value={cp.bookIds} onChange={(bookIds) => patch({ bookIds })} />
        <RelationPicker label="关联影视" items={films.map((item) => ({ id: item.id, label: item.title }))} value={cp.filmIds} onChange={(filmIds) => patch({ filmIds })} />
      </EditorSection>
      <EditorSection title="危险操作" description="删除后将在同步时进入回收与版本记录" tone="danger">
        <button className="editor-delete" type="button" onClick={remove}>删除此羁绊</button>
      </EditorSection>
    </div> : <div className="editor-empty"><p>契约簿暂时空了。</p><button type="button" onClick={add}>记录第一组羁绊</button></div>}
  </EditorFrame>;
}
