"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { hasValidAccess } from "../components/EnvelopeCover";

export default function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!hasValidAccess()) {
      router.replace("/");
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    return (
      <main className="route-guard" aria-label="正在验证邀请函">
        <span className="checking-rune" aria-hidden="true">R</span>
        <p>正在查验邀请函……</p>
      </main>
    );
  }

  return (
    <div className="archive-shell">
      <Navbar />
      <main className="archive-main">{children}</main>
      <footer className="archive-footer"><span>拾染randi · 私藏魔法录</span><i aria-hidden="true">✦</i><span>EST. MMXXVI</span></footer>
    </div>
  );
}
