import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookCard from "@/components/BookCard";
import FilmCard from "@/components/FilmCard";
import RatingStars from "@/components/RatingStars";
import { books } from "@/data/books";
import { cps, getCp } from "@/data/cps";
import { films } from "@/data/films";

export const dynamicParams = false;
export function generateStaticParams() { return cps.map(({ id }) => ({ id })); }
export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const cp = getCp(params.id);
  return { title: cp ? `${cp.name} · 羁绊` : "档案未找到" };
}

export default function CpDetailPage({ params }: { params: { id: string } }) {
  const cp = getCp(params.id);
  if (!cp) notFound();
  const relatedBooks = books.filter((book) => cp.bookIds?.includes(book.id));
  const relatedFilms = films.filter((film) => cp.filmIds?.includes(film.id));

  return (
    <article className="detail-page detail-page--cp">
      <Link className="back-link" href="/cp">←　返回羁绊</Link>
      <section className="cp-detail-hero">
        <div className="bond-sigil bond-sigil--large" style={{ "--art-tone": cp.tone } as React.CSSProperties}><span>{cp.monogram}</span><i /></div>
        <div className="detail-info"><p className="page-eyebrow">VINCULUM · SEALED BOND</p><h1>{cp.name}</h1><p className="detail-info__subtitle">出处 · {cp.origin}</p><RatingStars rating={cp.rating} size="large" /><dl><div><dt>出处作品</dt><dd>{cp.origin}</dd></div><div><dt>入坑日期</dt><dd>{cp.startDate.replaceAll("-", " / ")}</dd></div></dl></div>
      </section>
      <section className="parchment-panel parchment-panel--green"><div className="module-title"><small>THE ESSENCE OF A BOND</small><h2>核心羁绊简述</h2></div><p>{cp.summary}</p></section>
      <section className="scene-module"><div className="module-title"><small>SCENES PRESERVED</small><h2>名场面记录</h2></div><div className="scene-grid">{cp.scenes.map((scene, index) => <article key={scene.title}><div className="scene-art"><span>{scene.motif}</span><small>SCENE {String(index + 1).padStart(2, "0")}</small></div><h3>{scene.title}</h3><p>{scene.note}</p></article>)}</div></section>
      {(relatedBooks.length > 0 || relatedFilms.length > 0) && <section className="relations"><div className="module-title"><small>CONNECTED ARCHIVES</small><h2>出处档案</h2></div>{relatedBooks.length > 0 && <div className="relation-group"><h3>出处书籍</h3><div className="relation-grid">{relatedBooks.map((book) => <BookCard key={book.id} book={book} compact />)}</div></div>}{relatedFilms.length > 0 && <div className="relation-group"><h3>出处影视</h3><div className="relation-grid">{relatedFilms.map((film) => <FilmCard key={film.id} film={film} compact />)}</div></div>}</section>}
    </article>
  );
}
