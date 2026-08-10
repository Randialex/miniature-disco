import TimelineItem from "@/components/TimelineItem";
import { books } from "@/data/books";
import { films } from "@/data/films";
import { cps } from "@/data/cps";
import type { TimelineEvent } from "@/types";

const events: TimelineEvent[] = [
  ...books.map((book) => ({ id: book.id, kind: "book" as const, date: book.readDate, title: `读完《${book.title}》`, note: book.review, href: `/book/${book.id}` })),
  ...films.map((film) => ({ id: film.id, kind: "film" as const, date: film.watchDate, title: `看完《${film.title}》`, note: film.review, href: `/film/${film.id}` })),
  ...cps.map((cp) => ({ id: cp.id, kind: "cp" as const, date: cp.startDate, title: `入坑 ${cp.name}`, note: cp.summary, href: `/cp/${cp.id}` })),
].sort((a, b) => b.date.localeCompare(a.date));

export default function TimelinePage() {
  return (
    <section className="collection-page collection-page--timeline">
      <header className="collection-header">
        <p className="page-eyebrow">CHRONICA · A MEMORY IN GOLD</p><span className="collection-header__sigil">时</span>
        <h1>时 光 轴</h1><p>所有相遇按日期倒序封存，沿金色刻度重访曾经的心动。</p>
      </header>
      <div className="timeline-list">{events.map((event, index) => <TimelineItem key={`${event.kind}-${event.id}`} event={event} index={index} />)}</div>
    </section>
  );
}
