"use client";

import Link from "next/link";
import type { Film } from "@/types";
import RatingStars from "./RatingStars";
import { EntryMeta } from "./EntryMeta";
import { useArchiveAssetUrl } from "./ArchiveAssetField";

export default function FilmCard({ film, compact = false }: { film: Film; compact?: boolean }) {
  const posterUrl = useArchiveAssetUrl(film.asset, film.posterUrl);
  return (
    <Link className={`archive-card film-card${compact ? " archive-card--compact" : ""}`} href={`/film/${film.id}`}>
      <div className={`cover-art cover-art--film${posterUrl ? " cover-art--image" : ""}`} style={{ "--art-tone": film.posterTone, backgroundImage: posterUrl ? `linear-gradient(rgba(5,6,10,${(film.asset?.overlay ?? 35) / 100}),rgba(5,6,10,.5)),url("${posterUrl}")` : undefined, backgroundPosition: film.asset ? `${film.asset.focusX}% ${film.asset.focusY}%` : undefined } as React.CSSProperties} role="img" aria-label={film.asset?.altText || `${film.title}海报`}>
        <span className="cover-art__halo" aria-hidden="true" />
        <span className="cover-art__monogram" aria-hidden="true">{film.monogram}</span>
        <small>MOVING PICTURE</small>
      </div>
      <div className="archive-card__body">
        <span className="archive-card__index">IMAGO · {film.year}</span>
        <h3>{film.title}</h3>
        <p>{film.originalTitle ?? `${film.year} 年`}</p>
        <RatingStars rating={film.rating} />
        <EntryMeta kind="film" status={film.status} progress={film.progress} />
        <div className="tag-row">{film.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
      </div>
    </Link>
  );
}
