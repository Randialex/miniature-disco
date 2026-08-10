import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookCard from "@/components/BookCard";
import CpCard from "@/components/CpCard";
import FilmCard from "@/components/FilmCard";
import RatingStars from "@/components/RatingStars";
import { books, getBook } from "@/data/books";
import { cps } from "@/data/cps";
import { films } from "@/data/films";

export const dynamicParams = false;
export function generateStaticParams() { return books.map(({ id }) => ({ id })); }
export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const book = getBook(params.id);
  return { title: book ? `${book.title} · 书录` : "档案未找到" };
}

export default function BookDetailPage({ params }: { params: { id: string } }) {
  const book = getBook(params.id);
  if (!book) notFound();
  const relatedFilms = films.filter((film) => book.filmIds?.includes(film.id));
  const relatedCps = cps.filter((cp) => book.cpIds?.includes(cp.id));

  return (
    <article className="detail-page detail-page--book">
      <Link className="back-link" href="/book">←　返回书录</Link>
      <section className="detail-hero">
        <div className="detail-cover cover-art cover-art--book" style={{ "--art-tone": book.coverTone } as React.CSSProperties}>
          <span className="cover-art__corner" /><span className="cover-art__monogram">{book.monogram}</span><small>PRIVATE EDITION</small>
        </div>
        <div className="detail-info">
          <p className="page-eyebrow">LIBRIS · PRIVATE VOLUME</p><h1>{book.title}</h1><p className="detail-info__subtitle">{book.author}</p>
          <RatingStars rating={book.rating} size="large" />
          <dl><div><dt>作者</dt><dd>{book.author}</dd></div><div><dt>类型</dt><dd>{book.genres.join(" · ")}</dd></div><div><dt>阅读日期</dt><dd>{book.readDate.replaceAll("-", " / ")}</dd></div></dl>
        </div>
      </section>
      <section className="parchment-panel"><div className="module-title"><small>PRIVATE MARGINALIA</small><h2>个人短评</h2></div><p>{book.review}</p></section>
      <section className="quote-module"><div className="module-title"><small>EXCERPTA</small><h2>书　摘</h2></div>{book.quotes.map((quote, index) => <blockquote key={quote}><span>“</span><p>{quote}</p><cite>— 摘录 {String(index + 1).padStart(2, "0")}</cite></blockquote>)}</section>
      {(relatedFilms.length > 0 || relatedCps.length > 0) && <section className="relations"><div className="module-title"><small>CONNECTED ARCHIVES</small><h2>关联档案</h2></div>{relatedFilms.length > 0 && <div className="relation-group"><h3>改编影视</h3><div className="relation-grid">{relatedFilms.map((film) => <FilmCard key={film.id} film={film} compact />)}</div></div>}{relatedCps.length > 0 && <div className="relation-group"><h3>关联羁绊</h3><div className="relation-grid">{relatedCps.map((cp) => <CpCard key={cp.id} cp={cp} compact />)}</div></div>}</section>}
    </article>
  );
}
