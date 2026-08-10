import type { Metadata } from "next";
import { Cinzel, Crimson_Text, Noto_Serif_SC } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cinzel", display: "swap" });
const crimsonText = Crimson_Text({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-crimson-text", display: "swap" });
const notoSerif = Noto_Serif_SC({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-noto-serif", display: "swap" });

export const metadata: Metadata = { title: "拾染randi · 书影私藏魔法录", description: "拾染randi 的书、影像与羁绊私人魔法档案。" };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return <html lang="zh-CN" className={`${cinzel.variable} ${crimsonText.variable} ${notoSerif.variable}`}><body>{children}</body></html>; }
