"use client";

import { useState, type CSSProperties } from "react";
import type { Letter, ReactionType } from "@/types/mailbox";
import { useMailbox } from "./MailboxProvider";

const typeLabels = {
  letter: "私人来信",
  recommendation: "书影推荐",
  mood: "心情短笺",
  anniversary: "纪念信",
};

const reactions: Array<{ value: ReactionType; symbol: string; label: string }> = [
  { value: "star", symbol: "✦", label: "星光" },
  { value: "moon", symbol: "☾", label: "月亮" },
  { value: "feather", symbol: "🪶", label: "羽毛" },
  { value: "book", symbol: "📖", label: "书页" },
  { value: "candle", symbol: "🕯", label: "烛火" },
  { value: "echo", symbol: "💬", label: "回响" },
];

export default function LetterCard({ letter, replies, onReply }: { letter: Letter; replies: Letter[]; onReply: (letter: Letter) => void }) {
  const { member, mailbox, editLetter, deleteLetter, moderateLetter, togglePin, toggleReaction } = useMailbox();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(letter.content);
  const own = letter.author_id === member?.user_id;
  const owner = member?.role === "owner";
  const canEdit = own && Date.now() - new Date(letter.created_at).getTime() < 30 * 60 * 1000;
  const stamp = reactions.find((item) => item.value === letter.mood_stamp)?.symbol;

  async function save() {
    if (await editLetter(letter.id, content)) setEditing(false);
  }

  return (
    <article className={`owl-letter owl-letter--${letter.author?.role ?? "guest"}${letter.is_pinned ? " is-pinned" : ""}${letter.status === "pending" ? " is-pending" : ""}`}>
      <header>
        <span className="letter-avatar" style={{ "--avatar-color": letter.author?.avatar_color ?? "#7a1f1f" } as CSSProperties}>{letter.author?.avatar_symbol ?? "🪶"}</span>
        <div><strong>{letter.author?.display_name ?? "未知寄信人"}</strong><small>{letter.author?.role === "owner" ? "拾染randi · 馆主来信" : "远方来信"}</small></div>
        <div className="letter-postmark"><span>{typeLabels[letter.letter_type]}</span><time>{new Date(letter.created_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time></div>
      </header>
      {letter.status === "pending" ? <p className="letter-status">信笺正在等待馆主拆封 · 只有你与馆主可见</p> : null}
      {letter.status === "rejected" ? <p className="letter-status">信笺已被退回 · 只有你与馆主可见</p> : null}
      {letter.is_pinned ? <b className="letter-pin">✦ 馆主置顶</b> : null}
      {stamp ? <span className="letter-mood">{stamp}</span> : null}
      {editing ? (
        <div className="letter-edit">
          <textarea maxLength={2000} value={content} onChange={(event) => setContent(event.target.value)} />
          <button type="button" onClick={save}>保存墨迹</button><button type="button" onClick={() => setEditing(false)}>取消</button>
        </div>
      ) : <p className="letter-content">{letter.content}</p>}
      {letter.attachment ? (
        <div className={`letter-attachment letter-attachment--${letter.attachment.type}`}>
          <span>{letter.attachment.type === "book" ? "书" : letter.attachment.type === "film" ? "影" : "绊"}</span>
          <div><small>关联推荐</small><strong>{letter.attachment.title}</strong><p>{letter.attachment.subtitle}</p></div>
        </div>
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
          {own || owner ? <button type="button" onClick={() => deleteLetter(letter.id)}>收回</button> : null}
          {owner ? <button type="button" onClick={() => togglePin(letter)}>{letter.is_pinned ? "取消置顶" : "置顶"}</button> : null}
          {owner && letter.status === "pending" ? <><button type="button" onClick={() => moderateLetter(letter.id, "visible")}>批准</button><button type="button" onClick={() => moderateLetter(letter.id, "rejected")}>退回</button></> : null}
        </div>
      </footer>
      {replies.length ? (
        <div className="letter-replies">
          <h3>猫头鹰带回 {replies.length} 封短笺</h3>
          {replies.map((reply) => <div className="reply-slip" key={reply.id}><span style={{ "--avatar-color": reply.author?.avatar_color ?? "#7a1f1f" } as CSSProperties}>{reply.author?.avatar_symbol}</span><div><header><strong>{reply.author?.display_name}</strong><time>{new Date(reply.created_at).toLocaleString("zh-CN")}</time></header><p>{reply.content}</p></div></div>)}
        </div>
      ) : null}
    </article>
  );
}
