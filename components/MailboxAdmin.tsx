"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useMailbox } from "./MailboxProvider";

const symbols = ["🗝", "🪶", "🦉", "🕯", "📖", "☾", "✦", "🌙"];

export default function MailboxAdmin() {
  const { loading, mailbox, members, letters, error, updateMailbox, updateProfile, resetMailbox } = useMailbox();
  const [name, setName] = useState("");
  const [profiles, setProfiles] = useState<Record<string, { display_name: string; avatar_symbol: string; avatar_color: string }>>({});
  const [notice, setNotice] = useState("");
  const [resetPhrase, setResetPhrase] = useState("");

  useEffect(() => {
    if (!mailbox) return;
    setName(mailbox.name);
    setProfiles(Object.fromEntries(members.map((member) => [member.user_id, {
      display_name: member.display_name,
      avatar_symbol: member.avatar_symbol,
      avatar_color: member.avatar_color,
    }])));
  }, [mailbox, members]);

  if (loading || !mailbox) return <section className="mailbox-admin"><h3>猫头鹰留言簿</h3><p className="admin-lead">正在读取当前浏览器的数据……</p></section>;

  async function save() {
    const profileResults = await Promise.all(members.map((member) => {
      const profile = profiles[member.user_id];
      return profile ? updateProfile(member.user_id, profile) : Promise.resolve(false);
    }));
    const mailboxSaved = await updateMailbox({ name, reactions_enabled: mailbox?.reactions_enabled ?? true });
    setNotice(profileResults.every(Boolean) && mailboxSaved ? "本地留言簿设置已保存" : "请检查昵称是否填写完整");
  }

  return <section className="mailbox-admin">
    <h3>猫头鹰留言簿</h3>
    <p className="admin-lead">这里没有账号、邀请码和云端数据库；所有设置与留言只存在于当前浏览器。</p>
    <div className="mailbox-admin-status"><span>●</span><div><b>纯前端本地模式</b><small>{letters.length} 封内容 · localStorage 保存</small></div></div>
    <label className="admin-select-label local-mailbox-name">留言簿名称<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label>
    <div className="mailbox-admin-grid local-profile-grid">
      {members.map((member) => {
        const profile = profiles[member.user_id];
        if (!profile) return null;
        return <article key={member.user_id}>
          <h4>{member.role === "owner" ? "署名一 · 馆主" : "署名二 · 访客"}</h4>
          <div className="local-profile-preview"><span style={{ "--avatar-color": profile.avatar_color } as CSSProperties}>{profile.avatar_symbol}</span><b>{profile.display_name || "未命名"}</b></div>
          <label className="admin-select-label">昵称<input value={profile.display_name} maxLength={16} onChange={(event) => setProfiles((current) => ({ ...current, [member.user_id]: { ...profile, display_name: event.target.value } }))} /></label>
          <fieldset className="local-symbol-picker"><legend>头像符号</legend>{symbols.map((symbol) => <button className={profile.avatar_symbol === symbol ? "is-active" : ""} type="button" key={symbol} onClick={() => setProfiles((current) => ({ ...current, [member.user_id]: { ...profile, avatar_symbol: symbol } }))}>{symbol}</button>)}</fieldset>
          <label className="admin-select-label">印章颜色<input type="color" value={profile.avatar_color} onChange={(event) => setProfiles((current) => ({ ...current, [member.user_id]: { ...profile, avatar_color: event.target.value } }))} /></label>
        </article>;
      })}
    </div>
    <label className="mailbox-setting-toggle"><input type="checkbox" checked={mailbox.reactions_enabled} onChange={(event) => void updateMailbox({ reactions_enabled: event.target.checked })} />允许心情反应</label>
    <button className="wax-button local-mailbox-save" type="button" onClick={() => void save()}>保存本地设置</button>
    {notice ? <p className="notes-message" role="status">{notice}</p> : null}
    <div className="danger-zone local-mailbox-danger"><h4>清空本地留言簿</h4><p>只清除邮局留言和两位写信人的设置，不影响书籍、影视或 CP 数据。</p><input value={resetPhrase} onChange={(event) => setResetPhrase(event.target.value)} placeholder="输入“确认清空”" /><button type="button" disabled={resetPhrase !== "确认清空"} onClick={() => { resetMailbox(); setResetPhrase(""); setNotice("本地留言簿已恢复为空白状态"); }}>确认清空</button></div>
    {error ? <p className="owl-error" role="alert">{error}</p> : null}
  </section>;
}
