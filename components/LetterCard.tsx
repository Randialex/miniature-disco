"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import type { Letter, ReactionType } from "@/types/mailbox";
import { useMailbox } from "./MailboxProvider";

const typeLabels = {
  owner_note: "给馆主的话",
  archive: "关于某份档案",
  recommendation: "推荐一部作品",
  memory: "回忆补充",
  private: "私密来信",
};

const workflowLabels = { pending: "待查阅", opened: "已开启", replied: "已回信", archived: "已封存" };

const reactions: Array<{ value: ReactionType; symbol: string; label: string }> = [
  { value: "star", symbol: "✦", label: "星光" },
  { value: "moon", symbol: "☾", label: "月亮" },
  { value: "feather", symbol: "🪶", label: "羽毛" },
  { value: "book", symbol: "📖", label: "书页" },
  { value: "candle", symbol: "🕯", label: "烛火" },
  { value: "echo", symbol: "💬", label: "回响" },
];

export default function LetterCard({ letter, replies, onReply }: { letter: Letter; replies: Letter[]; onReply: (letter: Letter) => void }) {
  const { member, mailbox, editLetter, deleteLetter, togglePin, toggleReaction, setLetterState } = useMailbox();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(letter.content);
  const [expanded, setExpanded] = useState(false);
  const own = letter.author_id === member?.user_id;
  const owner = member?.role === "owner";
  const canEdit = own && Date.now() - new Date(letter.created_at).getTime() < 30 * 60 * 1000;
  const stamp = reactions.find((item) => item.value === letter.mood_stamp)?.symbol;
  const visibleReplies = expanded ? replies : replies.slice(0, 3);

  async function save() {
    if (await editLetter(letter.id, content)) setEditing(false);
  }

  return (
    <article id={`letter-${letter.id}`} className={`owl-letter owl-letter--${letter.author?.role ?? "guest"}${letter.is_pinned ? " is-pinned" : ""}${letter.workflow_status === "pending" ? " is-pending" : ""}${letter.workflow_status === "archived" ? " is-archived" : ""}`}>
      <header>
        <span className="letter-avatar" style={{ "--avatar-color": letter.author?.avatar_color ?? "#7a1f1f" } as CSSProperties}>{letter.author?.avatar_symbol ?? "🪶"}</span>
        <div><strong>{letter.author?.display_name ?? "未知寄信人"}</strong><small>{letter.author?.role === "owner" ? "拾染randi · 馆主来信" : "远方来信"}</small></div>
        <div className="letter-postmark"><span>{typeLabels[letter.letter_type]}</span><b>{workflowLabels[letter.workflow_status]} · {letter.visibility === "owner_only" ? "仅馆主" : letter.visibility === "participants" ? "对话可见" : "成员可见"}{letter.edited_at ? " · 已修改" : ""}</b><time>{new Date(letter.created_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time></div>
      </header>
      {letter.is_pinned ? <b className="letter-pin">✦ 留言簿置顶</b> : null}
      {stamp ? <span className="letter-mood">{stamp}</span> : null}
      {editing ? (
        <div className="letter-edit">
          <textarea maxLength={2000} value={content} onChange={(event) => setContent(event.target.value)} />
          <button type="button" onClick={save}>保存墨迹</button><button type="button" onClick={() => setEditing(false)}>取消</button>
        </div>
      ) : <p className="letter-content">{letter.content}</p>}
      {letter.attachment ? (
        <Link href={`/${letter.attachment.type}/${letter.attachment.localId}`} className={`letter-attachment letter-attachment--${letter.attachment.type}`}>
          <span>{letter.attachment.type === "book" ? "书" : letter.attachment.type === "film" ? "影" : "绊"}</span>
          <div><small>关联推荐</small><strong>{letter.attachment.title}</strong><p>{letter.attachment.subtitle}</p></div>
        </Link>
      ) : null}
      <footer>
        <div className="reaction-row">
          {mailbox?.reactions_enabled ? reactions.map((item) => {
            const list = letter.reactions?.filter((reaction) => reaction.reaction === item.value) ?? [];
            const active = list.some((reaction) => reaction.user_id === member?.user_id);
            return <button className={active ? "is-active" : ""} type="button" key={item.value} title={item.label} onClick={() => toggleReaction(letter.id, item.value)}><span>{item.symbol}</span>{list.length ? <b>{list.length}</b> : null}</button>;
          }) : null}
        </div>
        <div className="letter-actions">
          <button type="button" onClick={() => onReply(letter)}>回信</button>
          {canEdit ? <button type="button" onClick={() => setEditing(true)}>修改</button> : null}
          {own || owner ? <button type="button" onClick={() => deleteLetter(letter.id)}>{owner && !own ? "删除" : "收回"}</button> : null}
          {owner ? <button type="button" onClick={() => togglePin(letter)}>{letter.is_pinned ? "取消置顶" : "置顶"}</button> : null}
          {owner ? <button type="button" onClick={() => setLetterState(letter, { hidden: letter.status !== "rejected" })}>{letter.status === "rejected" ? "恢复显示" : "暂时隐藏"}</button> : null}
          {(own || owner) && letter.workflow_status !== "archived" ? <button type="button" onClick={() => setLetterState(letter, { workflow: "archived" })}>封存对话</button> : null}
        </div>
      </footer>
      {replies.length ? (
        <div className="letter-replies">
          <h3>猫头鹰带回 {replies.length} 封短笺</h3>
          {visibleReplies.map((reply) => <div className="reply-slip" id={`letter-${reply.id}`} key={reply.id}><span style={{ "--avatar-color": reply.author?.avatar_color ?? "#7a1f1f" } as CSSProperties}>{reply.author?.avatar_symbol}</span><div><header><strong>{reply.author?.display_name}</strong><time>{new Date(reply.created_at).toLocaleString("zh-CN")}</time></header><p>{reply.content}</p></div></div>)}
          {replies.length > 3 ? <button className="reply-expand" type="button" onClick={() => setExpanded((current) => !current)}>{expanded ? "收起较早回信" : `展开其余 ${replies.length - 3} 封回信`}</button> : null}
        </div>
      ) : null}
    </article>
  );
}
