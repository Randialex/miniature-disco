"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useArchiveData } from "./ArchiveDataProvider";
import { useTheme, type ThemeMode } from "./ThemeProvider";
import { parseArchiveBackup } from "@/utils/storage";
import { updateSitePassword, validatePasswordChange } from "@/utils/password";
import { SITE_NAME, SITE_VERSION } from "@/utils/constants";
import MailboxAdmin from "./MailboxAdmin";
import CloudSyncPanel from "./CloudSyncPanel";

type Tab = "theme" | "password" | "data" | "cloud" | "mailbox" | "about";
type ErrorField = "current" | "next" | "confirm" | null;

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "theme", label: "主题设置" }, { id: "password", label: "仪式咒语" },
  { id: "data", label: "数据管理" }, { id: "cloud", label: "云端同步" },
  { id: "mailbox", label: "夜枭来信" },
  { id: "about", label: "关于本站" },
];
const themeOptions: Array<{ id: ThemeMode; label: string; icon: string }> = [
  { id: "dark", label: "星夜哥特", icon: "☾" }, { id: "light", label: "羊皮卷旧书", icon: "✒" }, { id: "system", label: "跟随系统", icon: "↻" },
];

export default function AdminPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { books, films, cps, canEdit, replaceAll, resetAll } = useArchiveData();
  const { mode, setMode, complexMotion, setComplexMotion } = useTheme();
  const [tab, setTab] = useState<Tab>("theme");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<{ field: ErrorField; message: string }>({ field: null, message: "" });
  const [notice, setNotice] = useState("");
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseArchiveBackup>>(null);
  const [resetPhrase, setResetPhrase] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const requestClose = useCallback(() => {
    const hasUnfinishedInput = Boolean(current || next || confirm || pendingImport || resetPhrase);
    if (hasUnfinishedInput && !window.confirm("站长工具中还有未完成的输入，仍要关闭吗？")) return;
    onClose();
  }, [confirm, current, next, onClose, pendingImport, resetPhrase]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarGap > 0) document.body.style.paddingRight = `${scrollbarGap}px`;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && requestClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, requestClose]);

  if (!open) return null;

  function submitPassword(event: FormEvent) {
    event.preventDefault();
    const result = validatePasswordChange(current, next, confirm);
    if (!result.ok) {
      setError({ field: result.field, message: result.message });
      return;
    }
    updateSitePassword(next);
    setCurrent(""); setNext(""); setConfirm(""); setError({ field: null, message: "" });
    setNotice("咒语已更新，请妥善保管");
    window.setTimeout(() => setNotice(""), 3000);
  }

  function exportBackup() {
    const exportedAt = new Date().toISOString();
    const content = JSON.stringify({ format: "shiying-randi-backup", version: 1, exportedAt, data: { books, films, cps } }, null, 2);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    link.download = `shiying-randi-backup-${exportedAt.slice(0, 10).replaceAll("-", "")}.json`;
    link.click(); URL.revokeObjectURL(link.href);
  }

  function readBackup(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseArchiveBackup(String(reader.result));
      if (!parsed) { setNotice("备份文件格式无效"); setPendingImport(null); return; }
      setPendingImport(parsed); setNotice("");
    };
    reader.readAsText(file);
  }

  function importChange(event: ChangeEvent<HTMLInputElement>) { readBackup(event.target.files?.[0]); }
  function importDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); readBackup(event.dataTransfer.files[0]); }
  function confirmImport() {
    if (!pendingImport) return;
    replaceAll(pendingImport.data);
    window.location.reload();
  }
  function confirmReset() {
    if (resetPhrase !== "确认清空") return;
    resetAll(); window.location.reload();
  }

  return <div className="admin-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
    <section className="admin-panel" role="dialog" aria-modal="true" aria-labelledby="admin-panel-title">
      <header><div><small>KEEPER&apos;S ARCANE CONSOLE</small><h2 id="admin-panel-title">站长工具</h2></div><button type="button" onClick={requestClose} aria-label="关闭站长工具">×</button></header>
      <div className="admin-layout">
        <nav aria-label="站长工具分类">{tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
        <div className="admin-content">
          {tab === "theme" ? <section><h3>主题设置</h3><p className="admin-lead">选择档案馆的光线与纸张质感，设置将保存在当前浏览器。</p><div className="theme-options">{themeOptions.map((item) => <label key={item.id} className={mode === item.id ? "is-active" : ""}><input type="radio" name="theme" checked={mode === item.id} onChange={() => setMode(item.id)} /><span>{item.icon}</span><b>{item.label}</b></label>)}</div><label className="motion-switch"><input type="checkbox" checked={complexMotion} onChange={(event) => setComplexMotion(event.target.checked)} /><span><b>启用复杂动效</b><small>粒子、翻页与魔法微光；关闭后仅保留基础淡入淡出</small></span></label></section> : null}
          {tab === "password" ? <section><h3>仪式咒语</h3><p className="admin-lead">咒语只负责入口仪式与本机遮挡；真正的数据权限由 Supabase 登录和 RLS 承担。</p><form className="password-form" onSubmit={submitPassword}>{([ ["current","当前通行咒语",current,setCurrent], ["next","新咒语（6-20位）",next,setNext], ["confirm","确认新咒语",confirm,setConfirm] ] as const).map(([id,label,value,setter]) => <label className={`admin-field${error.field === id || (error.field === "confirm" && id === "next") ? " has-error" : ""}`} key={id}><span>{label}</span><div><input type={visible ? "text" : "password"} value={value} maxLength={20} onChange={(event) => { setter(event.target.value); setError({ field:null,message:"" }); }} /><button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "隐藏咒语" : "显示咒语"}>{visible ? "◉" : "◎"}</button></div></label>)}<p className="admin-error" aria-live="polite">{error.message}</p><button className="wax-button" type="submit">更新咒语</button></form><small className="admin-note">它不是数据密码；换设备仍需完成真实邮箱登录。</small></section> : null}
          {tab === "data" ? <section><h3>数据管理</h3><p className="admin-lead">导出可携带备份，或将 JSON 导入当前云端档案馆。{canEdit ? "" : " 当前身份仅可导出。"}</p><div className="data-actions"><button type="button" onClick={exportBackup}>↓ 导出全量备份</button><div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => canEdit && importDrop(event)}><input ref={fileRef} type="file" accept="application/json,.json" onChange={importChange} disabled={!canEdit} /><button type="button" disabled={!canEdit} onClick={() => fileRef.current?.click()}>选择备份文件导入</button><small>也可将 JSON 文件拖到这里</small></div></div>{pendingImport ? <div className="import-confirm"><p>备份日期：{pendingImport.exportedAt ? new Date(pendingImport.exportedAt).toLocaleString("zh-CN") : "未记录"}</p><p>书籍 {pendingImport.data.books.length} · 影视 {pendingImport.data.films.length} · CP {pendingImport.data.cps.length}</p><button type="button" disabled={!canEdit} onClick={confirmImport}>确认覆盖当前数据</button></div> : null}{canEdit ? <div className="danger-zone"><h4>重置为初始内容</h4><p>当前档案会逐条进入 30 天回收站，再写入初始内容；历史版本仍可恢复。</p><input value={resetPhrase} onChange={(event) => setResetPhrase(event.target.value)} placeholder="输入“确认清空”" /><button type="button" disabled={resetPhrase !== "确认清空"} onClick={confirmReset}>确认重置</button></div> : null}</section> : null}
          {tab === "cloud" ? <CloudSyncPanel /> : null}
          {tab === "mailbox" ? <MailboxAdmin /> : null}
          {tab === "about" ? <section className="about-site"><span className="about-crest">SR</span><h3>{SITE_NAME}</h3><dl><div><dt>版本号</dt><dd>{SITE_VERSION}</dd></div><div><dt>站长</dt><dd>拾染randi</dd></div><div><dt>数据层</dt><dd>Supabase 云端 · 离线优先同步</dd></div></dl><small>包含真实账户权限、冲突保护、30 天回收站、历史版本与每日自动备份。</small></section> : null}
          {notice ? <div className="parchment-toast" role="status">{notice}</div> : null}
        </div>
      </div>
    </section>
  </div>;
}
