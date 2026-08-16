"use client";

import { useMemo, useState } from "react";
import type { ArchiveRole, ArchiveVersion } from "./ArchiveDataProvider";
import { useArchiveData } from "./ArchiveDataProvider";

const roleLabels: Record<ArchiveRole, string> = {
  owner: "馆主",
  editor: "受邀编辑者",
  viewer: "只读访客",
};

function formatTime(value: string | null) {
  if (!value) return "尚未完成";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function inviteState(invite: { acceptedAt: string | null; revokedAt: string | null; expiresAt: string }) {
  if (invite.revokedAt) return "已撤销";
  if (invite.acceptedAt) return "已接受";
  if (new Date(invite.expiresAt).getTime() <= Date.now()) return "已过期";
  return "等待开启";
}

function retentionDays(deletedAt: string | null) {
  if (!deletedAt) return 30;
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  return Math.max(0, Math.ceil(30 - elapsed / 86_400_000));
}

export default function CloudSyncPanel() {
  const {
    books, films, cps, user, syncState, syncMessage, lastSyncedAt, pendingCount,
    activeArchive, archives, role, canEdit, isOwner, entries, trash, conflicts,
    members, invitations, backups, refreshCloud, switchArchive, signOutCloud,
    resolveConflict, restoreTrashEntry, getEntryHistory, restoreVersion,
    createInvitation, revokeInvitation, updateMember, restoreBackup,
  } = useArchiveData();
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteHours, setInviteHours] = useState(168);
  const [generatedLink, setGeneratedLink] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [versions, setVersions] = useState<ArchiveVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const count = books.length + films.length + cps.length;
  const historyEntries = useMemo(() => [...entries].sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [entries]);
  const statusClass = syncState === "synced" ? "success" : syncState === "saving" || syncState === "loading" ? "migrating" : syncState === "error" || syncState === "offline" || syncState === "conflict" ? "error" : syncState;

  async function generateInvitation() {
    try {
      setNotice("正在签发加密邀请……");
      const link = await createInvitation(inviteRole, inviteHours);
      setGeneratedLink(link);
      setNotice("邀请已生成；链接只显示这一次，请立即复制。");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "邀请生成失败");
    }
  }

  async function copyInvitation() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setNotice("邀请链接已复制");
  }

  async function showHistory(entryId: string) {
    setSelectedEntryId(entryId);
    if (!entryId) { setVersions([]); return; }
    setHistoryLoading(true);
    try {
      setVersions(await getEntryHistory(entryId));
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "历史版本读取失败");
    } finally {
      setHistoryLoading(false);
    }
  }

  return <section className="cloud-sync-panel">
    <h3>Supabase 云端档案</h3>
    <p className="admin-lead">当前数据由账户身份、档案成员角色与数据库行级权限共同保护；本机只保留离线缓存与待同步队列。</p>

    <div className="archive-space-bar">
      <label>当前档案馆
        <select value={activeArchive.id} onChange={(event) => void switchArchive(event.target.value)}>
          {archives.map((archive) => <option key={archive.id} value={archive.id}>{archive.name} · {roleLabels[archive.role]}</option>)}
        </select>
      </label>
      <span className={`archive-role archive-role--${role}`}>{roleLabels[role]}</span>
    </div>

    <div className="cloud-counts" aria-label="当前云端档案数量">
      <div><small>ACTIVE ARCHIVES</small><strong>{count}</strong><span>在馆档案</span></div>
      <i aria-hidden="true">✦</i>
      <div><small>SYNC QUEUE</small><strong>{pendingCount || (syncState === "synced" ? "✓" : "…")}</strong><span>{pendingCount ? "等待续传" : formatTime(lastSyncedAt)}</span></div>
    </div>
    <div className="cloud-account">
      <div><small>当前云端身份</small><strong>{user.email ?? user.id}</strong></div>
      <button type="button" onClick={() => void signOutCloud()}>退出此设备</button>
    </div>
    <div className={`cloud-sync-status cloud-sync-status--${statusClass}`} role="status">{syncMessage}</div>
    <button className="wax-button cloud-migrate" type="button" disabled={syncState === "loading" || syncState === "saving"} onClick={() => void refreshCloud()}>立即校验云端与本机</button>

    {conflicts.length ? <section className="cloud-section conflict-vault">
      <div className="cloud-section__title"><div><small>CONFLICT VAULT</small><h4>跨设备冲突</h4></div><b>{conflicts.length}</b></div>
      <p>云端版本在本机离线编辑期间发生了变化。两份都已保留，请选择最终版本。</p>
      {conflicts.map((conflict) => <article key={conflict.id}>
        <div><strong>{conflict.kind.toUpperCase()} · {conflict.legacyId}</strong><small>本机：{conflict.deleted ? "移入回收站" : "保留修改"} · 云端 revision {conflict.cloudEntry?.revision ?? "已不存在"}</small></div>
        <div><button type="button" onClick={() => void resolveConflict(conflict.id, "cloud")}>采用云端</button><button type="button" onClick={() => void resolveConflict(conflict.id, "local")}>保留本机</button></div>
      </article>)}
    </section> : null}

    {isOwner ? <section className="cloud-section archive-sharing">
      <div className="cloud-section__title"><div><small>PRIVATE ACCESS</small><h4>成员与邀请</h4></div><span>链接可撤销 · 最长 30 天</span></div>
      <div className="archive-members">
        {members.map((member) => <article key={member.userId} className={!member.isActive ? "is-revoked" : ""}>
          <span>{member.avatarSymbol}</span><div><strong>{member.displayName}</strong><small>{member.userId === user.id ? "当前身份 · " : ""}{roleLabels[member.role]}</small></div>
          {member.role !== "owner" ? <><select aria-label={`设置${member.displayName}的角色`} value={member.role} onChange={(event) => void updateMember(member.userId, event.target.value as "editor" | "viewer", member.isActive)}><option value="editor">可编辑</option><option value="viewer">只读</option></select><button type="button" onClick={() => void updateMember(member.userId, member.role as "editor" | "viewer", !member.isActive)}>{member.isActive ? "撤销" : "恢复"}</button></> : <em>馆主</em>}
        </article>)}
      </div>
      <div className="archive-invite-maker">
        <label>邀请权限<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "editor" | "viewer")}><option value="editor">受邀编辑者</option><option value="viewer">只读访客</option></select></label>
        <label>有效期<select value={inviteHours} onChange={(event) => setInviteHours(Number(event.target.value))}><option value={24}>24 小时</option><option value={168}>7 天</option><option value={720}>30 天</option></select></label>
        <button type="button" onClick={() => void generateInvitation()}>签发邀请</button>
      </div>
      {generatedLink ? <div className="generated-archive-invite"><input readOnly value={generatedLink} aria-label="新生成的邀请链接" /><button type="button" onClick={() => void copyInvitation()}>复制</button></div> : null}
      {invitations.length ? <div className="archive-invite-history">{invitations.map((invite) => <div key={invite.id}><span>{roleLabels[invite.role]}</span><time>{new Date(invite.expiresAt).toLocaleString("zh-CN", { hour12: false })}</time><b>{inviteState(invite)}</b>{inviteState(invite) === "等待开启" ? <button type="button" onClick={() => void revokeInvitation(invite.id)}>撤销</button> : null}</div>)}</div> : null}
    </section> : null}

    <section className="cloud-section archive-history">
      <div className="cloud-section__title"><div><small>VERSION LEDGER</small><h4>修改历史</h4></div><span>每次云端写入自动留档</span></div>
      <label className="history-picker">选择档案查看历史<select value={selectedEntryId} onChange={(event) => void showHistory(event.target.value)}><option value="">请选择</option>{historyEntries.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · r{entry.revision}{entry.deleted_at ? " · 回收站" : ""}</option>)}</select></label>
      {historyLoading ? <p className="cloud-empty">正在翻阅旧稿……</p> : versions.length ? <div className="version-list">{versions.map((version, index) => <article key={version.id}><div><strong>Revision {version.revision}</strong><small>{formatTime(version.changed_at)}{version.deleted_at ? " · 删除版本" : ""}</small></div><button type="button" disabled={!canEdit || index === 0} onClick={() => void restoreVersion(version.id)}>{index === 0 ? "当前版本" : "恢复此版"}</button></article>)}</div> : selectedEntryId ? <p className="cloud-empty">尚无更多历史版本。</p> : null}
    </section>

    <section className="cloud-section archive-trash">
      <div className="cloud-section__title"><div><small>THIRTY-DAY LIMBO</small><h4>回收站</h4></div><span>{trash.length} 项</span></div>
      {trash.length ? <div className="trash-list">{trash.map((entry) => <article key={entry.id}><div><strong>{entry.title}</strong><small>{formatTime(entry.deleted_at)} · 约 {retentionDays(entry.deleted_at)} 天后清理</small></div><div><button type="button" onClick={() => void showHistory(entry.id)}>历史</button><button type="button" disabled={!canEdit} onClick={() => void restoreTrashEntry(entry.id)}>恢复</button></div></article>)}</div> : <p className="cloud-empty">回收站是空的。</p>}
    </section>

    {isOwner ? <section className="cloud-section archive-backups">
      <div className="cloud-section__title"><div><small>DAILY SNAPSHOTS</small><h4>自动备份</h4></div><span>每日一份 · 修改后刷新</span></div>
      {backups.length ? <div className="backup-list">{backups.slice(0, 7).map((backup) => <article key={backup.id}><div><strong>{backup.snapshotDate}</strong><small>{backup.entryCount} 条 · {formatTime(backup.createdAt)}</small></div><button type="button" onClick={() => { if (window.confirm(`确定将档案馆恢复到 ${backup.snapshotDate} 的快照吗？当前状态仍会写入版本历史。`)) void restoreBackup(backup.id); }}>恢复快照</button></article>)}</div> : <p className="cloud-empty">首次成功修改后会自动生成今日备份。</p>}
    </section> : null}

    {notice ? <p className="notes-message" role="status">{notice}</p> : null}
    <ul className="cloud-safety-list">
      <li>离线修改逐条排队；恢复网络后以操作 ID 幂等续传，不会重复写入。</li>
      <li>版本号不一致时不会覆盖，必须在冲突保险柜中明确选择。</li>
      <li>数据库 RLS 区分馆主、编辑者与只读访客；公开密钥无法绕过权限。</li>
    </ul>
  </section>;
}
