import ArchiveFilters from "@/components/ArchiveFilters";
import { films } from "@/data/films";

export default function FilmPage() {
  return (
    <section className="collection-page collection-page--film">
      <header className="collection-header">
        <p className="page-eyebrow">IMAGO · THE VIOLET CABINET</p><span className="collection-header__sigil">影</span>
        <h1>影　像</h1><p>银幕暗下之后，仍有某一帧光停驻在记忆深处。</p>
      </header>
      <ArchiveFilters kind="film" items={films} />
    </section>
  );
}
