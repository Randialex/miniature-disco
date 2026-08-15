"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMailbox } from "./MailboxProvider";
import LetterCard from "./LetterCard";
import LetterComposer from "./LetterComposer";
import type { Letter } from "@/types/mailbox";

export default function MailboxDashboard() {
  const { loading, mailbox, member, members, letters, unreadCount, error, markRead, switchMember } = useMailbox();
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Letter | null>(null);
  const [filter, setFilter] = useState<"all" | "mine">("all");

  useEffect(() => {
    if (unreadCount > 0) void markRead();
  }, [markRead, unreadCount]);

  const roots = useMemo(() => letters.filter((item) => !item.parent_id && (filter === "all" || item.author_id === member?.user_id)), [filter, letters, member?.user_id]);
  const replies = useMemo(() => {
    const map = new Map<string, Letter[]>();
    for (const letter of letters) {
      if (!letter.parent_id) continue;
      const list = map.get(letter.parent_id) ?? [];
      list.push(letter);
      map.set(letter.parent_id, list);
    }
    return map;
  }, [letters]);

  if (loading) return <section className="mailbox-loading"><span className="checking-rune">🪶</span><p>正在从 Supabase 打开猫头鹰邮局……</p></section>;
  if (error && (!mailbox || !member)) return <section className="mailbox-unconfigured"><span className="owl-door-seal">!</span><p className="page-eyebrow">CLOUD OWL POST · CONNECTION ERROR</p><h1>云端邮局暂时无法开启</h1><p>{error}</p></section>;
  if (!mailbox || !member) return <section className="mailbox-loading"><span className="checking-rune">🪶</span><p>正在初始化私人云端邮局……</p></section>;

  const days = Math.max(1, Math.floor((Date.now() - new Date(mailbox.created_at).getTime()) / 86400000) + 1);
  return <div className="owl-post-page">
    <section className="owl-post-hero">
      <p className="page-eyebrow">SUPABASE OWL POST · PRIVATE REALTIME MAILBOX</p>
      <h1>哥 特 猫 头 鹰 留 言 墙</h1>
      <p>每一封信都由真实登录身份投递，在不同设备间同步，并通过私人邮局权限守护。</p>
      <div className="local-mailbox-notice" role="note"><b>云端模式</b><span>信件、回信、未读状态和心情反应均保存到 Supabase，并实时抵达另一位成员。</span></div>
      <div className="two-souls local-persona-selector" aria-label="云端邮局成员">
        {members.map((person, index) => <div key={person.user_id} className="local-persona-slot">
          <button className={person.user_id === member.user_id ? "is-active" : ""} type="button" onClick={() => switchMember(person.user_id)} aria-pressed={person.user_id === member.user_id} disabled={person.user_id !== member.user_id}>
            <span style={{ "--avatar-color": person.avatar_color } as CSSProperties}>{person.avatar_symbol}</span>
            <strong>{person.display_name}</strong>
            <small>{person.user_id === member.user_id ? "当前云端身份" : "邮局另一位成员"}</small>
          </button>
          {index === 0 && members.length > 1 ? <i aria-hidden="true">✦</i> : null}
        </div>)}
      </div>
      <div className="mailbox-stats"><div><strong>{roots.length}</strong><span>封留言</span></div><div><strong>{unreadCount}</strong><span>封未读</span></div><div><strong>{days}</strong><span>天收藏</span></div></div>
      <div className="owl-post-actions"><button className="owl-primary" type="button" onClick={() => { setReplyTo(null); setComposerOpen(true); }}>以 {member.display_name} 留下魔法信笺</button></div>
    </section>
    <section className="post-office-counter">
      <header><div><small>LETTERS KEPT IN THE PRIVATE CLOUD</small><h2>{mailbox.name}</h2></div><div className="letter-filters"><button className={filter === "all" ? "is-active" : ""} type="button" onClick={() => setFilter("all")}>全部来信</button><button className={filter === "mine" ? "is-active" : ""} type="button" onClick={() => setFilter("mine")}>我的寄件</button></div></header>
      {error ? <p className="owl-error" role="alert">{error}</p> : null}
      <div className="owl-letter-list">{roots.length ? roots.map((letter) => <LetterCard key={letter.id} letter={letter} replies={replies.get(letter.id) ?? []} onReply={(target) => { setReplyTo(target); setComposerOpen(true); }} />) : <div className="empty-owl-post"><span>🦉</span><h3>云端邮局还是空的</h3><p>写下第一封信，它会安全保存在 Supabase 私人邮局中。</p><button type="button" onClick={() => setComposerOpen(true)}>写下第一封信</button></div>}</div>
    </section>
    {composerOpen ? <LetterComposer replyTo={replyTo} onCancel={() => setComposerOpen(false)} onSent={() => { setComposerOpen(false); setReplyTo(null); }} /> : null}
  </div>;
}
