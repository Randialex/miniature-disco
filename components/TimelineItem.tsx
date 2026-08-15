import Link from "next/link";
import type { TimelineEvent } from "@/types";

const labels = { book: "读书", film: "观影", cp: "入坑 CP" };

export default function TimelineItem({ event, index }: { event: TimelineEvent; index: number }) {
  return (
    <article className={`timeline-item timeline-item--${event.kind}${index % 2 ? " timeline-item--right" : ""}`}>
      <span className="timeline-item__dot" aria-hidden="true" />
      <Link href={event.href} className="timeline-item__card">
        <time dateTime={event.date}>{event.date.replaceAll("-", " · ")}</time>
        <span className="timeline-item__kind">{labels[event.kind]}</span>
        <h2>{event.title}</h2>
        <p>{event.note}</p>
        <span className="timeline-item__link">开启档案　→</span>
      </Link>
    </article>
  );
}
