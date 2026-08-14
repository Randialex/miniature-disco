"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { useArchiveData } from "./ArchiveDataProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

type SyncPhase = "idle" | "sending-link" | "checking" | "migrating" | "success" | "error";

function downloadBackup(books: unknown[], films: unknown[], cps: unknown[]) {
  const exportedAt = new Date().toISOString();
  const content = JSON.stringify({
    format: "shiying-randi-backup",
    version: 1,
    exportedAt,
    reason: "before-supabase-migration",
    data: { books, films, cps },
  }, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `shiying-randi-before-cloud-${exportedAt.slice(0, 10).replaceAll("-", "")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CloudSyncPanel() {
  const { books, films, cps } = useArchiveData();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<SyncPhase>("checking");
  const [message, setMessage] = useState("正在检查云端身份……");
  const [cloudCount, setCloudCount] = useState<number | null>(null);
  const localCount = books.length + films.length + cps.length;

  const refreshCloudCount = useCallback(async (userId: string) => {
    const { count, error } = await supabase
      .from("archive_entries")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId);
    if (error) throw error;
    setCloudCount(count ?? 0);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (!active) return;
      if (error) {
        if (error.name === "AuthSessionMissingError" || error.message === "Auth session missing!") {
          setUser(null);
          setPhase("idle");
          setMessage("登录后才能把本地档案迁移到你的私人云端。");
          return;
        }
        setPhase("error");
        setMessage(`身份检查失败：${error.message}`);
        return;
      }
      setUser(data.user);
      setPhase("idle");
      setMessage(data.user ? "已连接 Supabase，可以安全迁移本地档案。" : "登录后才能把本地档案迁移到你的私人云端。 ");
      if (data.user) {
        try { await refreshCloudCount(data.user.id); }
        catch (countError) { setMessage(countError instanceof Error ? countError.message : "读取云端数量失败"); }
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (session?.user) void refreshCloudCount(session.user.id);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshCloudCount, supabase]);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setPhase("sending-link");
    setMessage("正在寄出登录魔法链接……");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
        data: { display_name: "拾染randi" },
      },
    });
    if (error) {
      setPhase("error");
      setMessage(`登录邮件发送失败：${error.message}`);
      return;
    }
    setPhase("idle");
    setMessage("登录链接已经寄出，请在同一浏览器打开邮件中的链接。");
  }

  async function migrateLocalArchive() {
    if (!user || phase === "migrating") return;
    downloadBackup(books, films, cps);
    setPhase("migrating");
    setMessage("备份已下载，正在把本地档案安全写入云端……");

    const rows = [
      ...books.map((item) => ({ owner_id: user.id, kind: "book" as const, legacy_id: item.id, title: item.title, event_date: item.readDate || null, rating: item.rating, payload: item as unknown as Json })),
      ...films.map((item) => ({ owner_id: user.id, kind: "film" as const, legacy_id: item.id, title: item.title, event_date: item.watchDate || null, rating: item.rating, payload: item as unknown as Json })),
      ...cps.map((item) => ({ owner_id: user.id, kind: "cp" as const, legacy_id: item.id, title: item.name, event_date: item.startDate || null, rating: item.rating, payload: item as unknown as Json })),
    ];

    for (let index = 0; index < rows.length; index += 100) {
      const { error } = await supabase
        .from("archive_entries")
        .upsert(rows.slice(index, index + 100), { onConflict: "owner_id,kind,legacy_id" });
      if (error) {
        setPhase("error");
        setMessage(`迁移中止：${error.message}。本地数据和下载的备份都未删除。`);
        return;
      }
    }

    const { data, error } = await supabase
      .from("archive_entries")
      .select("kind, legacy_id")
      .eq("owner_id", user.id);
    if (error) {
      setPhase("error");
      setMessage(`云端复核失败：${error.message}。本地数据仍然保留。`);
      return;
    }

    const remoteKeys = new Set((data ?? []).map((item) => `${item.kind}:${item.legacy_id}`));
    const missing = rows.filter((item) => !remoteKeys.has(`${item.kind}:${item.legacy_id}`));
    setCloudCount(data?.length ?? 0);
    if (missing.length) {
      setPhase("error");
      setMessage(`云端复核发现 ${missing.length} 条未匹配记录；本地数据保持不变，请重试。`);
      return;
    }

    window.localStorage.setItem("randi-supabase-migration-v1", JSON.stringify({
      migratedAt: new Date().toISOString(),
      userId: user.id,
      records: rows.length,
    }));
    setPhase("success");
    setMessage(`迁移并复核完成：${rows.length} 条本地档案已在云端找到。本地数据仍保留。`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setCloudCount(null);
    setPhase("idle");
    setMessage("已退出云端账号；本地档案不受影响。");
  }

  return <section className="cloud-sync-panel">
    <h3>Supabase 云端同步</h3>
    <p className="admin-lead">当前阶段只负责安全备份和迁移；网站仍从本地读取，不会用空云端覆盖你的内容。</p>
    <div className="cloud-counts" aria-label="本地与云端档案数量">
      <div><small>LOCAL ARCHIVE</small><strong>{localCount}</strong><span>本地档案</span></div>
      <i aria-hidden="true">→</i>
      <div><small>SUPABASE</small><strong>{cloudCount ?? "—"}</strong><span>云端档案</span></div>
    </div>
    {user ? <div className="cloud-account">
      <div><small>已登录</small><strong>{user.email ?? user.id}</strong></div>
      <button type="button" onClick={signOut}>退出云端</button>
    </div> : <form className="cloud-login" onSubmit={sendMagicLink}>
      <label htmlFor="cloud-email">登录邮箱</label>
      <div><input id="cloud-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /><button type="submit" disabled={phase === "sending-link"}>发送登录链接</button></div>
    </form>}
    <div className={`cloud-sync-status cloud-sync-status--${phase}`} role="status">{message}</div>
    {user ? <button className="wax-button cloud-migrate" type="button" disabled={phase === "migrating" || localCount === 0} onClick={migrateLocalArchive}>{phase === "migrating" ? "正在迁移与复核……" : "下载备份并迁移本地档案"}</button> : null}
    <ul className="cloud-safety-list"><li>迁移使用稳定的本地 ID，重复点击不会产生重复记录。</li><li>迁移成功后仍保留浏览器数据和下载的 JSON 备份。</li><li>下一阶段确认无误后，才会开启自动云同步。</li></ul>
  </section>;
}
