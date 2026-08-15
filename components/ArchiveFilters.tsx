"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Book, Film } from "@/types";
import BookCard from "./BookCard";
import FilmCard from "./FilmCard";

type FilterItem = Book | Film;
type SortMode = "date-desc" | "date-asc" | "rating" | "name";

interface ArchiveFiltersProps { kind: "book" | "film"; items: FilterItem[] }

export default function ArchiveFilters({ kind, items }: ArchiveFiltersProps) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const sortKey = `randi-sort-${kind}`;
  const [expanded, setExpanded] = useState(true);
  const [genre, setGenre] = useState(() => searchParams.get("tag") ?? "全部");
  const [minimum, setMinimum] = useState(() => Number(searchParams.get("rating") ?? 0));
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "全部");
  const [year, setYear] = useState(() => searchParams.get("year") ?? "全部");
  const [sort, setSort] = useState<SortMode>("date-desc");
  useEffect(() => { const saved = localStorage.getItem(sortKey) as SortMode | null; if (saved) setSort(saved); }, [sortKey]);
  useEffect(() => {
    const params = new URLSearchParams();
    if (genre !== "全部") params.set("tag",genre); if (minimum) params.set("rating",String(minimum)); if (status !== "全部") params.set("status",status); if (year !== "全部") params.set("year",year);
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll:false });
  }, [genre, minimum, pathname, router, status, year]);
  const genres = useMemo(() => ["全部", ...Array.from(new Set(items.flatMap((item) => item.genres)))], [items]);
  const years = useMemo<string[]>(() => ["全部", ...Array.from(new Set<string>(items.map((item) => kind === "book" ? (item as Book).readDate.slice(0,4) : (item as Film).watchDate.slice(0,4)))).sort().reverse()], [items,kind]);
  const filtered = useMemo(() => items.filter((item) => {
    const itemStatus = item.status ?? "completed"; const itemYear = kind === "book" ? (item as Book).readDate.slice(0,4) : (item as Film).watchDate.slice(0,4);
    return (genre === "全部" || item.genres.includes(genre)) && item.rating >= minimum && (status === "全部" || itemStatus === status) && (year === "全部" || itemYear === year);
  }).slice().sort((a,b) => {
    const dateA = kind === "book" ? (a as Book).readDate : (a as Film).watchDate; const dateB = kind === "book" ? (b as Book).readDate : (b as Film).watchDate;
    if(sort === "rating") return b.rating-a.rating; if(sort === "name") return ("title" in a?a.title:"").localeCompare("title" in b?b.title:"","zh-CN"); return sort === "date-asc" ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
  }), [genre,items,kind,minimum,sort,status,year]);
  const setSortMode = (value:SortMode) => { setSort(value); localStorage.setItem(sortKey,value); };

  return <><div className="advanced-filters"><button className="filter-disclosure" type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>多维筛选 <span>{expanded ? "收起 −" : "展开 +"}</span></button>{expanded ? <div className="filter-bar" aria-label="内容筛选"><label><span>状态</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option>全部</option><option value="planned">计划</option><option value="active">进行中</option><option value="completed">已完成</option><option value="paused">搁置</option><option value="dropped">弃坑/暂退</option></select></label><label><span>评分</span><select value={minimum} onChange={(e) => setMinimum(Number(e.target.value))}><option value={0}>全部评分</option><option value={4}>4.0 分以上</option><option value={4.5}>4.5 分以上</option><option value={5}>仅 5.0 分</option></select></label><label><span>标签</span><select value={genre} onChange={(e) => setGenre(e.target.value)}>{genres.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>年份</span><select value={year} onChange={(e) => setYear(e.target.value)}>{years.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>排序</span><select value={sort} onChange={(e) => setSortMode(e.target.value as SortMode)}><option value="date-desc">完成时间倒序</option><option value="date-asc">完成时间正序</option><option value="rating">评分优先</option><option value="name">名称排序</option></select></label><p><strong>{filtered.length}</strong> / {items.length} 卷已显影</p></div> : null}</div><div className="archive-grid">{filtered.map((item) => kind === "book" ? <BookCard key={item.id} book={item as Book} /> : <FilmCard key={item.id} film={item as Film} />)}</div>{!filtered.length ? <p className="empty-state">当前筛选下没有档案，试着放宽一点条件。</p> : null}</>;
}
