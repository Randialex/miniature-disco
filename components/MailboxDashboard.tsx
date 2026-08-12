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

  if (loading || !mailbox || !member) return <section className="mailbox-loading"><span className="checking-rune">🪶</span><p>正在翻开本地留言簿……</p></section>;

  const days = Math.max(1, Math.floor((Date.now() - new Date(mailbox.created_at).getTime()) / 86400000) + 1);
  return <div className="owl-post-page">
    <section className="owl-post-hero">
      <p className="page-eyebrow">LOCAL OWL POST · THIS BROWSER ONLY</p>
      <h1>哥 特 猫 头 鹰 留 言 墙</h1>
      <p>不登录，也不上云。来访的朋友可以选择署名，留下一封带着魔法印章的信。</p>
      <div className="local-mailbox-notice" role="note"><b>本地模式</b><span>换设备、无痕窗口或清除浏览器数据后，这里的留言不会保留。</span></div>
      <div className="two-souls local-persona-selector" aria-label="选择留言署名">
        {members.map((person, index) => <div key={person.user_id} className="local-persona-slot">
          <button className={person.user_id === member.user_id ? "is-active" : ""} type="button" onClick={() => switchMember(person.user_id)} aria-pressed={person.user_id === member.user_id}>
            <span style={{ "--avatar-color": person.avatar_color } as CSSProperties}>{person.avatar_symbol}</span>
            <strong>{person.display_name}</strong>
            <small>{person.user_id === member.user_id ? "当前署名" : "使用这个署名"}</small>
          </button>
          {index === 0 ? <i aria-hidden="true">✦</i> : null}
        </div>)}
      </div>
      <div className="mailbox-stats"><div><strong>{roots.length}</strong><span>封留言</span></div><div><strong>{unreadCount}</strong><span>封未读</span></div><div><strong>{days}</strong><span>天收藏</span></div></div>
      <div className="owl-post-actions"><button className="owl-primary" type="button" onClick={() => { setReplyTo(null); setComposerOpen(true); }}>以 {member.display_name} 留下魔法信笺</button></div>
    </section>
    <section className="post-office-counter">
      <header><div><small>LETTERS KEPT ON THIS DEVICE</small><h2>{mailbox.name}</h2></div><div className="letter-filters"><button className={filter === "all" ? "is-active" : ""} type="button" onClick={() => setFilter("all")}>全部</button><button className={filter === "mine" ? "is-active" : ""} type="button" onClick={() => setFilter("mine")}>我的留言</button></div></header>
      {error ? <p className="owl-error" role="alert">{error}</p> : null}
      <div className="owl-letter-list">{roots.length ? roots.map((letter) => <LetterCard key={letter.id} letter={letter} replies={replies.get(letter.id) ?? []} onReply={(target) => { setReplyTo(target); setComposerOpen(true); }} />) : <div className="empty-owl-post"><span>🦉</span><h3>留言簿还是空的</h3><p>选择一位写信人，留下保存在这台设备上的第一封信。</p><button type="button" onClick={() => setComposerOpen(true)}>写下第一封信</button></div>}</div>
    </section>
    {composerOpen ? <LetterComposer replyTo={replyTo} onCancel={() => setComposerOpen(false)} onSent={() => { setComposerOpen(false); setReplyTo(null); }} /> : null}
  </div>;
}
