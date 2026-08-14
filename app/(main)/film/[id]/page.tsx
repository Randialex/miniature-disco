"use client";

import Link from "next/link";
import BookCard from "@/components/BookCard";
import CpCard from "@/components/CpCard";
import RatingStars from "@/components/RatingStars";
import { useArchiveData } from "@/components/ArchiveDataProvider";
import ArchiveNotes from "@/components/ArchiveNotes";
import { EntryMeta } from "@/components/EntryMeta";

export default function FilmDetailPage({ params }: { params: { id: string } }) {
  const { books, films, cps, ready, saveFilms } = useArchiveData();
  const film = films.find((item) => item.id === params.id);
  if (!ready) return <div className="detail-loading">正在点亮银幕……</div>;
  if (!film) return <div className="not-found"><span>404</span><h1>这帧影像已隐入黑雾</h1><Link className="gothic-button" href="/film">返回影像</Link></div>;
  const relatedBooks = books.filter((item) => film.bookIds?.includes(item.id));
  const relatedCps = cps.filter((item) => film.cpIds?.includes(item.id));
  return <article className="detail-page detail-page--film"><Link className="back-link" href="/film">←　返回影像</Link><section className="detail-hero"><div className={`detail-cover cover-art cover-art--film${film.posterUrl ? " cover-art--image" : ""}`} style={{ "--art-tone": film.posterTone, backgroundImage: film.posterUrl ? `linear-gradient(rgba(5,6,10,.12),rgba(5,6,10,.48)),url("${film.posterUrl}")` : undefined } as React.CSSProperties}><span className="cover-art__halo" /><span className="cover-art__monogram">{film.monogram}</span><small>MOVING PICTURE</small></div><div className="detail-info"><p className="page-eyebrow">IMAGO · PRIVATE SCREENING</p><h1>{film.title}</h1><p className="detail-info__subtitle">{film.originalTitle ?? film.year}</p><RatingStars rating={film.rating} size="large" /><EntryMeta kind="film" status={film.status} progress={film.progress} /><dl><div><dt>年份</dt><dd>{film.year}</dd></div><div><dt>类型</dt><dd>{film.genres.join(" · ")}</dd></div><div><dt>观剧日期</dt><dd>{film.watchDate.replaceAll("-", " / ")}</dd></div></dl></div></section><section className="parchment-panel"><div className="module-title"><small>AFTER THE CREDITS</small><h2>观感短评</h2></div><p>{film.review}</p></section><section className="line-module"><div className="module-title"><small>MEMORABLE LINES</small><h2>名场面台词</h2></div>{film.lines.map((line, index) => <div key={`${line}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{line}</p></div>)}</section><ArchiveNotes notes={film.notes} onChange={(notes) => saveFilms(films.map((item) => item.id === film.id ? {...item,notes}:item))} />{relatedBooks.length || relatedCps.length ? <section className="relations"><div className="module-title"><small>CONNECTED ARCHIVES</small><h2>关联档案</h2></div>{relatedBooks.length ? <div className="relation-group"><h3>原著书籍</h3><div className="relation-grid">{relatedBooks.map((item) => <BookCard key={item.id} book={item} compact />)}</div></div> : null}{relatedCps.length ? <div className="relation-group"><h3>关联羁绊</h3><div className="relation-grid">{relatedCps.map((item) => <CpCard key={item.id} cp={item} compact />)}</div></div> : null}</section> : null}</article>;
}
