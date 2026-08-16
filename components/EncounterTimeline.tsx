"use client";

import { useMemo, useState } from "react";
import type { ArchiveProgress, ArchiveSession, ArchiveStatus, Book, Cp, EmotionStamp, Film } from "@/types";
import { useArchiveData } from "./ArchiveDataProvider";

const emotions: EmotionStamp[] = ["治愈", "震撼", "怅然", "上头", "意难平", "平静"];
const labels: Record<ArchiveStatus, string> = { planned: "计划", active: "进行中", completed: "已完成", paused: "暂停", dropped: "搁置" };
const makeId = () => `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export default function EncounterTimeline({ kind, entry }: { kind: "book" | "film" | "cp"; entry: Book | Film | Cp }) {
  const { books, films, cps, canEdit, user, members, saveBooks, saveFilms, saveCps } = useArchiveData();
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ startedAt: new Date().toISOString().slice(0, 10), endedAt: "", status: "completed" as ArchiveStatus, rating: entry.rating || 5, current: entry.progress?.current ?? 0, total: entry.progress?.total ?? 0, unit: entry.progress?.unit ?? (kind === "book" ? "页" : "集"), emotion: "平静" as EmotionStamp, reflection: "" });
  const sessions = useMemo(() => [...(entry.sessions ?? [])].sort((a, b) => b.startedAt.localeCompare(a.startedAt)), [entry.sessions]);
  const memberName = members.find((item) => item.userId === user.id)?.displayName ?? user.email ?? "档案成员";

  function save() {
    const now = new Date().toISOString();
    const progress: ArchiveProgress | undefined = form.total > 0 ? { current: form.current, total: form.total, unit: form.unit } : undefined;
    const session: ArchiveSession = { id: makeId(), startedAt: form.startedAt, endedAt: form.endedAt || undefined, status: form.status, rating: form.rating, progress, emotion: form.emotion, reflection: form.reflection.trim(), isRevisit: sessions.length > 0, createdAt: now, updatedAt: now, createdBy: user.id, createdByName: memberName };
    if (kind === "book") saveBooks(books.map((item) => item.id === entry.id ? { ...item, sessions: [...(item.sessions ?? []), session], rating: form.rating, status: form.status, progress } : item));
    if (kind === "film") saveFilms(films.map((item) => item.id === entry.id ? { ...item, sessions: [...(item.sessions ?? []), session], rating: form.rating, status: form.status, progress } : item));
    if (kind === "cp") saveCps(cps.map((item) => item.id === entry.id ? { ...item, sessions: [...(item.sessions ?? []), session], rating: form.rating, status: form.status, progress } : item));
    setAdding(false);
  }

  const points = sessions.filter((item) => typeof item.rating === "number").reverse();
  return <section className="encounter-module"><header className="module-title encounter-title"><div><small>ENCOUNTERS THROUGH TIME</small><h2>相遇记录</h2></div>{canEdit ? <button type="button" onClick={() => setAdding((value) => !value)}>＋ 新增一次{kind === "book" ? "阅读" : "观看"}</button> : null}</header>
    {adding ? <div className="encounter-form">
      <label><span>开始日期</span><input type="date" value={form.startedAt} onChange={(event) => setForm({ ...form, startedAt: event.target.value })} /></label>
      <label><span>完成 / 暂停日期</span><input type="date" value={form.endedAt} onChange={(event) => setForm({ ...form, endedAt: event.target.value })} /></label>
      <label><span>本次状态</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ArchiveStatus })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>本次评分</span><input type="number" min="0" max="5" step="0.5" value={form.rating} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })} /></label>
      <label><span>进度</span><div className="encounter-progress-fields"><input type="number" min="0" value={form.current} onChange={(event) => setForm({ ...form, current: Number(event.target.value) })} /><i>/</i><input type="number" min="0" value={form.total} onChange={(event) => setForm({ ...form, total: Number(event.target.value) })} /><input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></div></label>
      <fieldset><legend>情绪印章</legend>{emotions.map((emotion) => <button className={form.emotion === emotion ? "is-active" : ""} type="button" key={emotion} onClick={() => setForm({ ...form, emotion })}>{emotion}</button>)}</fieldset>
      <label className="encounter-form__wide"><span>本次感想</span><textarea value={form.reflection} onChange={(event) => setForm({ ...form, reflection: event.target.value })} placeholder="重逢之后，关系发生了什么变化？" /></label>
      <footer><button type="button" onClick={() => setAdding(false)}>取消</button><button type="button" onClick={save}>封存这次相遇</button></footer>
    </div> : null}
    {points.length > 1 ? <div className="rating-curve" aria-label="评分变化曲线"><span>评分变化</span>{points.map((item, index) => <div key={item.id} style={{ height: `${Math.max(8, (item.rating ?? 0) * 13)}px` }}><i>{item.rating}</i><small>{new Date(item.startedAt).getFullYear()}</small>{index < points.length - 1 ? <b /> : null}</div>)}</div> : null}
    {sessions.length ? <ol className="encounter-timeline">{sessions.map((session, index) => <li key={session.id}><button type="button" onClick={() => setExpanded(expanded === session.id ? null : session.id)}><span>{new Date(session.startedAt).getFullYear()}</span><div><strong>{session.isRevisit ? `第 ${sessions.length - index} 次${kind === "book" ? "阅读" : "观看"}` : `初次${kind === "book" ? "阅读" : "观看"}`}</strong><p>{session.rating ?? "—"} 分 · {session.emotion ?? labels[session.status]}{session.createdByName ? ` · ${session.createdByName}` : ""}</p></div><i>{expanded === session.id ? "−" : "+"}</i></button>{expanded === session.id ? <div className="encounter-detail"><p>{session.reflection || "这次相遇尚未留下文字。"}</p>{session.progress ? <small>进度 {session.progress.current} / {session.progress.total} {session.progress.unit}</small> : null}<time>{session.startedAt}{session.endedAt ? ` — ${session.endedAt}` : ""}</time></div> : null}</li>)}</ol> : <div className="encounter-empty"><span>◇</span><p>一次相遇不必成为最终结论。下次重读或重看时，再回来记下变化。</p></div>}
  </section>;
}
