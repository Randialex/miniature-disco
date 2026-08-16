"use client";

import { useMemo, useState } from "react";
import TimelineItem from "@/components/TimelineItem";
import { useArchiveData } from "@/components/ArchiveDataProvider";
import type { TimelineEvent } from "@/types";

export default function TimelinePage() {
  const { books, films, cps } = useArchiveData();
  const [kind,setKind] = useState<"all" | TimelineEvent["kind"]>("all");
  const [ascending,setAscending] = useState(false);
  const events = useMemo<TimelineEvent[]>(() => [
    ...books.map((book) => ({ id: book.id, kind: "book" as const, date: book.readDate, title: `读完《${book.title}》`, note: book.review, href: `/book/${book.id}` })),
    ...films.map((film) => ({ id: film.id, kind: "film" as const, date: film.watchDate, title: `看完《${film.title}》`, note: film.review, href: `/film/${film.id}` })),
    ...cps.map((cp) => ({ id: cp.id, kind: "cp" as const, date: cp.startDate, title: `入坑 ${cp.name}`, note: cp.summary, href: `/cp/${cp.id}` })),
  ].filter((item) => kind === "all" || item.kind === kind).sort((a, b) => ascending ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)), [ascending, books, films, cps, kind]);
  return <section className="collection-page collection-page--timeline">
    <header className="collection-header"><p className="page-eyebrow">CHRONICA · A MEMORY IN GOLD</p><span className="collection-header__sigil">时</span><h1>时 光 轴</h1><p>所有相遇按日期倒序封存，沿金色刻度重访曾经的心动。</p></header>
    <div className="timeline-controls"><label>类型<select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="all">全部</option><option value="book">书录</option><option value="film">影像</option><option value="cp">羁绊</option></select></label><button type="button" onClick={() => setAscending((value) => !value)}>{ascending ? "时间正序 ↑" : "时间倒序 ↓"}</button><span>累计 {events.length} 个节点</span></div><div className="timeline-list">{events.map((event, index) => <TimelineItem key={`${event.kind}-${event.id}`} event={event} index={index} />)}</div>
  </section>;
}
