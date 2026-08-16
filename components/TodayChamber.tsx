"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ArchiveNote, ArchiveStatus } from "@/types";
import { useArchiveData } from "./ArchiveDataProvider";

type ChamberItem = {
  id: string; href: string; kind: "书" | "影" | "契" | "句"; title: string;
  subtitle: string; date: string; rating: number; status?: ArchiveStatus; progress?: { current: number; total: number; unit: string };
  notes: ArchiveNote[]; quoteCount: number; hasReview: boolean; updatedAt?: string;
};

const dayKey = () => new Date().toISOString().slice(0, 10);
const dayOfYearSeed = (value: string) => Array.from(value).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 17);

export default function TodayChamber() {
  const { books, films, cps, entries, activeArchive } = useArchiveData();
  const storageKey = `randi-chamber:${activeArchive.id}:${dayKey()}`;
  const [dismissed, setDismissed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[]; } catch { return []; }
  });
  const [firstOpen, setFirstOpen] = useState(false);
  useEffect(() => {
    const key = `randi-chamber-open:${activeArchive.id}:${dayKey()}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    setFirstOpen(true);
  }, [activeArchive.id]);

  const items = useMemo<ChamberItem[]>(() => {
    const rowMap = new Map(entries.map((row) => [`${row.kind}:${row.legacy_id}`, row.updated_at]));
    return [
      ...books.map((item) => ({ id: `book:${item.id}`, href: `/book/${item.id}`, kind: "书" as const, title: item.title, subtitle: item.author || "作者未录", date: item.readDate, rating: item.rating, status: item.status, progress: item.progress, notes: item.notes ?? [], quoteCount: item.quotes.length, hasReview: Boolean(item.review.trim()), updatedAt: rowMap.get(`book:${item.id}`) })),
      ...films.map((item) => ({ id: `film:${item.id}`, href: `/film/${item.id}`, kind: "影" as const, title: item.title, subtitle: item.originalTitle || `${item.year} 年`, date: item.watchDate, rating: item.rating, status: item.status, progress: item.progress, notes: item.notes ?? [], quoteCount: item.lines.length, hasReview: Boolean(item.review.trim()), updatedAt: rowMap.get(`film:${item.id}`) })),
      ...cps.map((item) => ({ id: `cp:${item.id}`, href: `/cp/${item.id}`, kind: "契" as const, title: item.name, subtitle: item.origin || "出处未录", date: item.startDate, rating: item.rating, status: item.status, progress: item.progress, notes: item.notes ?? [], quoteCount: item.scenes.length, hasReview: Boolean(item.summary.trim()), updatedAt: rowMap.get(`cp:${item.id}`) })),
    ];
  }, [books, films, cps, entries]);

  const visible = items.filter((item) => !dismissed.includes(item.id));
  const now = new Date();
  const ongoing = visible.filter((item) => item.status === "active").sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 3);
  const anniversary = visible.filter((item) => {
    const date = new Date(item.date);
    return !Number.isNaN(date.valueOf()) && date.getFullYear() < now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  }).slice(0, 3);
  const unfinished = visible.filter((item) => item.rating === 0 || !item.hasReview || (item.status === "active" && !item.progress) || (item.quoteCount > 0 && !item.hasReview)).slice(0, 3);
  const revisitRanked = visible.map((item) => {
    const last = new Date(item.updatedAt || item.date || 0);
    const days = Math.max(0, Math.floor((now.valueOf() - last.valueOf()) / 86400000));
    const stale = Math.min(1, days / 365);
    const score = stale * 35 + (item.rating / 5) * 25 + (!item.hasReview ? 20 : 0) + (item.quoteCount ? 10 : 0) + (anniversary.some((candidate) => candidate.id === item.id) ? 10 : 0);
    const reasons = [item.rating >= 4.5 ? `你给了它 ${item.rating} 分` : "", days > 30 ? `已经 ${days} 天没有打开` : "", item.quoteCount ? `保存了 ${item.quoteCount} 条${item.kind === "契" ? "名场面" : "摘录"}` : "", !item.hasReview ? "还没有留下短评" : ""].filter(Boolean);
    return { ...item, score, reason: reasons.join("，") || "它还有一段记录值得续写" };
  }).sort((a, b) => b.score - a.score);
  const fortunePool = revisitRanked.filter((item) => item.quoteCount || item.notes.length);
  const fortune = fortunePool.length ? fortunePool[dayOfYearSeed(`${activeArchive.id}:${dayKey()}`) % fortunePool.length] : revisitRanked[0];

  function dismiss(id: string, action: "later" | "skip" | "seal") {
    const next = [...dismissed, id]; setDismissed(next); window.localStorage.setItem(storageKey, JSON.stringify(next));
    const eventKey = `randi-revisit-events:${activeArchive.id}`;
    const events = JSON.parse(window.localStorage.getItem(eventKey) ?? "[]") as unknown[];
    window.localStorage.setItem(eventKey, JSON.stringify([...events.slice(-199), { entry: id, action, at: new Date().toISOString() }]));
  }

  const sections = [
    { id: "ongoing", icon: "◐", latin: "IN PROGRESS", title: "正在进行", items: ongoing, copy: "最近仍在呼吸的故事" },
    { id: "anniversary", icon: "⌛", latin: "ON THIS DAY", title: "历史上的今天", items: anniversary, copy: "同一天曾经留下的痕迹" },
    { id: "unfinished", icon: "✎", latin: "UNFINISHED", title: "待续写", items: unfinished, copy: "还缺一句真正属于你的话" },
  ].filter((section) => section.items.length);

  if (!sections.length && !fortune) return null;
  return <section className={`today-chamber${firstOpen ? " today-chamber--unsealing" : ""}`} aria-labelledby="chamber-title">
    <header className="today-chamber__header"><span aria-hidden="true">◇</span><div><small>THE CHAMBER OF TODAY · {dayKey().replaceAll("-", " · ")}</small><h2 id="chamber-title">今日密室</h2><p>不增加新的门，只把值得重逢的记忆放到你眼前。</p></div><button type="button" onClick={() => window.dispatchEvent(new Event("open-quick-capture"))}>✒　快速封存</button></header>
    <div className="chamber-grid">
      {sections.map((section) => <article className={`chamber-column chamber-column--${section.id}`} key={section.id}><header><span>{section.icon}</span><div><small>{section.latin}</small><h3>{section.title}</h3><p>{section.copy}</p></div><b>{section.items.length}</b></header><div>{section.items.map((item) => <ChamberCard key={item.id} item={item} onDismiss={() => dismiss(item.id, "later")} />)}</div></article>)}
      {fortune ? <article className="chamber-column chamber-column--fortune"><header><span>✦</span><div><small>THE DAILY DRAW</small><h3>命运抽签</h3><p>今日固定，只在明天更换</p></div></header><div><div className="fortune-card"><span>{fortune.kind}</span><small>REVISIT SCORE · {Math.round(fortune.score)}</small><h4>{fortune.title}</h4><p>{fortune.reason}。</p><details><summary>为什么推荐我？</summary><p>{fortune.reason}。推荐来自可解释的时间、评分与内容完整度，不使用黑箱判断。</p></details><footer><Link href={fortune.href}>重温一下</Link><button type="button" onClick={() => dismiss(fortune.id, "skip")}>今天不看</button><button type="button" onClick={() => dismiss(fortune.id, "seal")}>暂时封存</button></footer></div></div></article> : null}
    </div>
  </section>;
}

function ChamberCard({ item, onDismiss }: { item: ChamberItem; onDismiss: () => void }) {
  const progress = item.progress ? Math.round((item.progress.current / Math.max(1, item.progress.total)) * 100) : null;
  return <div className={`chamber-card chamber-card--${item.kind === "书" ? "book" : item.kind === "影" ? "film" : "cp"}`}><Link href={item.href}><span>{item.kind}</span><div><small>{item.subtitle}</small><h4>{item.title}</h4>{progress !== null ? <div className="chamber-progress"><i style={{ width: `${Math.min(100, progress)}%` }} /><em>{item.progress?.current}/{item.progress?.total} {item.progress?.unit}</em></div> : null}</div></Link><button type="button" onClick={onDismiss} aria-label={`${item.title} 今天稍后再见`}>稍后再见</button></div>;
}
