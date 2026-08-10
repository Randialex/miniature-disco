import Link from "next/link";
import type { Book } from "@/types";
import RatingStars from "./RatingStars";

export default function BookCard({ book, compact = false }: { book: Book; compact?: boolean }) {
  return (
    <Link className={`archive-card book-card${compact ? " archive-card--compact" : ""}`} href={`/book/${book.id}`}>
      <div className={`cover-art cover-art--book${book.coverUrl ? " cover-art--image" : ""}`} style={{ "--art-tone": book.coverTone, backgroundImage: book.coverUrl ? `linear-gradient(rgba(5,6,10,.2),rgba(5,6,10,.48)),url("${book.coverUrl}")` : undefined } as React.CSSProperties}>
        <span className="cover-art__corner" aria-hidden="true" />
        <span className="cover-art__monogram" aria-hidden="true">{book.monogram}</span>
        <small>PRIVATE EDITION</small>
      </div>
      <div className="archive-card__body">
        <span className="archive-card__index">LIBRIS · {book.readDate.slice(0, 4)}</span>
        <h3>{book.title}</h3>
        <p>{book.author}</p>
        <RatingStars rating={book.rating} />
        <div className="tag-row">{book.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
      </div>
    </Link>
  );
}
