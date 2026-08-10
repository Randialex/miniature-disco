"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  { href: "/home", label: "主页", tone: "home" },
  { href: "/book", label: "书录", tone: "book" },
  { href: "/film", label: "影像", tone: "film" },
  { href: "/cp", label: "羁绊", tone: "cp" },
  { href: "/timeline", label: "时光轴", tone: "timeline" },
  { href: "/stats", label: "统计录", tone: "stats" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 18);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`navbar${scrolled ? " navbar--scrolled" : ""}`}>
      <Link className="navbar__brand" href="/home" aria-label="拾染randi主页">
        <span className="navbar__sigil" aria-hidden="true">R</span>
        <span><strong>拾染randi</strong><small>ARCANE ARCHIVE</small></span>
      </Link>

      <button
        className={`navbar__toggle${menuOpen ? " navbar__toggle--open" : ""}`}
        type="button"
        aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span /><span /><span />
      </button>

      <nav id="main-navigation" className={`navbar__links${menuOpen ? " navbar__links--open" : ""}`} aria-label="全局导航">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link nav-link--${item.tone}${(pathname === item.href || pathname.startsWith(`${item.href}/`)) ? " nav-link--active" : ""}`}
            onClick={() => setMenuOpen(false)}
            aria-current={(pathname === item.href || pathname.startsWith(`${item.href}/`)) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
