"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { hasValidAccess } from "../components/EnvelopeCover";
import { ArchiveDataProvider } from "@/components/ArchiveDataProvider";
import MagicParticles from "@/components/MagicParticles";
import AdminPanel from "@/components/AdminPanel";
import GlobalSearch from "@/components/GlobalSearch";
import { MailboxProvider } from "@/components/MailboxProvider";
import QuickCapture from "@/components/QuickCapture";
import MemoryStarMap from "@/components/MemoryStarMap";
import { ArchiveSocialProvider } from "@/components/ArchiveSocialProvider";
import NotificationDrawer from "@/components/NotificationDrawer";

export default function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [secret, setSecret] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [footerClicks, setFooterClicks] = useState(0);
  useEffect(() => {
    const hasCloudInvitation = new URLSearchParams(window.location.search).has("invite");
    if (hasCloudInvitation || hasValidAccess()) setAuthorized(true);
    else router.replace("/");
  }, [router]);
  useEffect(() => {
    const openAdmin = () => setAdminOpen(true);
    const shortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "e") { event.preventDefault(); setAdminOpen(true); }
    };
    window.addEventListener("open-randi-admin", openAdmin);
    window.addEventListener("keydown", shortcut);
    return () => { window.removeEventListener("open-randi-admin", openAdmin); window.removeEventListener("keydown", shortcut); };
  }, []);
  if (!authorized) return <main className="route-guard" aria-label="正在验证邀请函"><span className="checking-rune" aria-hidden="true">R</span><p>正在查验邀请函……</p></main>;
  return <ArchiveDataProvider><ArchiveSocialProvider><MailboxProvider><div className="archive-shell"><MagicParticles /><Navbar /><main className="archive-main">{children}</main><footer className="archive-footer"><button type="button" onClick={() => { const count = footerClicks + 1; setFooterClicks(count); if (count >= 5) { setSecret(true); setFooterClicks(0); } }} aria-label="拾染randi 编制，连续点击五次有隐藏咒语">拾染randi 编制</button><i aria-hidden="true">✦</i><span>建站日期 · 2026.08</span></footer>{secret ? <div className="secret-spell secret-spell--burst" role="status" onClick={() => setSecret(false)}><span>✦</span><p>EXPECTO PATRONUM · 愿珍藏的故事永远为你点灯。</p><small>轻触收起</small></div> : null}<QuickCapture /><MemoryStarMap /><GlobalSearch /><NotificationDrawer /><AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} /></div></MailboxProvider></ArchiveSocialProvider></ArchiveDataProvider>;
}
