import ArchiveFilters from "@/components/ArchiveFilters";
import { books } from "@/data/books";

export default function BookPage() {
  return (
    <section className="collection-page collection-page--book">
      <header className="collection-header">
        <p className="page-eyebrow">LIBRIS · THE BLUE CABINET</p><span className="collection-header__sigil">书</span>
        <h1>书　录</h1><p>在字句与纸页之间，收藏那些曾改变目光的世界。</p>
      </header>
      <ArchiveFilters kind="book" items={books} />
    </section>
  );
}
