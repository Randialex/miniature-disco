import type { Metadata } from "next";
import { Cinzel, Crimson_Text, Noto_Serif_SC } from "next/font/google";
import type { ReactNode } from "react";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cinzel", display: "swap" });
const crimsonText = Crimson_Text({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-crimson-text", display: "swap" });
const notoSerif = Noto_Serif_SC({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-noto-serif", display: "swap" });

export const metadata: Metadata = { title: "拾染randi · 书影私藏魔法录", description: "拾染randi 的书、影像与羁绊私人魔法档案。" };

const themeBootstrap = `(function(){try{var m=localStorage.getItem('site_theme')||'system';var d=m==='system'?matchMedia('(prefers-color-scheme: dark)').matches:m==='dark';document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.dataset.motion=localStorage.getItem('site_complex_motion')==='false'?'reduced':'full'}catch(e){document.documentElement.dataset.theme='dark';document.documentElement.dataset.motion='full'}})()`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="zh-CN" data-theme="dark" data-motion="full" suppressHydrationWarning className={`${cinzel.variable} ${crimsonText.variable} ${notoSerif.variable}`}><body><Script id="theme-bootstrap" strategy="beforeInteractive">{themeBootstrap}</Script><ThemeProvider>{children}</ThemeProvider></body></html>;
}
