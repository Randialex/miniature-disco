"use client";

import Link from "next/link";
import type { Book } from "@/types";
import RatingStars from "./RatingStars";
import { EntryMeta } from "./EntryMeta";
import { useArchiveAssetUrl } from "./ArchiveAssetField";

export default function BookCard({ book, compact = false }: { book: Book; compact?: boolean }) {
  const coverUrl = useArchiveAssetUrl(book.asset, book.coverUrl);
  return (
    <Link className={`archive-card book-card${compact ? " archive-card--compact" : ""}`} href={`/book/${book.id}`}>
      <div className={`cover-art cover-art--book${coverUrl ? " cover-art--image" : ""}`} style={{ "--art-tone": book.coverTone, backgroundImage: coverUrl ? `linear-gradient(rgba(5,6,10,${(book.asset?.overlay ?? 35) / 100}),rgba(5,6,10,.48)),url("${coverUrl}")` : undefined, backgroundPosition: book.asset ? `${book.asset.focusX}% ${book.asset.focusY}%` : undefined } as React.CSSProperties} role="img" aria-label={book.asset?.altText || `${book.title}封面`}>
        <span className="cover-art__corner" aria-hidden="true" />
        <span className="cover-art__monogram" aria-hidden="true">{book.monogram}</span>
        <small>PRIVATE EDITION</small>
      </div>
      <div className="archive-card__body">
        <span className="archive-card__index">LIBRIS · {book.readDate.slice(0, 4)}</span>
        <h3>{book.title}</h3>
        <p>{book.author}</p>
        <RatingStars rating={book.rating} />
        <EntryMeta kind="book" status={book.status} progress={book.progress} />
        <div className="tag-row">{book.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
      </div>
    </Link>
  );
}
