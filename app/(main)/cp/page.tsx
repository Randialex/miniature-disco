"use client";

import { useState } from "react";
import CpCard from "@/components/CpCard";
import CpEditor from "@/components/CpEditor";
import { useArchiveData } from "@/components/ArchiveDataProvider";

export default function CpPage() {
  const { cps, saveCps } = useArchiveData();
  const [editing, setEditing] = useState(false);
  return <section className="collection-page collection-page--cp">
    <header className="collection-header">
      <p className="page-eyebrow">VINCULUM · THE VERDANT CABINET</p><span className="collection-header__sigil">绊</span>
      <h1 onDoubleClick={() => setEditing(true)} title="羁绊">羁　绊</h1><p>两颗星相互牵引，从此改变彼此故事的轨迹。</p>
    </header>
    <div className="archive-grid archive-grid--cp">{cps.map((cp) => <CpCard key={cp.id} cp={cp} />)}</div>
    {editing ? <CpEditor cps={cps} onClose={() => setEditing(false)} onCommit={saveCps} /> : null}
  </section>;
}
