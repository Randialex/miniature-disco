"use client";

import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export default function CloudAuthGate({ supabase, unavailable = false }: { supabase?: SupabaseClient<Database>; unavailable?: boolean }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(unavailable ? "Supabase 环境尚未配置，请补全云端地址和公开密钥。" : "输入邮箱，猫头鹰会送来一次性登录链接。");

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setBusy(true);
    setMessage("正在寄出登录信函……");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
        data: { display_name: "拾染randi" },
      },
    });
    setBusy(false);
    setMessage(error ? `登录信函寄送失败：${error.message}` : "登录链接已寄出，请在同一浏览器中打开邮件完成验证。");
  }

  return <main className="cloud-auth-gate">
    <section className="cloud-auth-letter" aria-labelledby="cloud-auth-title">
      <span className="cloud-auth-seal" aria-hidden="true">SR</span>
      <p className="page-eyebrow">PRIVATE CLOUD ARCHIVE · SUPABASE</p>
      <h1 id="cloud-auth-title">开启云端档案</h1>
      <p>邀请函负责仪式，邮箱身份负责真正的隐私。登录后，书籍、影像、羁绊与猫头鹰来信都会从私人云端读取。</p>
      {!unavailable ? <form className="cloud-login" onSubmit={sendLink}>
        <label htmlFor="archive-cloud-email">登录邮箱</label>
        <div><input id="archive-cloud-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /><button type="submit" disabled={busy}>{busy ? "寄送中…" : "寄出登录信"}</button></div>
      </form> : null}
      <div className={`cloud-sync-status${unavailable ? " cloud-sync-status--error" : ""}`} role="status">{message}</div>
      <small>登录采用一次性 Magic Link，不会在网站中保存邮箱密码。</small>
    </section>
  </main>;
}
