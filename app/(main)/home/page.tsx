"use client";

import Link from "next/link";
import { useArchiveData } from "@/components/ArchiveDataProvider";

export default function HomePage() {
  const { books, films, cps } = useArchiveData();
  const portals = [
    { href: "/book", tone: "book", numeral: "I", name: "书　录", latin: "LIBRIS", copy: "收存读过的世界，与合卷后仍未熄灭的句子。", count: books.length },
    { href: "/film", tone: "film", numeral: "II", name: "影　像", latin: "IMAGO", copy: "重访银幕与荧屏里，那些被光写下的梦境。", count: films.length },
    { href: "/cp", tone: "cp", numeral: "III", name: "羁　绊", latin: "VINCULUM", copy: "记录人物之间隐秘、危险而恒久的引力。", count: cps.length },
  ];
  return <div className="home-page">
    <section className="hero-gothic"><div className="hero-gothic__copy"><p className="page-eyebrow">CABINET OF PRIVATE WONDERS · MMXXVI</p><h1>故事落幕之后，<br /><em>余韵在此长眠。</em></h1><p>一座收藏书页、光影与羁绊的私人档案馆。循着烛火前行，每一扇门后，都有一段仍在呼吸的记忆。</p><Link href="/timeline" className="gothic-button">翻阅时光轴 <span>→</span></Link></div><div className="hero-illustration" aria-label="魔法档案馆哥特式窗景"><div className="hero-illustration__moon" /><div className="hero-illustration__window"><i /><span>R</span><i /></div><div className="hero-illustration__raven">◆</div><p>THE ARCHIVE<br />REMEMBERS</p></div></section>
    <section className="portal-section" aria-labelledby="portal-title"><div className="section-heading"><span>✦</span><p>THREE SEALED CABINETS</p><h2 id="portal-title">三大私藏分区</h2></div><div className="portal-grid">{portals.map((portal) => <Link key={portal.href} href={portal.href} className={`portal-card portal-card--${portal.tone}`}><span className="portal-card__numeral">{portal.numeral}</span><small>{portal.latin}</small><h3>{portal.name}</h3><p>{portal.copy}</p><div><span>已藏 {portal.count} 卷</span><i>ENTER　→</i></div></Link>)}</div></section>
    <section className="archive-stats" aria-label="档案数据概览"><div><span>累计藏书</span><strong>{String(books.length).padStart(2, "0")}</strong><small>VOLUMES</small></div><i>✦</i><div><span>累计观影</span><strong>{String(films.length).padStart(2, "0")}</strong><small>PICTURES</small></div><i>✦</i><div><span>羁绊对数</span><strong>{String(cps.length).padStart(2, "0")}</strong><small>BONDS</small></div></section>
    <p className="home-colophon">拾染randi 编制 · 建站于二〇二六年八月</p>
  </div>;
}
