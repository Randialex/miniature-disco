"use client";

import Link from "next/link";
import BookCard from "@/components/BookCard";
import FilmCard from "@/components/FilmCard";
import RatingStars from "@/components/RatingStars";
import { useArchiveData } from "@/components/ArchiveDataProvider";
import ArchiveNotes from "@/components/ArchiveNotes";
import { EntryMeta } from "@/components/EntryMeta";

export default function CpDetailPage({ params }: { params: { id: string } }) {
  const { books, films, cps, ready, saveCps } = useArchiveData();
  const cp = cps.find((item) => item.id === params.id);
  if (!ready) return <div className="detail-loading">正在查验契约……</div>;
  if (!cp) return <div className="not-found"><span>404</span><h1>这份契约已隐入黑雾</h1><Link className="gothic-button" href="/cp">返回羁绊</Link></div>;
  const relatedBooks = books.filter((item) => cp.bookIds?.includes(item.id));
  const relatedFilms = films.filter((item) => cp.filmIds?.includes(item.id));
  return <article className="detail-page detail-page--cp"><Link className="back-link" href="/cp">←　返回羁绊</Link><section className="cp-detail-hero"><div className="bond-sigil bond-sigil--large" style={{ "--art-tone": cp.tone } as React.CSSProperties}><span>{cp.monogram}</span><i /></div><div className="detail-info"><p className="page-eyebrow">VINCULUM · SEALED BOND</p><h1>{cp.name}</h1><p className="detail-info__subtitle">出处 · {cp.origin}</p><RatingStars rating={cp.rating} size="large" /><EntryMeta kind="cp" status={cp.status} progress={cp.progress} /><dl><div><dt>出处作品</dt><dd>{cp.origin}</dd></div><div><dt>入坑日期</dt><dd>{cp.startDate.replaceAll("-", " / ")}</dd></div></dl></div></section><section className="parchment-panel parchment-panel--green"><div className="module-title"><small>THE ESSENCE OF A BOND</small><h2>核心羁绊简述</h2></div><p>{cp.summary}</p></section><section className="scene-module"><div className="module-title"><small>SCENES PRESERVED</small><h2>名场面记录</h2></div><div className="scene-grid">{cp.scenes.map((scene, index) => <article key={`${scene.title}-${index}`}><div className="scene-art"><span>{scene.motif}</span><small>SCENE {String(index + 1).padStart(2, "0")}</small></div><h3>{scene.title}</h3><p>{scene.note}</p></article>)}</div></section><ArchiveNotes notes={cp.notes} onChange={(notes) => saveCps(cps.map((item) => item.id === cp.id ? {...item,notes}:item))} />{relatedBooks.length || relatedFilms.length ? <section className="relations"><div className="module-title"><small>CONNECTED ARCHIVES</small><h2>出处档案</h2></div>{relatedBooks.length ? <div className="relation-group"><h3>出处书籍</h3><div className="relation-grid">{relatedBooks.map((item) => <BookCard key={item.id} book={item} compact />)}</div></div> : null}{relatedFilms.length ? <div className="relation-group"><h3>出处影视</h3><div className="relation-grid">{relatedFilms.map((item) => <FilmCard key={item.id} film={item} compact />)}</div></div> : null}</section> : null}</article>;
}
