"use client";

import Link from "next/link";
import BookCard from "@/components/BookCard";
import CpCard from "@/components/CpCard";
import FilmCard from "@/components/FilmCard";
import RatingStars from "@/components/RatingStars";
import { useArchiveData } from "@/components/ArchiveDataProvider";
import ArchiveNotes from "@/components/ArchiveNotes";
import { EntryMeta } from "@/components/EntryMeta";
import EncounterTimeline from "@/components/EncounterTimeline";
import { ArchiveNeighborhood } from "@/components/MemoryStarMap";
import { useArchiveAssetUrl } from "@/components/ArchiveAssetField";
import ArchiveComments from "@/components/ArchiveComments";
import type { CommentAnchorOption } from "@/types/social";

export default function BookDetailPage({ params }: { params: { id: string } }) {
  const { books, films, cps, ready, saveBooks } = useArchiveData();
  const book = books.find((item) => item.id === params.id);
  const coverUrl = useArchiveAssetUrl(book?.asset, book?.coverUrl);
  if (!ready) return <div className="detail-loading">正在唤醒书页……</div>;
  if (!book) return <div className="not-found"><span>404</span><h1>这册档案已隐入黑雾</h1><Link className="gothic-button" href="/book">返回书录</Link></div>;
  const relatedFilms = films.filter((item) => book.filmIds?.includes(item.id));
  const relatedCps = cps.filter((item) => book.cpIds?.includes(item.id));
  const commentAnchors: CommentAnchorOption[] = [
    { type: "reflection", ref: "review", label: "个人短评", excerpt: book.review },
    ...book.quotes.map((quote, index) => ({ type: "quote" as const, ref: String(index), label: `书摘 ${String(index + 1).padStart(2, "0")}`, excerpt: quote })),
    ...(book.notes ?? []).map((note) => ({ type: "note" as const, ref: note.id, label: `私人笔记 · ${note.reference ?? note.kind}`, excerpt: note.content })),
    ...(book.sessions ?? []).map((session, index) => ({ type: "session" as const, ref: session.id, label: `阅读记录 ${String(index + 1).padStart(2, "0")} · ${session.startedAt}`, excerpt: session.reflection })),
  ];
  return <article className="detail-page detail-page--book"><Link className="back-link" href="/book">←　返回书录</Link><section className="detail-hero"><div className={`detail-cover cover-art cover-art--book${coverUrl ? " cover-art--image" : ""}`} style={{ "--art-tone": book.coverTone, backgroundImage: coverUrl ? `linear-gradient(rgba(5,6,10,${(book.asset?.overlay ?? 35) / 100}),rgba(5,6,10,.48)),url("${coverUrl}")` : undefined, backgroundPosition: book.asset ? `${book.asset.focusX}% ${book.asset.focusY}%` : undefined } as React.CSSProperties}><span className="cover-art__corner" /><span className="cover-art__monogram">{book.monogram}</span><small>PRIVATE EDITION</small></div><div className="detail-info"><p className="page-eyebrow">LIBRIS · PRIVATE VOLUME</p><h1>{book.title}</h1><p className="detail-info__subtitle">{book.author}</p><RatingStars rating={book.rating} size="large" /><EntryMeta kind="book" status={book.status} progress={book.progress} /><dl><div><dt>作者</dt><dd>{book.author}</dd></div><div><dt>类型</dt><dd>{book.genres.join(" · ")}</dd></div><div><dt>阅读日期</dt><dd>{book.readDate.replaceAll("-", " / ")}</dd></div></dl></div></section><section className="parchment-panel"><div className="module-title"><small>PRIVATE MARGINALIA</small><h2>个人短评</h2></div><p>{book.review}</p></section><EncounterTimeline kind="book" entry={book} /><section className="quote-module"><div className="module-title"><small>EXCERPTA</small><h2>书　摘</h2></div>{book.quotes.map((quote, index) => <blockquote key={`${quote}-${index}`}><span>“</span><p>{quote}</p><cite>— 摘录 {String(index + 1).padStart(2, "0")}</cite></blockquote>)}</section><ArchiveNotes notes={book.notes} onChange={(notes) => saveBooks(books.map((item) => item.id === book.id ? {...item,notes}:item))} /><ArchiveNeighborhood currentId={book.id} />{relatedFilms.length || relatedCps.length ? <section className="relations"><div className="module-title"><small>CONNECTED ARCHIVES</small><h2>关联档案</h2></div>{relatedFilms.length ? <div className="relation-group"><h3>改编影视</h3><div className="relation-grid">{relatedFilms.map((item) => <FilmCard key={item.id} film={item} compact />)}</div></div> : null}{relatedCps.length ? <div className="relation-group"><h3>关联羁绊</h3><div className="relation-grid">{relatedCps.map((item) => <CpCard key={item.id} cp={item} compact />)}</div></div> : null}</section> : null}<ArchiveComments kind="book" legacyId={book.id} title={book.title} anchors={commentAnchors} onPromote={(comment) => saveBooks(books.map((item) => item.id === book.id ? { ...item, notes: [...(item.notes ?? []), { id: crypto.randomUUID(), kind: "thought", content: comment.content, reference: `访客旁注 · ${comment.author?.displayName ?? "无名访客"}`, createdAt: new Date().toISOString() }] } : item))} /></article>;
}
