import type { Metadata } from "next";
import { Cinzel, Crimson_Text } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-crimson-text",
  display: "swap",
});

export const metadata: Metadata = {
  title: "拾染randi · 书影私藏魔法录",
  description: "拾染randi 的书、影视与羁绊私藏档案。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${cinzel.variable} ${crimsonText.variable}`}>
      <body>
        <div className="site-shell">
          <header className="site-header">
            <a className="site-brand" href="#top" aria-label="返回卷首">
              <span className="site-brand__sigil" aria-hidden="true">R</span>
              <span>
                <strong>拾染randi</strong>
                <small>PRIVATE ARCANE ARCHIVE</small>
              </span>
            </a>
            <nav className="site-nav" aria-label="主导航">
              <a href="#book">书录</a>
              <a href="#film">影像</a>
              <a href="#cp">羁绊</a>
            </nav>
          </header>

          <main>{children}</main>

          <footer className="site-footer">
            <span>此卷由 拾染randi 私藏与编录</span>
            <span aria-hidden="true">✦</span>
            <span>EST. MMXXVI</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
