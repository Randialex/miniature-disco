import Link from "next/link";
import type { Cp } from "@/types";
import RatingStars from "./RatingStars";

export default function CpCard({ cp, compact = false }: { cp: Cp; compact?: boolean }) {
  return (
    <Link className={`archive-card cp-card${compact ? " archive-card--compact" : ""}`} href={`/cp/${cp.id}`}>
      <div className="bond-sigil" style={{ "--art-tone": cp.tone } as React.CSSProperties} aria-hidden="true">
        <span>{cp.monogram}</span><i />
      </div>
      <div className="archive-card__body">
        <span className="archive-card__index">VINCULUM · {cp.startDate.slice(0, 4)}</span>
        <h3>{cp.name}</h3>
        <p>出处 · {cp.origin}</p>
        <RatingStars rating={cp.rating} />
        {!compact && <div className="tag-row"><span>入坑 {cp.startDate.replaceAll("-", ".")}</span></div>}
      </div>
    </Link>
  );
}
