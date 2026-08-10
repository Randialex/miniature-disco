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
      <h1 onDoubleClick={() => setEditing(true)} title="双击管理影像">影　像</h1><p>银幕暗下之后，仍有某一帧光停驻在记忆深处。</p>
      <button className="archive-manage archive-manage--film" type="button" onClick={() => setEditing(true)}><span aria-hidden="true">✦</span><b>管理影像</b><small>新增 · 编辑 · 删除</small></button>
    </header>
    <ArchiveFilters kind="film" items={films} />
    {editing ? <FilmEditor films={films} onClose={() => setEditing(false)} onCommit={saveFilms} /> : null}
  </section>;
}
