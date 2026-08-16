import Link from "next/link";

export default function NotFound() {
  return <section className="not-found"><span>404</span><h1>这卷档案尚未收录</h1><p>墨迹已经褪去，或许它仍在归档途中。</p><Link className="gothic-button" href="/home">返回档案馆</Link></section>;
}
