"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useArchiveData } from "./ArchiveDataProvider";
import { useMailbox } from "./MailboxProvider";
import type { Letter, LetterAttachment, LetterType, LetterVisibility, ReactionType } from "@/types/mailbox";
import { MAILBOX_DRAFT_KEY } from "@/utils/mailboxStorage";

const types: Array<{ value: LetterType; label: string; hint: string }> = [
  { value: "owner_note", label: "给馆主的话", hint: "一封直接写给馆主的信" },
  { value: "archive", label: "关于某份档案", hint: "回应具体书籍、影视、CP 或相遇记录" },
  { value: "recommendation", label: "推荐一部作品", hint: "把值得收藏的新故事寄来" },
  { value: "memory", label: "回忆补充", hint: "共同补写某段私人记忆" },
  { value: "private", label: "私密来信", hint: "只让馆主与寄信人看见" },
];

const stamps: Array<{ value: ReactionType; symbol: string; label: string }> = [
  { value: "star", symbol: "✦", label: "星光" },
  { value: "moon", symbol: "☾", label: "月夜" },
  { value: "feather", symbol: "🪶", label: "羽痕" },
  { value: "book", symbol: "📖", label: "书页" },
  { value: "candle", symbol: "🕯", label: "烛火" },
  { value: "echo", symbol: "💌", label: "回响" },
];

const visibilityLabels: Record<LetterVisibility, string> = {
  archive_members: "档案成员可见",
  owner_only: "仅馆主可见",
  participants: "参与对话的人可见",
};

export default function LetterComposer({ replyTo, onSent, onCancel }: { replyTo?: Letter | null; onSent: () => void; onCancel: () => void }) {
  const { books, films, cps, user } = useArchiveData();
  const { members, member, sendLetter, updateProfile } = useMailbox();
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const [letterType, setLetterType] = useState<LetterType>("owner_note");
  const [stamp, setStamp] = useState<ReactionType | null>(null);
  const [attachmentKey, setAttachmentKey] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [visibility, setVisibility] = useState<LetterVisibility>("archive_members");
  const [busy, setBusy] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const recipient = members.find((item) => item.user_id !== member?.user_id);

  const attachmentOptions = useMemo(() => [
    ...books.map((item) => ({ key: `book:${item.id}`, search: `${item.title} ${item.author}`, attachment: { type: "book", title: item.title, subtitle: item.author, localId: item.id } as LetterAttachment })),
    ...films.map((item) => ({ key: `film:${item.id}`, search: `${item.title} ${item.originalTitle ?? ""} ${item.year}`, attachment: { type: "film", title: item.title, subtitle: item.originalTitle ?? String(item.year), localId: item.id } as LetterAttachment })),
    ...cps.map((item) => ({ key: `cp:${item.id}`, search: `${item.name} ${item.origin}`, attachment: { type: "cp", title: item.name, subtitle: item.origin, localId: item.id } as LetterAttachment })),
  ], [books, cps, films]);
  const filteredAttachments = useMemo(() => {
    const query = archiveSearch.trim().toLocaleLowerCase("zh-CN");
    if (!query) return attachmentOptions.slice(0, 8);
    return attachmentOptions.filter((item) => item.search.toLocaleLowerCase("zh-CN").includes(query)).slice(0, 12);
  }, [archiveSearch, attachmentOptions]);
  const selectedAttachment = attachmentOptions.find((item) => item.key === attachmentKey);

  useEffect(() => {
    if (replyTo) {
      setVisibility(replyTo.visibility);
      return;
    }
    try {
      const raw = localStorage.getItem(MAILBOX_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Record<string, unknown>;
      setContent(String(draft.content ?? ""));
      setLetterType((draft.letterType as LetterType) ?? "owner_note");
      setStamp((draft.stamp as ReactionType | null) ?? null);
      setAttachmentKey(String(draft.attachmentKey ?? ""));
      setVisibility((draft.visibility as LetterVisibility) ?? "archive_members");
      setDraftSavedAt(typeof draft.savedAt === "string" ? draft.savedAt : null);
    } catch { /* Ignore an old or malformed local draft. */ }
  }, [replyTo]);

  useEffect(() => {
    if (!user.is_anonymous) return;
    const recent = localStorage.getItem("randi-visitor-nickname-v1") ?? "";
    const profileName = member?.display_name !== "无名访客" ? member?.display_name ?? "" : "";
    setNickname((current) => current || recent || profileName);
  }, [member?.display_name, user.is_anonymous]);

  useEffect(() => {
    if (replyTo) return;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      localStorage.setItem(MAILBOX_DRAFT_KEY, JSON.stringify({ content, letterType, stamp, attachmentKey, visibility, savedAt }));
      setDraftSavedAt(savedAt);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [attachmentKey, content, letterType, replyTo, stamp, visibility]);

  useEffect(() => {
    if (letterType === "private") setVisibility("owner_only");
  }, [letterType]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim() || (user.is_anonymous && !nickname.trim())) return;
    setBusy(true);
    if (user.is_anonymous) {
      const profileSaved = await updateProfile(user.id, {
        display_name: nickname.replace(/\s+/g, " ").trim(),
        avatar_symbol: member?.avatar_symbol ?? "🪶",
        avatar_color: member?.avatar_color ?? "#7d383d",
      });
      if (!profileSaved) {
        setBusy(false);
        return;
      }
      localStorage.setItem("randi-visitor-nickname-v1", nickname.trim());
    }
    const ok = await sendLetter({
      content,
      letterType,
      parentId: replyTo?.id ?? null,
      moodStamp: stamp,
      attachment: selectedAttachment?.attachment ?? null,
      visibility: letterType === "private" ? "owner_only" : visibility,
    });
    setBusy(false);
    if (ok) {
      localStorage.removeItem(MAILBOX_DRAFT_KEY);
      onSent();
    }
  }

  return <div className="letter-composer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section className="letter-composer" role="dialog" aria-modal="true" aria-label={replyTo ? "写一封回信" : "写一封信"}>
      <button className="letter-composer__close" type="button" onClick={onCancel} aria-label="关闭写信面板">×</button>
      <header><small>NOCTUA POST · LETTERS AFTER MIDNIGHT</small><h2>{replyTo ? "写一封回信" : "投一封夜枭来信"}</h2><p>魔法署名 · {user.is_anonymous ? nickname || "待填写" : member?.display_name}　收信人 · {recipient?.display_name ?? "档案馆主"}</p></header>
      {replyTo ? <div className="reply-reference">回应 {replyTo.author?.display_name} 于 {new Date(replyTo.created_at).toLocaleDateString("zh-CN")} 写下的信</div> : null}
      <form onSubmit={submit}>
        {user.is_anonymous ? <label className="visitor-signature"><span>魔法署名</span><input autoFocus required maxLength={32} value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="例如：月见、拾梦人、无名旅客" /><small>不需要邮箱；下次来访会优先沿用这枚署名。</small></label> : null}
        {!replyTo ? <fieldset className="letter-type-grid"><legend>先选择这封信的来意</legend>{types.map((item) => <button className={letterType === item.value ? "is-active" : ""} type="button" key={item.value} onClick={() => setLetterType(item.value)}><strong>{item.label}</strong><small>{item.hint}</small></button>)}</fieldset> : null}
        <div className="composer-options">
          <label>可见范围<select disabled={letterType === "private"} value={letterType === "private" ? "owner_only" : visibility} onChange={(event) => setVisibility(event.target.value as LetterVisibility)}>{Object.entries(visibilityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>搜索关联档案<input value={archiveSearch} onChange={(event) => setArchiveSearch(event.target.value)} placeholder="输入书名、片名或 CP" /></label>
        </div>
        {(archiveSearch || letterType === "archive" || letterType === "memory" || letterType === "recommendation") ? <div className="letter-archive-picker" role="listbox" aria-label="关联档案候选">
          <button className={!attachmentKey ? "is-active" : ""} type="button" onClick={() => setAttachmentKey("")}>不关联具体档案</button>
          {filteredAttachments.map((item) => <button className={attachmentKey === item.key ? "is-active" : ""} type="button" key={item.key} onClick={() => { setAttachmentKey(item.key); setArchiveSearch(item.attachment.title); }}><span>{item.attachment.type === "book" ? "书" : item.attachment.type === "film" ? "影" : "绊"}</span><div><strong>{item.attachment.title}</strong><small>{item.attachment.subtitle}</small></div></button>)}
        </div> : null}
        <label className="composer-paper"><span>亲爱的 {recipient?.display_name ?? "馆主"}：</span><textarea autoFocus={!user.is_anonymous} required maxLength={4000} value={content} onChange={(event) => setContent(event.target.value)} placeholder="把未说完的话，投进会记得你的夜色里。" /><small>{content.length} / 4000</small></label>
        <fieldset className="mood-stamps"><legend>选择心情印章</legend>{stamps.map((item) => <button className={stamp === item.value ? "is-active" : ""} title={item.label} type="button" key={item.value} onClick={() => setStamp(stamp === item.value ? null : item.value)}>{item.symbol}</button>)}</fieldset>
        <footer><span>{replyTo ? "回信会叠放在原信下方。" : draftSavedAt ? `草稿已于 ${new Date(draftSavedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 留在本机` : "停止书写 650ms 后自动保存本机草稿。"}</span><button className="owl-primary" disabled={busy || !content.trim() || (user.is_anonymous && !nickname.trim())} type="submit">{busy ? "已进入夜枭投递队列……" : replyTo ? "寄出回信" : "投递这封信"}</button></footer>
      </form>
    </section>
  </div>;
}
