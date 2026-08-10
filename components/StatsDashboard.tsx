"use client";

import { useMemo } from "react";
import { useArchiveData } from "./ArchiveDataProvider";

const palette = ["#739ed9", "#a681dd", "#72b997", "#d79b4a", "#a7535d", "#7484a6"];

function Pie({ title, entries }: { title: string; entries: Array<[string, number]> }) {
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
  let cursor = 0;
  const stops = entries.map(([, count], index) => { const start = cursor; cursor += count / total * 100; return `${palette[index % palette.length]} ${start}% ${cursor}%`; });
  return <article className="stats-panel stats-pie"><div><small>GENRE DIVINATION</small><h2>{title}</h2></div><div className="pie-chart" style={{ background: `conic-gradient(${stops.join(",") || "#26232c 0 100%"})` }} aria-label={`${title}分类比例`}><span>{total}<small>标签</small></span></div><ul>{entries.map(([name, count], index) => <li key={name}><i style={{ background: palette[index % palette.length] }} /><span>{name}</span><strong>{Math.round(count / total * 100)}%</strong></li>)}</ul></article>;
}

export default function StatsDashboard() {
  const { books, films, cps } = useArchiveData();
  const year = new Date().getFullYear();
  const stats = useMemo(() => {
    const ratings = [...books, ...films, ...cps].map((item) => item.rating);
    const annualBooks = books.filter((item) => Number(item.readDate.slice(0, 4)) === year);
    const annualFilms = films.filter((item) => Number(item.watchDate.slice(0, 4)) === year);
    const annual = [
      ...annualBooks.map((item) => ({ id: `b-${item.id}`, title: item.title, date: item.readDate, rating: item.rating, kind: "书录" })),
      ...annualFilms.map((item) => ({ id: `f-${item.id}`, title: item.title, date: item.watchDate, rating: item.rating, kind: "影像" })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    const genreEntries = (items: Array<{ genres: string[] }>) => {
      const map = new Map<string, number>();
      items.forEach((item) => item.genres.forEach((genre) => map.set(genre, (map.get(genre) ?? 0) + 1)));
      return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    };
    const months = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, books: 0, films: 0 }));
    annualBooks.forEach((item) => { const month = Number(item.readDate.slice(5, 7)); if (months[month - 1]) months[month - 1].books += 1; });
    annualFilms.forEach((item) => { const month = Number(item.watchDate.slice(5, 7)); if (months[month - 1]) months[month - 1].films += 1; });
    const max = Math.max(1, ...months.flatMap((month) => [month.books, month.films]));
    return { average: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0, annualBooks, annualFilms, annual, top: [...annual].sort((a, b) => b.rating - a.rating || b.date.localeCompare(a.date)).slice(0, 3), bookGenres: genreEntries(books), filmGenres: genreEntries(films), months, max };
  }, [books, films, cps, year]);

  return <div className="stats-dashboard">
    <section className="stats-overview" aria-label="档案总览">
      {[["累计藏书", books.length, "VOLUMES"], ["累计观影", films.length, "PICTURES"], ["羁绊 CP", cps.length, "BONDS"], ["平均评分", stats.average.toFixed(1), "RATING"]].map(([label, value, latin]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{latin}</small></article>)}
    </section>
    <section className="stats-year-grid">
      <article className="stats-panel stats-year"><small>ANNUAL CHRONICLE · {year}</small><h2>本年新藏</h2><div className="annual-counts"><span><strong>{stats.annualBooks.length}</strong> 本书</span><span><strong>{stats.annualFilms.length}</strong> 部影像</span></div><ol>{stats.annual.map((item) => <li key={item.id}><time>{item.date.slice(5).replace("-", ".")}</time><span>{item.title}<small>{item.kind}</small></span><strong>{item.rating.toFixed(1)}</strong></li>)}</ol></article>
      <article className="stats-panel stats-top"><small>HIGHEST CONSTELLATIONS</small><h2>年度评分 TOP 3</h2>{stats.top.map((item, index) => <div key={item.id}><b>0{index + 1}</b><span>{item.title}<small>{item.kind} · {item.date}</small></span><strong>{item.rating.toFixed(1)}</strong></div>)}</article>
    </section>
    <section className="stats-pie-grid"><Pie title="书籍类型占比" entries={stats.bookGenres} /><Pie title="影视类型占比" entries={stats.filmGenres} /></section>
    <section className="stats-panel stats-months"><small>MONTHLY RITUALS · {year}</small><h2>阅读与观影时间分布</h2><div className="bar-legend"><span><i />书录</span><span><i />影像</span></div><div className="month-chart">{stats.months.map((month) => <div className="month-column" key={month.month}><div><i className="book-bar" style={{ height: `${month.books / stats.max * 100}%` }} title={`${month.books} 本`} /><i className="film-bar" style={{ height: `${month.films / stats.max * 100}%` }} title={`${month.films} 部`} /></div><span>{month.month}月</span></div>)}</div>
    </section>
  </div>;
}
