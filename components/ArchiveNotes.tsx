"use client";

import { useState } from "react";
import type { ArchiveNote, NoteKind } from "@/types";
import { makeId } from "./EditorFrame";
import { useArchiveData } from "./ArchiveDataProvider";

const kindLabels: Record<NoteKind, string> = { quote: "金句台词", thought: "个人感想", scene: "名场面记录" };

export default function ArchiveNotes({ notes = [], onChange }: { notes?: ArchiveNote[]; onChange: (notes: ArchiveNote[]) => boolean }) {
  const { canEdit } = useArchiveData();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ArchiveNote[]>(() => structuredClone(notes));
  const [message, setMessage] = useState("");
  const sorted = [...(editing ? draft : notes)].sort((a,b) => Number(Boolean(b.pinned))-Number(Boolean(a.pinned)) || b.createdAt.localeCompare(a.createdAt));
  const patch = (id:string,change:Partial<ArchiveNote>) => setDraft((items) => items.map((item) => item.id === id ? {...item,...change}:item));
  const add = () => setDraft((items) => [{ id:makeId("note"),kind:"thought",content:"",reference:"",createdAt:new Date().toISOString() },...items]);
  const save = () => { if(onChange(draft)){setEditing(false);setMessage("笔记已进入安全同步队列");window.setTimeout(()=>setMessage(""),1800);}else setMessage("保存失败：当前身份只读或本机存储不可用"); };
  const begin = () => { setDraft(structuredClone(notes)); setEditing(true); };

  return <section className="archive-notes"><div className="module-title"><small>MARGINALIA · CLOUD NOTES</small><h2>分段笔记</h2></div><div className="notes-toolbar"><p>金句、感想与名场面随档案加密同步。</p>{editing ? <><button type="button" onClick={add}>＋ 新增笔记</button><button type="button" onClick={save}>封存更改</button><button type="button" onClick={() => setEditing(false)}>取消</button></> : canEdit ? <button type="button" onClick={begin}>管理笔记</button> : <small>只读访问</small>}</div>{message ? <p className="notes-message" role="status">{message}</p> : null}<div className="notes-list">{sorted.length ? sorted.map((note) => <article className={`note-card note-card--${note.kind}${note.pinned ? " is-pinned":""}`} key={note.id} onDoubleClick={() => canEdit && !editing && begin()}>{editing ? <><div className="note-card__controls"><select value={note.kind} onChange={(event) => patch(note.id,{kind:event.target.value as NoteKind})}>{Object.entries(kindLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select><label><input type="checkbox" checked={Boolean(note.pinned)} onChange={(event) => patch(note.id,{pinned:event.target.checked})} />置顶</label><button type="button" onClick={() => setDraft((items) => items.filter((item) => item.id !== note.id))}>删除</button></div><input value={note.reference ?? ""} onChange={(event) => patch(note.id,{reference:event.target.value})} placeholder="关联章节 / 集数 / 场次" /><textarea value={note.content} onChange={(event) => patch(note.id,{content:event.target.value})} placeholder="写下此刻想保存的文字……" /></> : <><header><span>{kindLabels[note.kind]}</span>{note.pinned ? <b>✦ 置顶</b>:null}<time>{new Date(note.createdAt).toLocaleDateString("zh-CN")}</time></header>{note.reference ? <small>{note.reference}</small>:null}<p>{note.content}</p></>}</article>) : <p className="empty-state">尚未留下分段笔记。</p>}</div></section>;
}
