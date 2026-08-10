"use client";

import { useMemo, useState } from "react";
import type { Book, Film } from "@/types";
import BookCard from "./BookCard";
import FilmCard from "./FilmCard";

type FilterItem = Book | Film;

interface ArchiveFiltersProps {
  kind: "book" | "film";
  items: FilterItem[];
}

export default function ArchiveFilters({ kind, items }: ArchiveFiltersProps) {
  const [genre, setGenre] = useState("全部");
  const [minimum, setMinimum] = useState(0);
  const genres = useMemo(() => ["全部", ...Array.from(new Set(items.flatMap((item) => item.genres)))], [items]);
  const filtered = items.filter((item) => (genre === "全部" || item.genres.includes(genre)) && item.rating >= minimum);

  return (
    <>
      <div className="filter-bar" aria-label="内容筛选">
        <label>
          <span>类型</span>
          <select value={genre} onChange={(event) => setGenre(event.target.value)}>
            {genres.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>评分</span>
          <select value={minimum} onChange={(event) => setMinimum(Number(event.target.value))}>
            <option value={0}>全部评分</option>
            <option value={4}>4.0 分以上</option>
            <option value={4.5}>4.5 分以上</option>
            <option value={5}>仅 5.0 分</option>
          </select>
        </label>
        <p><strong>{filtered.length}</strong> / {items.length} 卷已显影</p>
      </div>
      <div className="archive-grid">
        {filtered.map((item) => kind === "book"
          ? <BookCard key={item.id} book={item as Book} />
          : <FilmCard key={item.id} film={item as Film} />)}
      </div>
      {filtered.length === 0 && <p className="empty-state">当前筛选下没有档案，试着放宽一点条件。</p>}
    </>
  );
}
