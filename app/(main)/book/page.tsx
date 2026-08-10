"use client";

import { useState } from "react";
import ArchiveFilters from "@/components/ArchiveFilters";
import BookEditor from "@/components/BookEditor";
import { useArchiveData } from "@/components/ArchiveDataProvider";

export default function BookPage() {
  const { books, saveBooks } = useArchiveData();
  const [editing, setEditing] = useState(false);
  return <section className="collection-page collection-page--book">
    <header className="collection-header">
      <p className="page-eyebrow">LIBRIS · THE BLUE CABINET</p><span className="collection-header__sigil">书</span>
      <h1 onDoubleClick={() => setEditing(true)} title="书录">书　录</h1><p>在字句与纸页之间，收藏那些曾改变目光的世界。</p>
    </header>
    <ArchiveFilters kind="book" items={books} />
    {editing ? <BookEditor books={books} onClose={() => setEditing(false)} onCommit={saveBooks} /> : null}
  </section>;
}
