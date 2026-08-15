"use client";

import { useArchiveData } from "./ArchiveDataProvider";

function formatTime(value: string | null) {
  if (!value) return "尚未完成";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export default function CloudSyncPanel() {
  const { books, films, cps, user, syncState, syncMessage, lastSyncedAt, refreshCloud, signOutCloud } = useArchiveData();
  const count = books.length + films.length + cps.length;
  const statusClass = syncState === "synced" ? "success" : syncState === "saving" || syncState === "loading" ? "migrating" : syncState === "error" || syncState === "offline" ? "error" : syncState;

  return <section className="cloud-sync-panel">
    <h3>Supabase 云端档案</h3>
    <p className="admin-lead">网站现已从 Supabase 读取并写入。浏览器只保留一份离线缓存；重新登录或换设备后，以私人云端档案为准。</p>
    <div className="cloud-counts" aria-label="当前云端档案数量">
      <div><small>ARCHIVE ENTRIES</small><strong>{count}</strong><span>云端档案</span></div>
      <i aria-hidden="true">✦</i>
      <div><small>LAST SYNCED</small><strong>{syncState === "synced" ? "✓" : "…"}</strong><span>{formatTime(lastSyncedAt)}</span></div>
    </div>
    <div className="cloud-account">
      <div><small>当前云端身份</small><strong>{user.email ?? user.id}</strong></div>
      <button type="button" onClick={() => void signOutCloud()}>退出云端</button>
    </div>
    <div className={`cloud-sync-status cloud-sync-status--${statusClass}`} role="status">{syncMessage}</div>
    <button className="wax-button cloud-migrate" type="button" disabled={syncState === "loading" || syncState === "saving"} onClick={() => void refreshCloud()}>立即从 Supabase 重新读取</button>
    <ul className="cloud-safety-list">
      <li>每次新增、编辑、删除或修改笔记，都会自动写入云端。</li>
      <li>断网时修改先保存在本机，恢复登录后会继续同步。</li>
      <li>数据库通过账户身份和行级权限隔离，其他用户无法读取你的私人档案。</li>
    </ul>
  </section>;
}
