"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMailbox } from "./MailboxProvider";
import LetterCard from "./LetterCard";
import LetterComposer from "./LetterComposer";
import type { Letter } from "@/types/mailbox";
import { useArchiveSocial } from "./ArchiveSocialProvider";

export default function MailboxDashboard() {
  const { loading, mailbox, member, members, letters, unreadCount, error, markRead, markLettersOpened, switchMember } = useMailbox();
  const { notifications, markNotificationRead } = useArchiveSocial();
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Letter | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "waiting" | "pinned">("all");

  useEffect(() => {
    if (unreadCount > 0) void markRead();
    void markLettersOpened();
  }, [markLettersOpened, markRead, unreadCount]);

  useEffect(() => {
    const ids = notifications.filter((item) => !item.read_at && item.letter_id).map((item) => item.id);
    if (ids.length) void markNotificationRead(ids);
  }, [markNotificationRead, notifications]);

  const roots = useMemo(() => letters.filter((item) => !item.parent_id && (
    filter === "all" || (filter === "mine" ? item.author_id === member?.user_id : filter === "pinned" ? item.is_pinned : item.author_id !== member?.user_id && item.workflow_status !== "replied" && item.workflow_status !== "archived")
  )), [filter, letters, member?.user_id]);
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
      <div className="owl-post-hero__intro">
        <p className="page-eyebrow">NOCTUA POST · LETTERS AFTER MIDNIGHT</p>
        <h1>夜枭来信</h1>
        <p>把未说完的话，投进会记得你的夜色里。</p>
        <div className="local-mailbox-notice" role="note"><b>私人通信空间</b><span>信件可以回应具体档案、层叠回信，并按成员、馆主或对话参与者控制可见范围。</span></div>
      </div>
      <div className="owl-post-console">
        <header><small>CURRENT CORRESPONDENTS</small><span>{members.length} 位通信成员</span></header>
        <div className={`correspondent-grid correspondent-grid--${members.length === 1 ? "single" : members.length === 2 ? "pair" : "scroll"}`} aria-label="云端邮局成员">
          {members.map((person) => <button key={person.user_id} className={`correspondent-card${person.user_id === member.user_id ? " is-active" : ""}`} type="button" onClick={() => switchMember(person.user_id)} aria-pressed={person.user_id === member.user_id} disabled={person.user_id !== member.user_id}>
              {person.user_id === member.user_id ? <i className="correspondent-card__badge">当前身份</i> : null}
              <span className="correspondent-card__avatar" style={{ "--avatar-color": person.avatar_color } as CSSProperties}>{person.avatar_symbol}</span>
              <strong>{person.display_name}</strong>
              <small>{person.role === "owner" ? "档案馆主" : "受邀通信成员"}</small>
            </button>)}
        </div>
        <div className="mailbox-stats"><div><strong>{roots.length}</strong><span>封来信</span></div><div><strong>{unreadCount > 9 ? "9+" : unreadCount}</strong><span>封未读</span></div><div><strong>{days}</strong><span>天往复</span></div></div>
        <div className="owl-post-actions"><button className="owl-primary" type="button" onClick={() => { setReplyTo(null); setComposerOpen(true); }}>以 {member.display_name} 投一封信</button></div>
      </div>
    </section>
    <section className="post-office-counter">
      <header><div><small>LETTERS KEPT IN THE PRIVATE CLOUD</small><h2>{mailbox.name}</h2></div><div className="letter-filters"><button className={filter === "all" ? "is-active" : ""} type="button" onClick={() => setFilter("all")}>全部来信</button><button className={filter === "waiting" ? "is-active" : ""} type="button" onClick={() => setFilter("waiting")}>等待我的回信</button><button className={filter === "pinned" ? "is-active" : ""} type="button" onClick={() => setFilter("pinned")}>只看置顶</button><button className={filter === "mine" ? "is-active" : ""} type="button" onClick={() => setFilter("mine")}>我的寄件</button></div></header>
      {error ? <p className="owl-error" role="alert">{error}</p> : null}
      <div className="owl-letter-list">{roots.length ? roots.map((letter) => <LetterCard key={letter.id} letter={letter} replies={replies.get(letter.id) ?? []} onReply={(target) => { setReplyTo(target); setComposerOpen(true); }} />) : <div className="empty-owl-post"><span>🦉</span><h3>今夜的信匣还很安静</h3><p>把未说完的话，投进会记得你的夜色里。</p><button type="button" onClick={() => setComposerOpen(true)}>写下第一封信</button></div>}</div>
    </section>
    {composerOpen ? <LetterComposer replyTo={replyTo} onCancel={() => setComposerOpen(false)} onSent={() => { setComposerOpen(false); setReplyTo(null); }} /> : null}
  </div>;
}
