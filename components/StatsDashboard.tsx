"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { useArchiveData } from "./ArchiveDataProvider";

const palette = ["#7fa9df", "#ae8cdf", "#77bea0", "#e0a85e", "#ba6876", "#7d8fb3"];

function PanelTitle({ latin, children }: { latin: string; children: ReactNode }) {
  return <header className="stats-panel-title"><span aria-hidden="true">✦</span><div><small>{latin}</small><h2>{children}</h2></div></header>;
}

function Pie({ title, latin, entries }: { title: string; latin: string; entries: Array<[string, number]> }) {
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  let cursor = 0;
  const stops = entries.map(([, count], index) => {
    const start = cursor;
    cursor += total ? count / total * 100 : 0;
    return `${palette[index % palette.length]} ${start}% ${cursor}%`;
  });
  return <article className="stats-panel stats-pie">
    <PanelTitle latin={latin}>{title}</PanelTitle>
    <div className="pie-layout">
      <div className="pie-chart" style={{ background: `conic-gradient(${stops.join(",") || "#26232c 0 100%"})` }} aria-label={`${title}分类比例`}><span><b>{entries.length}</b><small>类藏品</small></span></div>
      <ul>{entries.length ? entries.map(([name, count], index) => <li key={name}><i style={{ background: palette[index % palette.length] }} /><span>{name}<small>{count} 次收录</small></span><strong>{Math.round(count / total * 100)}%</strong></li>) : <li className="stats-empty">尚无数据</li>}</ul>
    </div>
  </article>;
}

function AnnualList({ title, tone, items }: { title: string; tone: "book" | "film"; items: Array<{ id: string; title: string; date: string; rating: number }> }) {
  return <div className={`annual-list annual-list--${tone}`}><h3><span>{tone === "book" ? "书" : "影"}</span>{title}<b>{items.length}</b></h3><ol>{items.length ? items.map((item) => <li key={item.id}><time>{item.date.slice(5).replace("-", ".")}</time><span>{item.title}</span><strong>{item.rating.toFixed(1)}</strong></li>) : <li className="stats-empty">本年尚未收录</li>}</ol></div>;
}

export default function StatsDashboard() {
  const { books, films, cps } = useArchiveData();
  const year = new Date().getFullYear();
  const stats = useMemo(() => {
    const ratings = [...books, ...films, ...cps].map((item) => item.rating);
    const annualBooks = books.filter((item) => Number(item.readDate.slice(0, 4)) === year).sort((a, b) => b.readDate.localeCompare(a.readDate));
    const annualFilms = films.filter((item) => Number(item.watchDate.slice(0, 4)) === year).sort((a, b) => b.watchDate.localeCompare(a.watchDate));
    const annual = [
      ...annualBooks.map((item) => ({ id: `b-${item.id}`, title: item.title, date: item.readDate, rating: item.rating, kind: "书录", sigil: "书" })),
      ...annualFilms.map((item) => ({ id: `f-${item.id}`, title: item.title, date: item.watchDate, rating: item.rating, kind: "影像", sigil: "影" })),
    ];
    const genreEntries = (items: Array<{ genres: string[] }>) => {
      const map = new Map<string, number>();
      items.forEach((item) => item.genres.forEach((genre) => map.set(genre, (map.get(genre) ?? 0) + 1)));
      return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    };
    const months = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, books: 0, films: 0 }));
    annualBooks.forEach((item) => { const month = Number(item.readDate.slice(5, 7)); if (months[month - 1]) months[month - 1].books += 1; });
    annualFilms.forEach((item) => { const month = Number(item.watchDate.slice(5, 7)); if (months[month - 1]) months[month - 1].films += 1; });
    const max = Math.max(1, ...months.flatMap((month) => [month.books, month.films]));
    const average = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
    const notes = [...books,...films,...cps].reduce((sum,item) => sum + (item.notes?.length ?? 0),0) + books.reduce((sum,item) => sum + item.quotes.length,0) + films.reduce((sum,item) => sum + item.lines.length,0) + cps.reduce((sum,item) => sum + item.scenes.length,0);
    const annualCompleted = annual.length + cps.filter((item) => Number(item.startDate.slice(0,4)) === year && (item.status ?? "completed") === "completed").length;
    return { average, annualBooks, annualFilms, notes, annualCompleted, top: annual.sort((a, b) => b.rating - a.rating || b.date.localeCompare(a.date)).slice(0, 3), bookGenres: genreEntries(books), filmGenres: genreEntries(films), months, max };
  }, [books, films, cps, year]);

  const overview = [
    { label: "累计藏书", value: books.length, latin: "VOLUMES", sigil: "书", note: `今年 +${stats.annualBooks.length}`, tone: "book" },
    { label: "累计观影", value: films.length, latin: "PICTURES", sigil: "影", note: `今年 +${stats.annualFilms.length}`, tone: "film" },
    { label: "羁绊 CP", value: cps.length, latin: "BONDS", sigil: "契", note: "恒久封存", tone: "cp" },
    { label: "累计笔记", value: stats.notes, latin: "MARGINALIA", sigil: "笺", note: "摘抄 · 感想 · 名场面", tone: "rating" },
    { label: "本年度完成", value: stats.annualCompleted, latin: "ANNUAL", sigil: "历", note: `${year} 年`, tone: "rating" },
    { label: "平均评分", value: stats.average.toFixed(1), latin: "RATING", sigil: "星", note: "满分 5.0", tone: "rating" },
  ];

  const report = `${year} 年度魔法报告｜拾染randi\n这一年共封存 ${stats.annualBooks.length} 本书、${stats.annualFilms.length} 部影像与 ${cps.length} 组羁绊，留下 ${stats.notes} 则摘抄与手记。综合平均评分 ${stats.average.toFixed(1)}，愿所有被记住的故事继续在星夜里发光。`;
  const copyReport = async () => { await navigator.clipboard.writeText(report); };
  const saveReport = () => { const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1600;const context=canvas.getContext("2d");if(!context)return;const dark=document.documentElement.dataset.theme!=="light";context.fillStyle=dark?"#0b0b0f":"#e8dcc4";context.fillRect(0,0,1080,1600);context.strokeStyle=dark?"#d48a3c":"#7a1f1f";context.lineWidth=3;context.strokeRect(55,55,970,1490);context.fillStyle=dark?"#efb96f":"#7a1f1f";context.font="48px serif";context.textAlign="center";context.fillText(`${year} 年度魔法报告`,540,180);context.fillStyle=dark?"#b8b8c8":"#2b1f14";context.font="32px serif";const lines=[`拾染randi · 书影私藏魔法录`,`藏书 ${books.length} · 观影 ${films.length} · 羁绊 ${cps.length}`,`本年完成 ${stats.annualCompleted} · 累计笔记 ${stats.notes}`,`综合平均评分 ${stats.average.toFixed(1)}`,"愿所有被记住的故事，继续在星夜里发光。"];lines.forEach((line,index)=>context.fillText(line,540,380+index*150));const link=document.createElement("a");link.download=`shiying-randi-report-${year}.png`;link.href=canvas.toDataURL("image/png");link.click(); };

  return <div className="stats-dashboard">
    <section className="stats-overview" aria-label="档案总览">{overview.map((item) => <article className={`stats-overview-card stats-overview-card--${item.tone}`} key={item.label}><div className="stats-sigil" aria-hidden="true"><span>{item.sigil}</span></div><div><small>{item.latin}</small><span>{item.label}</span><strong>{item.value}</strong><em>{item.note}</em></div></article>)}</section>

    <section className="stats-year-grid">
      <article className="stats-panel stats-year"><PanelTitle latin={`ANNUAL CHRONICLE · ${year}`}>本年收藏手记</PanelTitle><div className="annual-lists"><AnnualList title="年度书单" tone="book" items={stats.annualBooks.map((item) => ({ id: item.id, title: item.title, date: item.readDate, rating: item.rating }))} /><AnnualList title="年度影单" tone="film" items={stats.annualFilms.map((item) => ({ id: item.id, title: item.title, date: item.watchDate, rating: item.rating }))} /></div></article>
      <article className="stats-panel stats-top"><PanelTitle latin="HIGHEST CONSTELLATIONS">年度评分星座</PanelTitle><div className="top-podium">{stats.top.length ? stats.top.map((item, index) => <div className={`top-rank top-rank--${index + 1}`} key={item.id}><b>0{index + 1}</b><span className="top-rank__sigil">{item.sigil}</span><div><strong>{item.title}</strong><small>{item.kind} · {item.date}</small></div><em>{item.rating.toFixed(1)}</em></div>) : <p className="stats-empty">本年尚无评分档案</p>}</div></article>
    </section>

    <section className="stats-pie-grid"><Pie title="书籍类型星盘" latin="LIBRIS · GENRE ORACLE" entries={stats.bookGenres} /><Pie title="影视类型星盘" latin="IMAGO · GENRE ORACLE" entries={stats.filmGenres} /></section>

    <section className="stats-panel stats-months"><PanelTitle latin={`MONTHLY RITUALS · ${year}`}>十二月收藏星轨</PanelTitle><div className="bar-legend"><span><i />书录</span><span><i />影像</span></div><div className="month-chart">{stats.months.map((month) => <div className="month-column" key={month.month}><div className="month-bars"><i className="book-bar" style={{ "--bar-height": `${month.books / stats.max * 100}%` } as CSSProperties}><b>{month.books || ""}</b></i><i className="film-bar" style={{ "--bar-height": `${month.films / stats.max * 100}%` } as CSSProperties}><b>{month.films || ""}</b></i></div><span>{String(month.month).padStart(2, "0")}</span></div>)}</div><div className="chart-caption"><span>JAN</span><i>每一道光柱，都是一次与故事相遇</i><span>DEC</span></div></section><section className="stats-panel annual-report"><PanelTitle latin="ANNUAL ARCANE REPORT">年度魔法报告</PanelTitle><p>{report}</p><div><button type="button" onClick={copyReport}>复制报告文案</button><button type="button" onClick={saveReport}>生成长图保存</button></div></section>
  </div>;
}
