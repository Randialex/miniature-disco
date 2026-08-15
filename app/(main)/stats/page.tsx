"use client";

import { useRef } from "react";
import StatsDashboard from "@/components/StatsDashboard";

export default function StatsPage() {
  const clicks = useRef<number[]>([]);
  const openOnTripleClick = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((time) => now - time < 900), now];
    if (clicks.current.length >= 3) { clicks.current = []; window.dispatchEvent(new Event("open-randi-admin")); }
  };
  return <section className="collection-page collection-page--stats"><header className="collection-header"><p className="page-eyebrow">STATISTICA · THE ORACLE CHAMBER</p><span className="collection-header__sigil">数</span><h1 onClick={openOnTripleClick} title="统计录">统 计 录</h1><p>让每一次阅读、观影与心动，化作可被凝视的星轨。</p></header><StatsDashboard /></section>;
}
