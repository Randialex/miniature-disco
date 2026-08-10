"use client";

import Link from "next/link";
import BookCard from "@/components/BookCard";
import CpCard from "@/components/CpCard";
import FilmCard from "@/components/FilmCard";
import RatingStars from "@/components/RatingStars";
import { useArchiveData } from "@/components/ArchiveDataProvider";

export default function BookDetailPage({ params }: { params: { id: string } }) {
  const { books, films, cps, ready } = useArchiveData();
  const book = books.find((item) => item.id === params.id);
  if (!ready) return <div className="detail-loading">正在唤醒书页……</div>;
  if (!book) return <div className="not-found"><span>404</span><h1>这册档案已隐入黑雾</h1><Link className="gothic-button" href="/book">返回书录</Link></div>;
  const relatedFilms = films.filter((item) => book.filmIds?.includes(item.id));
  const relatedCps = cps.filter((item) => book.cpIds?.includes(item.id));
  return <article className="detail-page detail-page--book"><Link className="back-link" href="/book">←　返回书录</Link><section className="detail-hero"><div className={`detail-cover cover-art cover-art--book${book.coverUrl ? " cover-art--image" : ""}`} style={{ "--art-tone": book.coverTone, backgroundImage: book.coverUrl ? `linear-gradient(rgba(5,6,10,.12),rgba(5,6,10,.48)),url("${book.coverUrl}")` : undefined } as React.CSSProperties}><span className="cover-art__corner" /><span className="cover-art__monogram">{book.monogram}</span><small>PRIVATE EDITION</small></div><div className="detail-info"><p className="page-eyebrow">LIBRIS · PRIVATE VOLUME</p><h1>{book.title}</h1><p className="detail-info__subtitle">{book.author}</p><RatingStars rating={book.rating} size="large" /><dl><div><dt>作者</dt><dd>{book.author}</dd></div><div><dt>类型</dt><dd>{book.genres.join(" · ")}</dd></div><div><dt>阅读日期</dt><dd>{book.readDate.replaceAll("-", " / ")}</dd></div></dl></div></section><section className="parchment-panel"><div className="module-title"><small>PRIVATE MARGINALIA</small><h2>个人短评</h2></div><p>{book.review}</p></section><section className="quote-module"><div className="module-title"><small>EXCERPTA</small><h2>书　摘</h2></div>{book.quotes.map((quote, index) => <blockquote key={`${quote}-${index}`}><span>“</span><p>{quote}</p><cite>— 摘录 {String(index + 1).padStart(2, "0")}</cite></blockquote>)}</section>{relatedFilms.length || relatedCps.length ? <section className="relations"><div className="module-title"><small>CONNECTED ARCHIVES</small><h2>关联档案</h2></div>{relatedFilms.length ? <div className="relation-group"><h3>改编影视</h3><div className="relation-grid">{relatedFilms.map((item) => <FilmCard key={item.id} film={item} compact />)}</div></div> : null}{relatedCps.length ? <div className="relation-group"><h3>关联羁绊</h3><div className="relation-grid">{relatedCps.map((item) => <CpCard key={item.id} cp={item} compact />)}</div></div> : null}</section> : null}</article>;
}
