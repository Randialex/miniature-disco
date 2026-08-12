"use client";

import { Suspense, useState } from "react";
import ArchiveFilters from "@/components/ArchiveFilters";
import BookEditor from "@/components/BookEditor";
import { useArchiveData } from "@/components/ArchiveDataProvider";

export default function BookPage() {
  const { books, saveBooks } = useArchiveData();
  const [editing, setEditing] = useState(false);
  return <section className="collection-page collection-page--book">
    <header className="collection-header">
      <p className="page-eyebrow">LIBRIS · THE BLUE CABINET</p><span className="collection-header__sigil">书</span>
      <h1 onDoubleClick={() => setEditing(true)} title="双击管理书录">书　录</h1><p>在字句与纸页之间，收藏那些曾改变目光的世界。</p>
      <button className="archive-manage archive-manage--book" type="button" onClick={() => setEditing(true)}><span aria-hidden="true">✦</span><b>管理书录</b><small>新增 · 编辑 · 删除</small></button>
    </header>
    <Suspense fallback={<p className="detail-loading">正在展开筛选卷轴……</p>}><ArchiveFilters kind="book" items={books} /></Suspense>
    {editing ? <BookEditor books={books} onClose={() => setEditing(false)} onCommit={saveBooks} /> : null}
  </section>;
}
