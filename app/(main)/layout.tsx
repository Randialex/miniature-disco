"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { hasValidAccess } from "../components/EnvelopeCover";
import { ArchiveDataProvider } from "@/components/ArchiveDataProvider";
import MagicParticles from "@/components/MagicParticles";

export default function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [secret, setSecret] = useState(false);
  useEffect(() => { if (!hasValidAccess()) router.replace("/"); else setAuthorized(true); }, [router]);
  if (!authorized) return <main className="route-guard" aria-label="正在验证邀请函"><span className="checking-rune" aria-hidden="true">R</span><p>正在查验邀请函……</p></main>;
  return <ArchiveDataProvider><div className="archive-shell"><MagicParticles /><Navbar /><main className="archive-main">{children}</main><footer className="archive-footer"><button type="button" onDoubleClick={() => setSecret(true)} aria-label="拾染randi 编制，双击有隐藏咒语">拾染randi 编制</button><i aria-hidden="true">✦</i><span>建站日期 · 2026.08</span></footer>{secret ? <div className="secret-spell" role="status" onClick={() => setSecret(false)}><span>✦</span><p>愿你珍藏的故事，在无月之夜仍为你点灯。</p><small>轻触收起</small></div> : null}</div></ArchiveDataProvider>;
}
