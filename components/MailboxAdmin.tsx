"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useMailbox } from "./MailboxProvider";

const symbols = ["🗝", "🪶", "🦉", "🕯", "📖", "☾", "✦", "🌙"];

export default function MailboxAdmin() {
  const { loading, mailbox, member, members, letters, error, updateMailbox, updateProfile, resetMailbox } = useMailbox();
  const [name, setName] = useState("");
  const [profile, setProfile] = useState({ display_name: "", avatar_symbol: "🪶", avatar_color: "#7d383d" });
  const [notice, setNotice] = useState("");
  const [resetPhrase, setResetPhrase] = useState("");
  const owner = member?.role === "owner";

  useEffect(() => {
    if (mailbox) setName(mailbox.name);
    if (member) setProfile({ display_name: member.display_name, avatar_symbol: member.avatar_symbol, avatar_color: member.avatar_color });
  }, [mailbox, member]);

  if (loading || !mailbox || !member) return <section className="mailbox-admin"><h3>夜枭云端邮局</h3><p className="admin-lead">正在从 Supabase 读取邮局设置……</p></section>;

  async function save() {
    const profileSaved = await updateProfile(member!.user_id, profile);
    const mailboxSaved = owner ? await updateMailbox({ name, reactions_enabled: mailbox?.reactions_enabled ?? true }) : true;
    setNotice(profileSaved && mailboxSaved ? "云端邮局设置已保存" : "保存失败，请检查输入或云端连接");
  }

  return <section className="mailbox-admin">
    <h3>夜枭云端邮局</h3>
    <p className="admin-lead">成员身份、信件与反应由 Supabase 保存。每个人只能修改自己的形象；馆主可以管理邮局名称与公共设置。</p>
    <div className="mailbox-admin-status"><span>●</span><div><b>Supabase 私人云端</b><small>{letters.length} 封内容 · {members.length} 位真实成员 · 实时同步</small></div></div>
    {owner ? <label className="admin-select-label local-mailbox-name">邮局名称<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label> : null}
    <div className="mailbox-admin-grid local-profile-grid">
      <article>
        <h4>我的云端身份 · {owner ? "馆主" : "访客"}</h4>
        <div className="local-profile-preview"><span style={{ "--avatar-color": profile.avatar_color } as CSSProperties}>{profile.avatar_symbol}</span><b>{profile.display_name || "未命名"}</b></div>
        <label className="admin-select-label">昵称<input value={profile.display_name} maxLength={16} onChange={(event) => setProfile((current) => ({ ...current, display_name: event.target.value }))} /></label>
        <fieldset className="local-symbol-picker"><legend>头像符号</legend>{symbols.map((symbol) => <button className={profile.avatar_symbol === symbol ? "is-active" : ""} type="button" key={symbol} onClick={() => setProfile((current) => ({ ...current, avatar_symbol: symbol }))}>{symbol}</button>)}</fieldset>
        <label className="admin-select-label">印章颜色<input type="color" value={profile.avatar_color} onChange={(event) => setProfile((current) => ({ ...current, avatar_color: event.target.value }))} /></label>
      </article>
      <article>
        <h4>邮局成员</h4>
        {members.map((person) => <div className="guest-member" key={person.user_id}><span className="letter-avatar" style={{ "--avatar-color": person.avatar_color } as CSSProperties}>{person.avatar_symbol}</span><div><b>{person.display_name}</b><small>{person.role === "owner" ? "馆主" : "受邀成员"}{person.user_id === member.user_id ? " · 当前身份" : ""}</small></div></div>)}
      </article>
    </div>
    {owner ? <label className="mailbox-setting-toggle"><input type="checkbox" checked={mailbox.reactions_enabled} onChange={(event) => void updateMailbox({ reactions_enabled: event.target.checked })} />允许心情反应</label> : null}
    <button className="wax-button local-mailbox-save" type="button" onClick={() => void save()}>保存到 Supabase</button>
    {notice ? <p className="notes-message" role="status">{notice}</p> : null}
    {owner ? <div className="danger-zone local-mailbox-danger"><h4>封存全部云端来信</h4><p>信件会软删除并从邮局隐藏，不影响书籍、影视或 CP 档案。</p><input value={resetPhrase} onChange={(event) => setResetPhrase(event.target.value)} placeholder="输入“确认清空”" /><button type="button" disabled={resetPhrase !== "确认清空"} onClick={() => { resetMailbox(); setResetPhrase(""); setNotice("云端来信已全部封存"); }}>确认封存</button></div> : null}
    {error ? <p className="owl-error" role="alert">{error}</p> : null}
  </section>;
}
