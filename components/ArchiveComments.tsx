"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useArchiveData } from "./ArchiveDataProvider";
import { useArchiveSocial } from "./ArchiveSocialProvider";
import type { ArchiveComment, CommentAnchorOption, CommentReactionType, CommentVisibility } from "@/types/social";

const reactions: Array<{ value: CommentReactionType; symbol: string; label: string }> = [
  { value: "resonance", symbol: "✦", label: "共鸣" },
  { value: "heartbreak", symbol: "♡", label: "心碎" },
  { value: "healed", symbol: "☼", label: "被治愈" },
  { value: "rewatch", symbol: "↻", label: "想重看" },
  { value: "revelation", symbol: "◇", label: "原来如此" },
  { value: "hug", symbol: "☾", label: "抱抱" },
];

const visibilityLabels: Record<CommentVisibility, string> = {
  archive_members: "档案成员可见",
  owner_only: "仅馆主可见",
  participants: "参与对话的人可见",
};

interface ArchiveCommentsProps {
  kind: "book" | "film" | "cp";
  legacyId: string;
  title: string;
  anchors?: CommentAnchorOption[];
  onPromote?: (comment: ArchiveComment) => void;
}

export default function ArchiveComments({ kind, legacyId, title, anchors = [], onPromote }: ArchiveCommentsProps) {
  const { entries, user, canEdit, isOwner } = useArchiveData();
  const { comments, loading, error, createComment, toggleCommentReaction, moderateComment, markContextRead } = useArchiveSocial();
  const entry = entries.find((item) => item.kind === kind && item.legacy_id === legacyId && !item.deleted_at);
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ArchiveComment | null>(null);
  const [content, setContent] = useState("");
  const [anchorKey, setAnchorKey] = useState("entry:");
  const [quotedText, setQuotedText] = useState("");
  const [visibility, setVisibility] = useState<CommentVisibility>("archive_members");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [deferred, setDeferred] = useState<string[]>([]);

  const anchorOptions = useMemo<CommentAnchorOption[]>(() => [
    { type: "entry", ref: "", label: `整份作品 · ${title}` },
    ...anchors,
  ], [anchors, title]);
  const entryComments = useMemo(() => entry ? comments.filter((comment) => comment.entry_id === entry.id) : [], [comments, entry]);
  const roots = useMemo(() => entryComments.filter((comment) => !comment.parent_id), [entryComments]);
  const replies = useMemo(() => {
    const map = new Map<string, ArchiveComment[]>();
    for (const comment of entryComments) {
      if (!comment.parent_id) continue;
      const list = map.get(comment.parent_id) ?? [];
      list.push(comment);
      map.set(comment.parent_id, list);
    }
    return map;
  }, [entryComments]);

  useEffect(() => {
    if (entry) void markContextRead({ entryId: entry.id });
  }, [entry, markContextRead]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem("randi-comment-later-v1") ?? "[]") as unknown;
      if (Array.isArray(parsed)) setDeferred(parsed.filter((id): id is string => typeof id === "string"));
    } catch { /* A malformed local reminder should not block the archive. */ }
  }, []);

  if (!entry) return <section className="archive-comments archive-comments--unavailable"><div className="module-title"><small>VISITOR MARGINALIA</small><h2>访客旁注</h2></div><p>这份档案正在等待云端索引，旁注入口稍后便会出现。</p></section>;

  function startReply(comment: ArchiveComment, quote = false) {
    setReplyTo(comment);
    setContent("");
    setQuotedText(quote ? comment.content.slice(0, 1000) : "");
    setAnchorKey(`${comment.anchor_type}:${comment.anchor_ref ?? ""}`);
    setVisibility(comment.visibility);
    setComposerOpen(true);
  }

  function startComment() {
    setReplyTo(null);
    setContent("");
    setQuotedText("");
    setAnchorKey("entry:");
    setVisibility("archive_members");
    setComposerOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const entryId = entry?.id;
    if (!content.trim() || !entryId) return;
    const selected = anchorOptions.find((item) => `${item.type}:${item.ref}` === anchorKey) ?? anchorOptions[0];
    setBusy(true);
    const saved = await createComment({
      entryId,
      content,
      parentId: replyTo?.id,
      anchorType: selected.type,
      anchorRef: selected.ref || null,
      quotedText: quotedText || selected.excerpt || null,
      visibility,
    });
    setBusy(false);
    if (saved) {
      setComposerOpen(false);
      setReplyTo(null);
      setContent("");
      setNotice("旁注已夹进这份档案");
    }
  }

  function toggleLater(commentId: string) {
    const next = deferred.includes(commentId) ? deferred.filter((id) => id !== commentId) : [...deferred, commentId];
    setDeferred(next);
    window.localStorage.setItem("randi-comment-later-v1", JSON.stringify(next));
  }

  function promote(comment: ArchiveComment) {
    onPromote?.(comment);
    setNotice("旁注已整理为私人笔记");
  }

  function renderComment(comment: ArchiveComment, nested = false) {
    const own = comment.author_id === user.id;
    const isDeferred = deferred.includes(comment.id);
    const anchor = anchorOptions.find((item) => item.type === comment.anchor_type && item.ref === (comment.anchor_ref ?? ""));
    return <article className={`archive-comment${nested ? " archive-comment--reply" : ""}`} id={`comment-${comment.id}`} key={comment.id}>
      <header>
        <span style={{ "--avatar-color": comment.author?.avatarColor ?? "#7d383d" } as CSSProperties}>{comment.author?.avatarSymbol ?? "🪶"}</span>
        <div><strong>{comment.author?.displayName ?? "无名访客"}</strong><small>{anchor?.label ?? "整份作品"} · {visibilityLabels[comment.visibility]}</small></div>
        <time>{new Date(comment.created_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
      </header>
      {comment.quoted_text ? <blockquote>“{comment.quoted_text}”</blockquote> : null}
      <p>{comment.content}</p>
      <footer>
        <div className="comment-reactions">{reactions.map((reaction) => {
          const matching = comment.reactions?.filter((item) => item.reaction === reaction.value) ?? [];
          const active = matching.some((item) => item.user_id === user.id);
          return <button className={active ? "is-active" : ""} type="button" key={reaction.value} onClick={() => void toggleCommentReaction(comment.id, reaction.value)} title={reaction.label}><span>{reaction.symbol}</span><b>{reaction.label}</b>{matching.length ? <i>{matching.length}</i> : null}</button>;
        })}</div>
        <div className="comment-actions">
          <button type="button" onClick={() => startReply(comment)}>回信</button>
          <button type="button" onClick={() => startReply(comment, true)}>引用原文</button>
          <button className={isDeferred ? "is-active" : ""} type="button" onClick={() => toggleLater(comment.id)}>{isDeferred ? "已留待回复" : "稍后回复"}</button>
          {canEdit && onPromote ? <button type="button" onClick={() => promote(comment)}>转为私人笔记</button> : null}
          {(own || isOwner) && comment.status !== "archived" ? <button type="button" onClick={() => void moderateComment(comment.id, "archived")}>封存</button> : null}
          {isOwner ? <button type="button" onClick={() => void moderateComment(comment.id, comment.status === "hidden" ? "visible" : "hidden")}>{comment.status === "hidden" ? "恢复显示" : "暂时隐藏"}</button> : null}
        </div>
      </footer>
      {!nested && replies.get(comment.id)?.length ? <div className="archive-comment-replies">{replies.get(comment.id)?.map((reply) => renderComment(reply, true))}</div> : null}
    </article>;
  }

  return <section className="archive-comments" aria-labelledby={`comments-${kind}-${legacyId}`}>
    <header className="archive-comments__heading"><div><small>VISITOR MARGINALIA · LETTERS BESIDE THE ARCHIVE</small><h2 id={`comments-${kind}-${legacyId}`}>访客旁注</h2><p>回应必须落在具体记忆旁边，才不会被夜色冲散。</p></div><button type="button" onClick={startComment}>✒　写一条旁注</button></header>
    {notice ? <p className="comments-notice" role="status">{notice}</p> : null}
    {error ? <p className="owl-error" role="alert">{error}</p> : null}
    {loading ? <p className="comments-empty">正在翻找夹在档案里的纸页……</p> : null}
    {!loading && !roots.length ? <div className="comments-empty"><span>🪶</span><h3>这里还没有访客旁注</h3><p>写下第一句回应，让这份记忆开始往复。</p></div> : null}
    <div className="archive-comment-list">{roots.map((comment) => renderComment(comment))}</div>
    {composerOpen ? <div className="comment-composer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setComposerOpen(false)}><form className="comment-composer" onSubmit={submit} role="dialog" aria-modal="true" aria-label={replyTo ? "回复旁注" : "写访客旁注"}>
      <button className="comment-composer__close" type="button" onClick={() => setComposerOpen(false)} aria-label="关闭旁注编辑器">×</button>
      <header><small>MARGINALIA · ANCHORED RESPONSE</small><h3>{replyTo ? `回信给 ${replyTo.author?.displayName ?? "访客"}` : "写一条访客旁注"}</h3></header>
      <div className="comment-composer__options"><label>锚定内容<select value={anchorKey} onChange={(event) => setAnchorKey(event.target.value)}>{anchorOptions.map((item) => <option value={`${item.type}:${item.ref}`} key={`${item.type}:${item.ref}`}>{item.label}</option>)}</select></label><label>可见范围<select value={visibility} onChange={(event) => setVisibility(event.target.value as CommentVisibility)}><option value="archive_members">档案成员可见</option><option value="owner_only">仅馆主可见</option><option value="participants">参与对话的人可见</option></select></label></div>
      {quotedText ? <blockquote>“{quotedText}”</blockquote> : null}
      <label className="comment-composer__paper"><span>把未说完的话写在档案页边：</span><textarea autoFocus required maxLength={4000} value={content} onChange={(event) => setContent(event.target.value)} placeholder="写给这一次阅读、观看，或某个仍未熄灭的场面……" /><small>{content.length} / 4000</small></label>
      <footer><span>旁注会保留锚点与可见范围。</span><button className="owl-primary" type="submit" disabled={busy || !content.trim()}>{busy ? "正在夹入档案……" : replyTo ? "寄出回信" : "保存旁注"}</button></footer>
    </form></div> : null}
  </section>;
}
