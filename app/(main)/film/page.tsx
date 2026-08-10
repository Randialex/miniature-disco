"use client";

import { useState } from "react";
import ArchiveFilters from "@/components/ArchiveFilters";
import FilmEditor from "@/components/FilmEditor";
import { useArchiveData } from "@/components/ArchiveDataProvider";

export default function FilmPage() {
  const { films, saveFilms } = useArchiveData();
  const [editing, setEditing] = useState(false);
  return <section className="collection-page collection-page--film">
    <header className="collection-header">
      <p className="page-eyebrow">IMAGO · THE VIOLET CABINET</p><span className="collection-header__sigil">影</span>
      <h1 onDoubleClick={() => setEditing(true)} title="影像">影　像</h1><p>银幕暗下之后，仍有某一帧光停驻在记忆深处。</p>
    </header>
    <ArchiveFilters kind="film" items={films} />
    {editing ? <FilmEditor films={films} onClose={() => setEditing(false)} onCommit={saveFilms} /> : null}
  </section>;
}
