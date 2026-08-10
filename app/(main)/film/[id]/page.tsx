import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookCard from "@/components/BookCard";
import CpCard from "@/components/CpCard";
import RatingStars from "@/components/RatingStars";
import { books } from "@/data/books";
import { cps } from "@/data/cps";
import { films, getFilm } from "@/data/films";

export const dynamicParams = false;
export function generateStaticParams() { return films.map(({ id }) => ({ id })); }
export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const film = getFilm(params.id);
  return { title: film ? `${film.title} · 影像` : "档案未找到" };
}

export default function FilmDetailPage({ params }: { params: { id: string } }) {
  const film = getFilm(params.id);
  if (!film) notFound();
  const relatedBooks = books.filter((book) => film.bookIds?.includes(book.id));
  const relatedCps = cps.filter((cp) => film.cpIds?.includes(cp.id));

  return (
    <article className="detail-page detail-page--film">
      <Link className="back-link" href="/film">←　返回影像</Link>
      <section className="detail-hero">
        <div className="detail-cover cover-art cover-art--film" style={{ "--art-tone": film.posterTone } as React.CSSProperties}>
          <span className="cover-art__halo" /><span className="cover-art__monogram">{film.monogram}</span><small>MOVING PICTURE</small>
        </div>
        <div className="detail-info">
          <p className="page-eyebrow">IMAGO · PRIVATE SCREENING</p><h1>{film.title}</h1><p className="detail-info__subtitle">{film.originalTitle ?? film.year}</p>
          <RatingStars rating={film.rating} size="large" />
          <dl><div><dt>年份</dt><dd>{film.year}</dd></div><div><dt>类型</dt><dd>{film.genres.join(" · ")}</dd></div><div><dt>观剧日期</dt><dd>{film.watchDate.replaceAll("-", " / ")}</dd></div></dl>
        </div>
      </section>
      <section className="parchment-panel"><div className="module-title"><small>AFTER THE CREDITS</small><h2>观感短评</h2></div><p>{film.review}</p></section>
      <section className="line-module"><div className="module-title"><small>MEMORABLE LINES</small><h2>名场面台词</h2></div>{film.lines.map((line, index) => <div key={line}><span>{String(index + 1).padStart(2, "0")}</span><p>{line}</p></div>)}</section>
      {(relatedBooks.length > 0 || relatedCps.length > 0) && <section className="relations"><div className="module-title"><small>CONNECTED ARCHIVES</small><h2>关联档案</h2></div>{relatedBooks.length > 0 && <div className="relation-group"><h3>原著书籍</h3><div className="relation-grid">{relatedBooks.map((book) => <BookCard key={book.id} book={book} compact />)}</div></div>}{relatedCps.length > 0 && <div className="relation-group"><h3>关联羁绊</h3><div className="relation-grid">{relatedCps.map((cp) => <CpCard key={cp.id} cp={cp} compact />)}</div></div>}</section>}
    </article>
  );
}
