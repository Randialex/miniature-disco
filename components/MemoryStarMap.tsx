"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useArchiveData } from "./ArchiveDataProvider";

type NodeKind = "book" | "film" | "cp";
type StarNode = { id: string; kind: NodeKind; title: string; subtitle: string; href: string; x: number; y: number; relations: string[] };

function hash(value: string) { return Array.from(value).reduce((total, char) => (total * 33 + char.charCodeAt(0)) >>> 0, 5381); }

export default function MemoryStarMap() {
  const [open, setOpen] = useState(false);
  const { canEdit } = useArchiveData();
  return <>
    <button className={`star-map-button${canEdit ? "" : " star-map-button--solo"}`} type="button" onClick={() => setOpen(true)} aria-label="打开记忆星图"><span>✦</span><small>记忆星图</small></button>
    {open ? <StarMapOverlay onClose={() => setOpen(false)} /> : null}
  </>;
}

function useStarNodes(): StarNode[] {
  const { books, films, cps } = useArchiveData();
  return useMemo(() => {
    const raw = [
      ...books.map((item) => ({ id: `book:${item.id}`, kind: "book" as const, title: item.title, subtitle: item.author, href: `/book/${item.id}`, relations: [...(item.filmIds ?? []).map((id) => `film:${id}`), ...(item.cpIds ?? []).map((id) => `cp:${id}`)] })),
      ...films.map((item) => ({ id: `film:${item.id}`, kind: "film" as const, title: item.title, subtitle: item.originalTitle ?? String(item.year), href: `/film/${item.id}`, relations: [...(item.bookIds ?? []).map((id) => `book:${id}`), ...(item.cpIds ?? []).map((id) => `cp:${id}`)] })),
      ...cps.map((item) => ({ id: `cp:${item.id}`, kind: "cp" as const, title: item.name, subtitle: item.origin, href: `/cp/${item.id}`, relations: [...(item.bookIds ?? []).map((id) => `book:${id}`), ...(item.filmIds ?? []).map((id) => `film:${id}`)] })),
    ];
    return raw.map((node, index) => {
      const seed = hash(node.id); const ring = 20 + (index % 4) * 8; const angle = (seed % 360) * Math.PI / 180;
      return { ...node, x: Math.max(8, Math.min(92, 50 + Math.cos(angle) * ring)), y: Math.max(10, Math.min(88, 50 + Math.sin(angle) * ring)) };
    });
  }, [books, films, cps]);
}

function StarMapOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const nodes = useStarNodes();
  const [filters, setFilters] = useState<NodeKind[]>(["book", "film", "cp"]);
  const [selected, setSelected] = useState<StarNode | null>(null);
  const visible = nodes.filter((node) => filters.includes(node.kind));
  const highlighted = selected ? new Set([selected.id, ...selected.relations]) : null;
  const toggle = (kind: NodeKind) => setFilters((value) => value.includes(kind) ? value.filter((item) => item !== kind) : [...value, kind]);
  return <div className="star-map-overlay" role="dialog" aria-modal="true" aria-label="记忆星图">
    <header><div><small>MNEMOSYNE CONSTELLATION</small><h2>记忆星图</h2><p>每一条关系，都是发现下一段故事时留下的引力。</p></div><button type="button" onClick={onClose} aria-label="关闭星图">×</button></header>
    <div className="star-map-tools"><span>筛选星体</span><button className={filters.includes("book") ? "is-active" : ""} onClick={() => toggle("book")} type="button">● 书籍</button><button className={filters.includes("film") ? "is-active" : ""} onClick={() => toggle("film")} type="button">● 影视</button><button className={filters.includes("cp") ? "is-active" : ""} onClick={() => toggle("cp")} type="button">● CP 双星</button></div>
    <div className="star-map-canvas">
      <div className="star-nebula star-nebula--one" /><div className="star-nebula star-nebula--two" />
      {visible.flatMap((node) => node.relations.filter((target) => visible.some((item) => item.id === target) && node.id < target).map((target) => { const end = visible.find((item) => item.id === target)!; const dx = end.x - node.x; const dy = end.y - node.y; const length = Math.sqrt(dx * dx + dy * dy); const angle = Math.atan2(dy, dx) * 180 / Math.PI; return <i className={`star-link${highlighted && highlighted.has(node.id) && highlighted.has(target) ? " is-active" : ""}`} key={`${node.id}:${target}`} style={{ left: `${node.x}%`, top: `${node.y}%`, width: `${length}%`, transform: `rotate(${angle}deg)` }} />; }))}
      {visible.map((node) => <button key={node.id} type="button" className={`star-node star-node--${node.kind}${selected?.id === node.id ? " is-selected" : ""}${highlighted && !highlighted.has(node.id) ? " is-dim" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => setSelected(node)} onDoubleClick={() => router.push(node.href)}><span>{node.kind === "book" ? "书" : node.kind === "film" ? "影" : "∞"}</span><b>{node.title}</b></button>)}
      {!visible.length ? <p className="star-map-empty">至少点亮一种星体。</p> : null}
    </div>
    <aside className={selected ? "is-open" : ""}>{selected ? <><small>{selected.kind.toUpperCase()} · {selected.relations.length} 条一度关系</small><h3>{selected.title}</h3><p>{selected.subtitle || "这颗星尚未留下副标题。"}</p><Link href={selected.href} onClick={onClose}>进入档案详情　→</Link></> : <p>单击星体查看摘要，双击直接进入档案。节点稳定后不会持续晃动。</p>}</aside>
    <details className="star-map-list"><summary>使用关系列表浏览</summary>{visible.map((node) => <Link href={node.href} onClick={onClose} key={node.id}><span>{node.kind === "book" ? "书" : node.kind === "film" ? "影" : "契"}</span><b>{node.title}</b><small>{node.relations.length} 条关系</small></Link>)}</details>
  </div>;
}

export function ArchiveNeighborhood({ currentId }: { currentId: string }) {
  const nodes = useStarNodes();
  const current = nodes.find((node) => node.id.endsWith(`:${currentId}`));
  if (!current || !current.relations.length) return null;
  const related = nodes.filter((node) => current.relations.includes(node.id));
  return <section className="archive-neighborhood"><div className="module-title"><small>LOCAL CONSTELLATION</small><h2>这份档案周围</h2></div><div><span className={`neighbor-core neighbor-core--${current.kind}`}>{current.kind === "book" ? "书" : current.kind === "film" ? "影" : "∞"}<b>{current.title}</b></span>{related.map((node) => <Link className={`neighbor-star neighbor-star--${node.kind}`} href={node.href} key={node.id}><span>{node.kind === "book" ? "书" : node.kind === "film" ? "影" : "契"}</span><b>{node.title}</b></Link>)}</div></section>;
}
